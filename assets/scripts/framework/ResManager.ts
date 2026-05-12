import { _decorator, resources, Asset, SpriteFrame, AudioClip, Prefab } from 'cc';
import { Singleton } from './Singleton';

const { ccclass } = _decorator;

@ccclass('ResManager')
export class ResManager extends Singleton<ResManager> {
    private _cache: Map<string, Asset> = new Map();

    /**
     * 加载单个资源
     * @param path 资源路径
     * @param type 资源类型
     */
    async load<T extends Asset>(path: string, type: new () => T): Promise<T> {
        if (this._cache.has(path)) {
            return this._cache.get(path) as T;
        }

        try {
            const asset = (await resources.load(path, type)) as unknown as T;
            if (asset) {
                this._cache.set(path, asset);
            }
            return asset;
        } catch (error) {
            console.warn(`[ResManager] 资源加载失败: ${path}`, error);
            return null as T;
        }
    }

    /**
     * 加载多个资源
     * @param paths 资源路径数组
     * @param type 资源类型
     */
    async loadAll<T extends Asset>(paths: string[], type: new () => T): Promise<T[]> {
        const promises = paths.map(path => this.load(path, type));
        return Promise.all(promises);
    }

    /**
     * 加载精灵帧
     * @param path 图片路径
     */
    async loadSpriteFrame(path: string): Promise<SpriteFrame> {
        return this.load(path + '/spriteFrame', SpriteFrame);
    }

    /**
     * 加载音效
     * @param path 音效路径
     */
    async loadAudioClip(path: string): Promise<AudioClip> {
        return this.load(path, AudioClip);
    }

    /**
     * 加载预制体
     * @param path 预制体路径
     */
    async loadPrefab(path: string): Promise<Prefab> {
        return this.load(path, Prefab);
    }

    /**
     * 释放单个资源
     * @param path 资源路径
     */
    release(path: string) {
        if (this._cache.has(path)) {
            const asset = this._cache.get(path)!;
            resources.release(path);
            this._cache.delete(path);
        }
    }

    /**
     * 释放所有资源
     */
    releaseAll() {
        this._cache.forEach((asset, path) => {
            resources.release(path);
        });
        this._cache.clear();
    }
}