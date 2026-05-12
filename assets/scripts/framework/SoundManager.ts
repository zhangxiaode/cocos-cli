import { _decorator, AudioSource, AudioClip, game, Game, Node } from 'cc';
import { Singleton } from './Singleton';
import { ResManager } from './ResManager';

const { ccclass } = _decorator;

@ccclass('SoundManager')
export class SoundManager extends Singleton<SoundManager> {
    private _bgmSource: AudioSource = null!;
    private _effectSource: AudioSource = null!;
    private _bgmVolume: number = 0.5;
    private _effectVolume: number = 0.7;
    private _bgmEnabled: boolean = true;
    private _effectEnabled: boolean = true;
    private _currentBgmPath: string = '';

    /**
     * 初始化音效管理器
     * @param root 根节点
     */
    init(root: Node) {
        // 创建背景音乐节点
        const bgmNode = new Node('bgm_source');
        this._bgmSource = bgmNode.addComponent(AudioSource);
        this._bgmSource.loop = true;
        this._bgmSource.volume = this._bgmVolume;
        root.addChild(bgmNode);

        // 创建音效节点
        const effectNode = new Node('effect_source');
        this._effectSource = effectNode.addComponent(AudioSource);
        this._effectSource.loop = false;
        this._effectSource.volume = this._effectVolume;
        root.addChild(effectNode);

        // 游戏进入后台时暂停音乐
        game.on(Game.EVENT_HIDE, () => {
            if (this._bgmEnabled && this._bgmSource.playing) {
                this._bgmSource.pause();
            }
        });

        // 游戏回到前台时恢复音乐
        game.on(Game.EVENT_SHOW, () => {
            if (this._bgmEnabled && !this._bgmSource.playing) {
                this._bgmSource.play();
            }
        });
    }

    /**
     * 播放背景音乐
     * @param path 音乐路径
     */
    async playBGM(path: string) {
        if (!this._bgmEnabled) return;
        if (this._currentBgmPath === path) return;

        this._currentBgmPath = path;
        try {
            const clip = await ResManager.getInstance().loadAudioClip(path);
            if (!clip || !(clip as any)._nativeAsset) {
                console.warn(`[SoundManager] 背景音乐不存在: ${path}`);
                this._currentBgmPath = '';
                return;
            }

            this._bgmSource.stop();
            this._bgmSource.clip = clip;
            this._bgmSource.play();
        } catch (error) {
            console.warn(`[SoundManager] 播放背景音乐失败: ${path}`, error);
            this._currentBgmPath = '';
        }
    }

    /**
     * 停止背景音乐
     */
    stopBGM() {
        this._bgmSource.stop();
        this._currentBgmPath = '';
    }

    /**
     * 播放音效
     * @param path 音效路径
     */
    async playEffect(path: string) {
        if (!this._effectEnabled) return;

        try {
            const clip = await ResManager.getInstance().loadAudioClip(path);
            if (!clip || !(clip as any)._nativeAsset) {
                console.warn(`[SoundManager] 音效不存在: ${path}`);
                return;
            }
            this._effectSource.playOneShot(clip, this._effectVolume);
        } catch (error) {
            console.warn(`[SoundManager] 播放音效失败: ${path}`, error);
        }
    }

    /**
     * 设置背景音乐音量
     * @param volume 音量（0-1）
     */
    setBGMVolume(volume: number) {
        this._bgmVolume = Math.max(0, Math.min(1, volume));
        this._bgmSource.volume = this._bgmVolume;
    }

    /**
     * 设置音效音量
     * @param volume 音量（0-1）
     */
    setEffectVolume(volume: number) {
        this._effectVolume = Math.max(0, Math.min(1, volume));
        this._effectSource.volume = this._effectVolume;
    }

    /**
     * 开启/关闭背景音乐
     * @param enabled 是否开启
     */
    setBGMEnabled(enabled: boolean) {
        this._bgmEnabled = enabled;
        if (enabled) {
            if (this._currentBgmPath) {
                this.playBGM(this._currentBgmPath);
            }
        } else {
            this._bgmSource.stop();
        }
    }

    /**
     * 开启/关闭音效
     * @param enabled 是否开启
     */
    setEffectEnabled(enabled: boolean) {
        this._effectEnabled = enabled;
        if (!enabled) {
            this._effectSource.stop();
        }
    }
}