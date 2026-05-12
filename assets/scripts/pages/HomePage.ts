import { _decorator, Component, Button, Label, Node, UITransform, Color, Sprite, Graphics, Vec3 } from 'cc';
import { UIManager } from '../framework/UIManager';
import { SoundManager } from '../framework/SoundManager';

const { ccclass } = _decorator;

@ccclass('HomePage')
export class HomePage extends Component {
    private _startGameBtn: Button | null = null;
    private _rulesBtn: Button | null = null;

    start() {
        this._createUI();
    }

    /**
     * 动态创建UI元素
     */
    private _createUI() {
        const pageRoot = this.node;
        const pageTransform = pageRoot.getComponent(UITransform);

        const backgroundNode = new Node('Background');
        backgroundNode.parent = pageRoot;
        backgroundNode.setPosition(Vec3.ZERO);
        const backgroundTransform = backgroundNode.addComponent(UITransform);
        if (pageTransform) {
            backgroundTransform.setContentSize(pageTransform.contentSize);
        }

        const backgroundGraphics = backgroundNode.addComponent(Graphics);
        backgroundGraphics.fillColor = new Color(238, 238, 238, 255);
        const backgroundSize = backgroundTransform.contentSize;
        backgroundGraphics.rect(-backgroundSize.width / 2, -backgroundSize.height / 2, backgroundSize.width, backgroundSize.height);
        backgroundGraphics.fill();

        this._startGameBtn = this._createButton(pageRoot, 'StartGameBtn', '开始游戏', new Vec3(0, 50, 0));
        this._rulesBtn = this._createButton(pageRoot, 'RulesBtn', '游戏规则', new Vec3(0, -50, 0));

        if (this._startGameBtn) {
            this._startGameBtn.node.on(Button.EventType.CLICK, this._onStartGame, this);
        }

        if (this._rulesBtn) {
            this._rulesBtn.node.on(Button.EventType.CLICK, this._onShowRules, this);
        }

        console.log('[HomePage] 按钮创建成功');
    }

    private _createButton(parent: Node, nodeName: string, text: string, position: Vec3): Button {
        const buttonNode = new Node(nodeName);
        buttonNode.parent = parent;
        buttonNode.setPosition(position);

        const buttonTransform = buttonNode.addComponent(UITransform);
        buttonTransform.setContentSize(200, 80);

        const graphics = buttonNode.addComponent(Graphics);
        graphics.fillColor = new Color(100, 150, 200, 255);
        graphics.rect(-100, -40, 200, 80);
        graphics.fill();

        graphics.strokeColor = new Color(50, 100, 150, 255);
        graphics.lineWidth = 2;
        graphics.rect(-100, -40, 200, 80);
        graphics.stroke();

        const button = buttonNode.addComponent(Button);
        button.interactable = true;

        const labelNode = new Node('Label');
        labelNode.parent = buttonNode;
        labelNode.addComponent(UITransform);
        const buttonLabel = labelNode.addComponent(Label);
        buttonLabel.string = text;
        buttonLabel.fontSize = 28;
        buttonLabel.color = new Color(255, 255, 255, 255);

        return button;
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
     * 点击游戏规则按钮
     */
    private _onShowRules() {
        SoundManager.getInstance().playEffect('sounds/click');
        UIManager.getInstance().openPage('prefabs/pages/RulesPage');
    }

    /**
     * 页面显示时自动调用
     */
    onShow(params?: any) {
        console.log('首页显示');
        // 播放背景音乐
        SoundManager.getInstance().playBGM('sounds/bgm_home');
    }

    /**
     * 页面隐藏时自动调用
     */
    onHide() {
        console.log('首页隐藏');
    }
}