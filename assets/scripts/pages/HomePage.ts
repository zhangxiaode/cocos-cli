import { _decorator, Component, Button, Label } from 'cc';
import { UIManager } from '../framework/UIManager';
import { PopupManager } from '../framework/PopupManager';
import { SoundManager } from '../framework/SoundManager';
import { DataManager } from '../framework/DataManager';

const { ccclass, property } = _decorator;

@ccclass('HomePage')
export class HomePage extends Component {
    // 在编辑器中拖拽绑定这些组件
    @property(Button)
    startGameBtn: Button = null!;

    @property(Button)
    settingBtn: Button = null!;

    @property(Label)
    welcomeLabel: Label = null!;

    start() {
        // 绑定按钮点击事件
        this.startGameBtn.node.on(Button.EventType.CLICK, this._onStartGame, this);
        this.settingBtn.node.on(Button.EventType.CLICK, this._onSetting, this);

        // 显示欢迎信息
        const playerName = DataManager.getInstance().getLocal('playerName', '玩家');
        if (this.welcomeLabel) {
            this.welcomeLabel.string = `欢迎回来，${playerName}！`;
        }
    }

    /**
     * 点击开始游戏按钮
     */
    private _onStartGame() {
        // 播放点击音效
        SoundManager.getInstance().playEffect('sounds/click');

        // 打开游戏页面，传递参数：关卡1
        UIManager.getInstance().openPage('prefabs/pages/GamePage', { level: 1 });
    }

    /**
     * 点击设置按钮
     */
    private _onSetting() {
        // 播放点击音效
        SoundManager.getInstance().playEffect('sounds/click');

        // 打开设置弹窗，带关闭回调
        PopupManager.getInstance().openPopup(
            'prefabs/popups/SettingPopup',
            null,
            (result) => {
                console.log('设置弹窗关闭，返回结果：', result);
                if (result && result.saved) {
                    console.log('设置已保存');
                }
            }
        );
    }

    /**
     * 页面显示时自动调用（由UIManager触发）
     * @param params 传递给页面的参数
     */
    onShow(params?: any) {
        console.log('首页显示，参数：', params);
        
        // 每次回到首页都播放背景音乐
        SoundManager.getInstance().playBGM('sounds/bgm_home');
    }

    /**
     * 页面隐藏时自动调用（可选）
     */
    onHide() {
        console.log('首页隐藏');
    }
}