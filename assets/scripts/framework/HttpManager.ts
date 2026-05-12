import { _decorator, sys } from 'cc';
import { Singleton } from './Singleton';
import { DataManager } from './DataManager';

const { ccclass } = _decorator;

/**
 * 请求配置接口
 */
interface RequestConfig {
    url: string;
    method: 'GET' | 'POST';
    data?: any;
    headers?: Record<string, string>;
    timeout?: number;
    retry?: number; // 重试次数
    showLoading?: boolean; // 是否显示加载提示
    loadingText?: string; // 加载提示文字
}

/**
 * 响应数据接口（与后端约定统一格式）
 */
interface ApiResponse<T = any> {
    code: number;
    message: string;
    data: T;
}

@ccclass('HttpManager')
export class HttpManager extends Singleton<HttpManager> {
    // 基础API地址（根据你的项目修改）
    private _baseUrl: string = 'https://api.yourdomain.com/v1';
    
    // 默认超时时间（毫秒）
    private _defaultTimeout: number = 10000;
    
    // 默认重试次数
    private _defaultRetry: number = 1;
    
    // 是否显示全局加载提示
    private _showGlobalLoading: boolean = true;
    
    // 当前正在请求的数量
    private _pendingRequests: number = 0;

    /**
     * 初始化HTTP管理器
     * @param baseUrl 基础API地址
     */
    init(baseUrl?: string) {
        if (baseUrl) {
            this._baseUrl = baseUrl;
        }
    }

    /**
     * GET请求
     * @param url 请求地址
     * @param params 请求参数
     * @param config 额外配置
     */
    async get<T = any>(url: string, params?: any, config?: Partial<RequestConfig>): Promise<T> {
        return this.request<T>({
            url,
            method: 'GET',
            data: params,
            ...config
        });
    }

    /**
     * POST请求（JSON格式）
     * @param url 请求地址
     * @param data 请求数据
     * @param config 额外配置
     */
    async post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
        return this.request<T>({
            url,
            method: 'POST',
            data,
            headers: {
                'Content-Type': 'application/json',
                ...config?.headers
            },
            ...config
        });
    }

    /**
     * POST请求（表单格式）
     * @param url 请求地址
     * @param data 请求数据
     * @param config 额外配置
     */
    async postForm<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<T> {
        const formData = new FormData();
        if (data) {
            Object.keys(data).forEach(key => {
                formData.append(key, data[key]);
            });
        }

        return this.request<T>({
            url,
            method: 'POST',
            data: formData,
            ...config
        });
    }

    /**
     * 统一请求方法
     */
    private async request<T = any>(config: RequestConfig): Promise<T> {
        const {
            url,
            method,
            data,
            headers = {},
            timeout = this._defaultTimeout,
            retry = this._defaultRetry,
            showLoading = this._showGlobalLoading,
            loadingText = '加载中...'
        } = config;

        // 拼接完整URL
        const fullUrl = this._buildUrl(url, method, data);

        // 添加通用请求头
        const finalHeaders: Record<string, string> = {
            'Accept': 'application/json',
            ...headers
        };

        // 添加用户token（如果有）
        const token = DataManager.getInstance().getLocal('token');
        if (token) {
            finalHeaders['Authorization'] = `Bearer ${token}`;
        }

        // 显示加载提示
        if (showLoading) {
            this._showLoading(loadingText);
        }

        try {
            // 执行请求（带重试）
            const response = await this._executeRequest<T>(fullUrl, method, data, finalHeaders, timeout, retry);
            
            // 隐藏加载提示
            if (showLoading) {
                this._hideLoading();
            }

            return response;
        } catch (error) {
            // 隐藏加载提示
            if (showLoading) {
                this._hideLoading();
            }

            // 统一错误处理
            this._handleError(error);
            throw error;
        }
    }

    /**
     * 执行请求（带重试逻辑）
     */
    private async _executeRequest<T>(
        url: string,
        method: string,
        data: any,
        headers: Record<string, string>,
        timeout: number,
        retry: number
    ): Promise<T> {
        let lastError: any;

        for (let i = 0; i <= retry; i++) {
            try {
                return await this._fetchWithTimeout<T>(url, method, data, headers, timeout);
            } catch (error) {
                lastError = error;
                console.warn(`请求失败，重试 ${i+1}/${retry+1}`, error);
                
                // 如果是最后一次重试，不再等待
                if (i < retry) {
                    await this._sleep(1000 * (i + 1)); // 指数退避
                }
            }
        }

        throw lastError;
    }

    /**
     * 带超时的fetch请求
     */
    private _fetchWithTimeout<T>(
        url: string,
        method: string,
        data: any,
        headers: Record<string, string>,
        timeout: number
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            // 创建超时控制器
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error('请求超时'));
            }, timeout);

            // 构建请求选项
            const options: RequestInit = {
                method,
                headers,
                signal: controller.signal
            };

            // 添加请求体
            if (method === 'POST' && data) {
                if (data instanceof FormData) {
                    options.body = data;
                } else {
                    options.body = JSON.stringify(data);
                }
            }

            // 执行请求
            fetch(url, options)
                .then(response => {
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
                    }
                    
                    return response.json() as Promise<ApiResponse<T>>;
                })
                .then(apiResponse => {
                    // 根据后端约定的code处理响应
                    if (apiResponse.code === 200) {
                        resolve(apiResponse.data);
                    } else {
                        throw new Error(apiResponse.message || '请求失败');
                    }
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    /**
     * 构建完整URL
     */
    private _buildUrl(url: string, method: string, data: any): string {
        // 如果是完整URL，直接返回
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        // 拼接基础URL
        let fullUrl = this._baseUrl + url;

        // GET请求拼接参数
        if (method === 'GET' && data) {
            const params = new URLSearchParams();
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    params.append(key, data[key].toString());
                }
            });
            
            const queryString = params.toString();
            if (queryString) {
                fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
            }
        }

        return fullUrl;
    }

    /**
     * 显示加载提示
     */
    private _showLoading(text: string) {
        this._pendingRequests++;
        
        // 这里可以调用你的全局加载弹窗
        // 示例：PopupManager.getInstance().openPopup('prefabs/popups/LoadingPopup', { text });
        
        console.log('显示加载:', text);
    }

    /**
     * 隐藏加载提示
     */
    private _hideLoading() {
        this._pendingRequests--;
        
        if (this._pendingRequests <= 0) {
            this._pendingRequests = 0;
            
            // 这里可以关闭你的全局加载弹窗
            // 示例：PopupManager.getInstance().closePopup();
            
            console.log('隐藏加载');
        }
    }

    /**
     * 统一错误处理
     */
    private _handleError(error: any) {
        console.error('HTTP请求错误:', error);
        
        // 可以在这里添加全局错误提示
        // 示例：Toast.show(error.message || '网络请求失败，请稍后重试');
        
        // 处理特定错误码
        if (error.message.includes('401')) {
            // token过期，跳转到登录页
            DataManager.getInstance().removeLocal('token');
            // UIManager.getInstance().backToHome();
        }
    }

    /**
     * 睡眠函数
     */
    private _sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 设置基础API地址
     */
    setBaseUrl(url: string) {
        this._baseUrl = url;
    }

    /**
     * 设置是否显示全局加载提示
     */
    setShowGlobalLoading(show: boolean) {
        this._showGlobalLoading = show;
    }
}