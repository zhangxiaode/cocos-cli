import { _decorator, Component, Button, Label, Node, Graphics, UITransform, Color, Vec3 } from 'cc';
import { UIManager } from '../framework/UIManager';
import { SoundManager } from '../framework/SoundManager';

const { ccclass } = _decorator;

@ccclass('GamePage')
export class GamePage extends Component {
    private _boardSize: number = 4;
    private _cellSize: number = 60;
    private _currentLevel: number = 1;
    private _boardState: number[][] = [];
    private _backBtn: Button | null = null;
    private _boardRoot: Node | null = null;

    start() {
        this._createUI();
        this._drawGameBoard();
        this._initBoardState();
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

        // 创建棋盘根节点
        this._boardRoot = new Node('GameBoard');
        this._boardRoot.parent = pageRoot;
        this._boardRoot.setPosition(0, 20, 0);

        const backBtnNode = new Node('BackBtn');
        backBtnNode.parent = pageRoot;
        backBtnNode.setPosition(0, -150, 0);

        const backBtnTransform = backBtnNode.addComponent(UITransform);
        backBtnTransform.setContentSize(180, 62);

        const backGraphics = backBtnNode.addComponent(Graphics);
        backGraphics.fillColor = new Color(115, 165, 220, 255);
        backGraphics.roundRect(-90, -31, 180, 62, 16);
        backGraphics.fill();

        backGraphics.strokeColor = new Color(70, 120, 180, 255);
        backGraphics.lineWidth = 2;
        backGraphics.roundRect(-90, -31, 180, 62, 16);
        backGraphics.stroke();

        this._backBtn = backBtnNode.addComponent(Button);
        this._backBtn.interactable = true;

        const backLabelNode = new Node('Label');
        backLabelNode.parent = backBtnNode;
        backLabelNode.addComponent(UITransform);
        const backBtnLabel = backLabelNode.addComponent(Label);
        backBtnLabel.string = '返回';
        backBtnLabel.fontSize = 28;
        backBtnLabel.color = new Color(255, 255, 255, 255);

        if (this._backBtn) {
            this._backBtn.node.on(Button.EventType.CLICK, this._onBack, this);
        }
    }

    /**
     * 页面显示时调用（由UIManager触发）
     */
    onShow(params?: any) {
        console.log('游戏页面显示，参数：', params);

        // 获取关卡信息
        if (params && params.level) {
            this._currentLevel = params.level;
        }

        // 播放音效
        SoundManager.getInstance().playEffect('sounds/click');
    }

    /**
     * 绘制游戏棋盘（木色底板 + 网格线 + 交叉点）
     */
    private _drawGameBoard() {
        const pageTransform = this.node.getComponent(UITransform);
        const pageWidth = pageTransform?.contentSize.width ?? 640;
        const boardPixelSize = pageWidth * 0.85;
        const boardSpan = boardPixelSize;
        this._cellSize = boardSpan / (this._boardSize - 1);

        if (!this._boardRoot) {
            this._boardRoot = new Node('GameBoard');
            this._boardRoot.layer = this.node.layer;
            this._boardRoot.parent = this.node;
            this._boardRoot.setPosition(new Vec3(0, 20, 0));
        }

        const boardTransform = this._boardRoot.getComponent(UITransform) ?? this._boardRoot.addComponent(UITransform);
        boardTransform.setContentSize(boardPixelSize, boardPixelSize);

        if (this._backBtn) {
            this._backBtn.node.setPosition(new Vec3(0, -boardPixelSize / 2 - 60, 0));
        }

        const graphics = this._boardRoot.getComponent(Graphics) ?? this._boardRoot.addComponent(Graphics);
        graphics.clear();

        graphics.fillColor = new Color(211, 164, 99, 255);
        graphics.rect(-boardPixelSize / 2, -boardPixelSize / 2, boardPixelSize, boardPixelSize);
        graphics.fill();

        graphics.strokeColor = new Color(124, 88, 46, 255);
        graphics.lineWidth = 2;
        graphics.rect(-boardPixelSize / 2, -boardPixelSize / 2, boardPixelSize, boardPixelSize);
        graphics.stroke();

        graphics.strokeColor = new Color(118, 82, 38, 255);
        graphics.lineWidth = 2.5;
        for (let index = 0; index < this._boardSize; index++) {
            const offset = -boardSpan / 2 + index * this._cellSize;
            graphics.moveTo(offset, boardSpan / 2);
            graphics.lineTo(offset, -boardSpan / 2);
            graphics.moveTo(-boardSpan / 2, offset);
            graphics.lineTo(boardSpan / 2, offset);
        }
        graphics.stroke();

        graphics.fillColor = new Color(0, 0, 0, 255);
        for (let row = 0; row < this._boardSize; row++) {
            for (let col = 0; col < this._boardSize; col++) {
                const x = -boardSpan / 2 + col * this._cellSize;
                const y = boardSpan / 2 - row * this._cellSize;
                graphics.circle(x, y, 8.5);
                graphics.fill();
            }
        }

        const pieceRadius = this._cellSize * 0.18;
        for (let row = 0; row < this._boardSize; row++) {
            for (let col = 0; col < this._boardSize; col++) {
                const x = -boardSpan / 2 + col * this._cellSize;
                const y = boardSpan / 2 - row * this._cellSize;
                const isWhiteRow = row % 2 === 0;

                graphics.fillColor = isWhiteRow
                    ? new Color(245, 245, 245, 255)
                    : new Color(35, 35, 35, 255);
                graphics.circle(x, y, pieceRadius);
                graphics.fill();

                if (isWhiteRow) {
                    graphics.strokeColor = new Color(150, 150, 150, 255);
                    graphics.lineWidth = 1.5;
                    graphics.circle(x, y, pieceRadius);
                    graphics.stroke();
                }
            }
        }
    }

    /**
     * 初始化棋盘状态
     */
    private _initBoardState() {
        this._boardState = [];
        for (let i = 0; i < this._boardSize; i++) {
            this._boardState[i] = [];
            for (let j = 0; j < this._boardSize; j++) {
                this._boardState[i][j] = i % 2 === 0 ? 1 : 2;
            }
        }
    }

    /**
     * 处理棋盘点击（可扩展）
     */
    private _onBoardClick(row: number, col: number) {
        console.log(`棋盘点击: 行=${row}, 列=${col}`);
        if (this._boardState[row][col] === 0) {
            this._boardState[row][col] = 1; // 放置玩家棋子
            console.log('放置棋子成功');
            // 这里可以添加更多游戏逻辑
        }
    }

    /**
     * 返回首页
     */
    private _onBack() {
        // 播放点击音效
        SoundManager.getInstance().playEffect('sounds/click');

        // 返回上一页
        UIManager.getInstance().backPage();
    }

    /**
     * 页面隐藏时调用（可选）
     */
    onHide() {
        console.log('游戏页面隐藏');
    }
}
