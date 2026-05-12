import { _decorator, sys } from 'cc';
import { Singleton } from './Singleton';

const { ccclass } = _decorator;

@ccclass('DataManager')
export class DataManager extends Singleton<DataManager> {
    private _localData: any = {};
    private _globalData: any = {};

    /**
     * 初始化数据管理器
     */
    init() {
        // 加载本地存储数据
        const savedData = sys.localStorage.getItem('game_data');
        if (savedData) {
            try {
                this._localData = JSON.parse(savedData);
            } catch (e) {
                console.error('解析本地数据失败', e);
                this._localData = {};
            }
        }
    }

    /**
     * 获取本地数据
     * @param key 键名
     * @param defaultValue 默认值
     */
    getLocal<T>(key: string, defaultValue?: T): T {
        return this._localData[key] !== undefined ? this._localData[key] : defaultValue as T;
    }

    /**
     * 设置本地数据
     * @param key 键名
     * @param value 值
     */
    setLocal(key: string, value: any) {
        this._localData[key] = value;
        this._saveLocalData();
    }

    /**
     * 删除本地数据
     * @param key 键名
     */
    removeLocal(key: string) {
        delete this._localData[key];
        this._saveLocalData();
    }

    /**
     * 清空所有本地数据
     */
    clearLocal() {
        this._localData = {};
        sys.localStorage.removeItem('game_data');
    }

    /**
     * 获取全局临时数据
     * @param key 键名
     * @param defaultValue 默认值
     */
    getGlobal<T>(key: string, defaultValue?: T): T {
        return this._globalData[key] !== undefined ? this._globalData[key] : defaultValue as T;
    }

    /**
     * 设置全局临时数据
     * @param key 键名
     * @param value 值
     */
    setGlobal(key: string, value: any) {
        this._globalData[key] = value;
    }

    /**
     * 删除全局临时数据
     * @param key 键名
     */
    removeGlobal(key: string) {
        delete this._globalData[key];
    }

    private _saveLocalData() {
        sys.localStorage.setItem('game_data', JSON.stringify(this._localData));
    }
}