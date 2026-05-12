import { _decorator, Component, Node, game, UITransform, js } from 'cc';
import { UIManager } from './framework/UIManager';
import { PopupManager } from './framework/PopupManager';
import { SoundManager } from './framework/SoundManager';
import { DataManager } from './framework/DataManager';
import { HttpManager } from './framework/HttpManager';
import { getCurrentPlatform, getPlatformGameInfo } from './utils/Constants';
import { HomePage } from './pages/HomePage';
import { UserSystem } from './system/UserSystem';

const { ccclass, property } = _decorator;

@ccclass('GameMain')
export class GameMain extends Component {
    public static ui: UIManager;
    public static popup: PopupManager;
    public static sound: SoundManager;
    public static data: DataManager;
    public static http: HttpManager;

    private _uiRoot: Node = null!;
    private _popupRoot: Node = null!;

    onLoad() {
        const platform = getCurrentPlatform();
        const gameInfo = getPlatformGameInfo(platform);

        game.frameRate = 60;

        // 动态创建 UIRoot
        this._uiRoot = new Node('UIRoot');
        this._uiRoot.parent = this.node;
        const uiTransform = this._uiRoot.addComponent(UITransform);
        const canvasTransform = this.node.getComponent(UITransform);
        if (canvasTransform) {
            uiTransform.setContentSize(canvasTransform.contentSize);
        }

        // 动态创建 PopupRoot
        this._popupRoot = new Node('PopupRoot');
        this._popupRoot.parent = this.node;
        const popupTransform = this._popupRoot.addComponent(UITransform);
        if (canvasTransform) {
            popupTransform.setContentSize(canvasTransform.contentSize);
        }

        // 初始化所有管理器
        DataManager.getInstance().init();
        UIManager.getInstance().init(this._uiRoot);
        PopupManager.getInstance().init(this._popupRoot);
        SoundManager.getInstance().init(this.node);
        HttpManager.getInstance().init(gameInfo.apiBaseUrl);

        // 初始化用户系统 - 游戏启动时创建或读取用户数据
        UserSystem.getInstance().initialize();

        GameMain.ui = UIManager.getInstance();
        GameMain.popup = PopupManager.getInstance();
        GameMain.sound = SoundManager.getInstance();
        GameMain.data = DataManager.getInstance();
        GameMain.http = HttpManager.getInstance();

        console.log(`[GameMain] platform=${platform}, app=${gameInfo.appName}`);
    }

    start() {
        // 动态创建首页
        const homePageNode = new Node('HomePage');
        homePageNode.parent = this._uiRoot;

        const homeTransform = homePageNode.addComponent(UITransform);
        const uiTransform = this._uiRoot.getComponent(UITransform);
        if (uiTransform) {
            homeTransform.setContentSize(uiTransform.contentSize);
        }

        const homePage = homePageNode.addComponent(HomePage);
        UIManager.getInstance().registerInitialPage(homePageNode, 'HomePage');
        homePage.onShow();
    }
}

// 兼容场景中使用类名或脚本 UUID 的反序列化查找。
js.setClassAlias(GameMain, 'GameMain');
js.setClassAlias(GameMain, '39bb67ff-34a0-41a7-af7c-00c4b48a1fa5');