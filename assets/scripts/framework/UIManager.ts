import { _decorator, Node, Prefab, resources, instantiate, tween, UITransform, UIOpacity } from 'cc';
import { Singleton } from './Singleton';

const { ccclass } = _decorator;

// 延迟加载页面脚本，避免 UIManager 与页面脚本之间的循环依赖
const PAGE_MODULE_MAP: Record<string, () => Promise<any>> = {
    HomePage: async () => (await import('../pages/HomePage')).HomePage,
    GamePage: async () => (await import('../pages/GamePage')).GamePage,
    RulesPage: async () => (await import('../pages/RulesPage')).RulesPage,
};

@ccclass('UIManager')
export class UIManager extends Singleton<UIManager> {
    private _root: Node = null!;
    private _pageStack: { node: Node; path: string }[] = [];

    /**
     * 初始化UI管理器
     * @param root UI根节点
     */
    init(root: Node) {
        this._root = root;
    }

    /**
     * 注册初始页面（首页）
     * @param pageNode 已经创建的页面节点
     * @param pagePath 页面路径（用于资源管理）
     */
    registerInitialPage(pageNode: Node, pagePath: string) {
        this._pageStack.push({ node: pageNode, path: pagePath });
    }

    /**
     * 打开新页面（支持预制体加载和动态创建）
     * @param prefabPath 预制体路径（resources/prefabs/pages/xxx）或页面名称
     * @param params 传递给页面的参数
     * @param animation 是否显示切换动画
     */
    async openPage(prefabPath: string, params?: any, animation: boolean = true) {
        // 隐藏上一个页面
        if (this._pageStack.length > 0) {
            const lastPage = this._pageStack[this._pageStack.length - 1].node;
            lastPage.active = false;
        }

        // 提取页面名称
        const pageName = this._extractPageName(prefabPath);
        const loader = PAGE_MODULE_MAP[pageName];

        let pageNode: Node;
        let pageScript: any = null;

        // 当前页面只有脚本实现，没有对应 prefab，直接走动态创建。
        if (loader) {
            pageNode = new Node(pageName);
            const ScriptClass = await loader();
            pageScript = pageNode.addComponent(ScriptClass);
        } else {
            try {
                // 尝试从预制体加载
                const prefab = (await resources.load(prefabPath, Prefab)) as unknown as Prefab;
                if (!prefab) {
                    throw new Error(`预制体不存在：${prefabPath}`);
                }
                pageNode = instantiate(prefab) as Node;

                // 从预制体的脚本中获取 onShow 方法
                if (prefab.data && prefab.data.name && pageNode.getComponent(prefab.data.name)) {
                    pageScript = pageNode.getComponent(prefab.data.name);
                }
            } catch (error) {
                console.warn(`预制体加载失败 ${prefabPath}`, error);
                return;
            }
        }

        pageNode.parent = this._root;
        const rootTransform = this._root.getComponent(UITransform);
        const pageTransform = pageNode.getComponent(UITransform) ?? pageNode.addComponent(UITransform);
        if (rootTransform) {
            pageTransform.setContentSize(rootTransform.contentSize);
        }

        const pageOpacity = pageNode.addComponent(UIOpacity);

        // 传递参数给页面脚本的 onShow 方法
        if (pageScript && pageScript.onShow) {
            pageScript.onShow(params);
        }

        // 添加到页面栈
        this._pageStack.push({ node: pageNode, path: prefabPath });

        // 淡入动画
        if (animation) {
            pageOpacity.opacity = 0;
            tween(pageOpacity).to(0.3, { opacity: 255 }).start();
        }
    }

    /**
     * 从路径中提取页面名称
     * 例如：'prefabs/pages/GamePage' -> 'GamePage'
     */
    private _extractPageName(path: string): string {
        const parts = path.split('/');
        return parts[parts.length - 1];
    }

    /**
     * 返回上一页
     * @param animation 是否显示切换动画
     */
    backPage(animation: boolean = true) {
        if (this._pageStack.length <= 1) return;

        // 移除当前页面
        const current = this._pageStack.pop()!;
        const currentNode = current.node;

        // 淡出动画
        if (animation) {
            const currentOpacity = currentNode.getComponent(UIOpacity);
            tween(currentNode)
                .call(() => {
                    currentNode.destroy();
                    resources.release(current.path);
                })
                .start();

            if (currentOpacity) {
                tween(currentOpacity)
                    .to(0.3, { opacity: 0 })
                    .call(() => {
                        currentNode.destroy();
                        resources.release(current.path);
                    })
                    .start();
            }
        } else {
            currentNode.destroy();
            resources.release(current.path);
        }

        // 显示上一页
        const lastPage = this._pageStack[this._pageStack.length - 1].node;
        lastPage.active = true;

        if (animation) {
            const lastPageOpacity = lastPage.getComponent(UIOpacity) ?? lastPage.addComponent(UIOpacity);
            lastPageOpacity.opacity = 0;
            tween(lastPageOpacity).to(0.3, { opacity: 255 }).start();
        }
    }

    /**
     * 回到首页
     */
    backToHome() {
        while (this._pageStack.length > 1) {
            const current = this._pageStack.pop()!;
            current.node.destroy();
            resources.release(current.path);
        }

        const homePage = this._pageStack[0].node;
        homePage.active = true;
        const homePageOpacity = homePage.getComponent(UIOpacity) ?? homePage.addComponent(UIOpacity);
        homePageOpacity.opacity = 255;
    }

    /**
     * 获取当前页面
     */
    getCurrentPage(): Node | null {
        if (this._pageStack.length === 0) return null;
        return this._pageStack[this._pageStack.length - 1].node;
    }
}