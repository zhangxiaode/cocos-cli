import { _decorator, Component, Button, Toggle } from 'cc';
import { PopupManager } from '../framework/PopupManager';
import { SoundManager } from '../framework/SoundManager';
import { DataManager } from '../framework/DataManager';

const { ccclass, property } = _decorator;

@ccclass('SettingPopup')
export class SettingPopup extends Component {
    // 在编辑器中拖拽绑定这些组件
    @property(Toggle)
    bgmToggle: Toggle = null!;

    @property(Toggle)
    effectToggle: Toggle = null!;

    @property(Button)
    closeBtn: Button = null!;

    start() {
        // 从本地存储读取设置，初始化开关状态
        this.bgmToggle.isChecked = DataManager.getInstance().getLocal('bgm_enabled', true);
        this.effectToggle.isChecked = DataManager.getInstance().getLocal('effect_enabled', true);

        // 绑定事件
        this.bgmToggle.node.on(Toggle.EventType.TOGGLE, this._onBgmToggle, this);
        this.effectToggle.node.on(Toggle.EventType.TOGGLE, this._onEffectToggle, this);
        this.closeBtn.node.on(Button.EventType.CLICK, this._onClose, this);
    }

    /**
     * 背景音乐开关切换
     */
    private _onBgmToggle(toggle: Toggle) {
        // 更新音效管理器状态
        SoundManager.getInstance().setBGMEnabled(toggle.isChecked);
        
        // 保存到本地存储
        DataManager.getInstance().setLocal('bgm_enabled', toggle.isChecked);
        
        // 播放点击音效
        SoundManager.getInstance().playEffect('sounds/click');
    }

    /**
     * 音效开关切换
     */
    private _onEffectToggle(toggle: Toggle) {
        // 更新音效管理器状态
        SoundManager.getInstance().setEffectEnabled(toggle.isChecked);
        
        // 保存到本地存储
        DataManager.getInstance().setLocal('effect_enabled', toggle.isChecked);
        
        // 播放点击音效（如果音效开启的话）
        if (toggle.isChecked) {
            SoundManager.getInstance().playEffect('sounds/click');
        }
    }

    /**
     * 点击关闭按钮
     */
    private _onClose() {
        // 播放点击音效
        SoundManager.getInstance().playEffect('sounds/click');
        
        // 关闭弹窗，返回结果
        PopupManager.getInstance().closePopup({
            saved: true,
            bgmEnabled: this.bgmToggle.isChecked,
            effectEnabled: this.effectToggle.isChecked
        });
    }

    /**
     * 弹窗显示时自动调用（由PopupManager触发）
     * @param params 传递给弹窗的参数
     */
    onShow(params?: any) {
        console.log('设置弹窗显示，参数：', params);
    }
}