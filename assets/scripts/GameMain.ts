import { _decorator, Component, Node, game } from 'cc';
import { UIManager } from './framework/UIManager';
import { PopupManager } from './framework/PopupManager';
import { SoundManager } from './framework/SoundManager';
import { DataManager } from './framework/DataManager';
import { HttpManager } from './framework/HttpManager';
import { getCurrentPlatform, getPlatformGameInfo } from './utils/Constants';

const { ccclass, property } = _decorator;

@ccclass('GameMain')
export class GameMain extends Component {
    // 在编辑器中拖拽绑定这两个节点
    @property(Node)
    uiRoot: Node = null!;

    @property(Node)
    popupRoot: Node = null!;

    // 全局单例访问入口（可选，方便调试）
    public static ui: UIManager;
    public static popup: PopupManager;
    public static sound: SoundManager;
    public static data: DataManager;
    public static http: HttpManager;

    onLoad() {
        const platform = getCurrentPlatform();
        const gameInfo = getPlatformGameInfo(platform);

        // 设置游戏帧率为60fps
        game.frameRate = 60;

        // 初始化所有管理器（顺序不能乱）
        DataManager.getInstance().init();
        UIManager.getInstance().init(this.uiRoot);
        PopupManager.getInstance().init(this.popupRoot);
        SoundManager.getInstance().init(this.node);
        HttpManager.getInstance().init(gameInfo.apiBaseUrl);

        // 保存全局引用
        GameMain.ui = UIManager.getInstance();
        GameMain.popup = PopupManager.getInstance();
        GameMain.sound = SoundManager.getInstance();
        GameMain.data = DataManager.getInstance();
        GameMain.http = HttpManager.getInstance();

        console.log(`[GameMain] platform=${platform}, app=${gameInfo.appName}, version=${gameInfo.version}`);

        // 全局错误捕获（生产环境必备）
        this._setupGlobalErrorHandler();
    }

    start() {
        // 打开首页（必须确保HomePage.prefab已经创建好）
        UIManager.getInstance().openPage('prefabs/pages/HomePage');

        // 播放首页背景音乐（可选，建议放在HomePage的onShow方法中）
        // SoundManager.getInstance().playBGM('sounds/bgm_home');
    }

    /**
     * 全局错误捕获
     */
    private _setupGlobalErrorHandler() {
        // 捕获未处理的Promise错误
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise错误:', event.reason);
            event.preventDefault();
        });

        // 捕获全局JavaScript错误
        window.addEventListener('error', (event) => {
            console.error('全局JavaScript错误:', event.error);
            event.preventDefault();
        });
    }
}