import { _decorator, Component, Button, Label, Node, Graphics, UITransform, Color, Vec3, Sprite, SpriteFrame, resources } from 'cc';
import { UIManager } from '../framework/UIManager';
import { SoundManager } from '../framework/SoundManager';
import { GameRuleSystem, Position } from '../game/GameRuleSystem';
import { UserSystem } from '../system/UserSystem';
import { RankSystem, RankTier, RankPhase } from '../game/RankSystem';

const { ccclass } = _decorator;

interface OpponentInfo {
    username: string;
    tier: RankTier;
    phase: RankPhase;
    stars: number;
}

@ccclass('GamePage')
export class GamePage extends Component {
    private _boardSize: number = 4;
    private _cellSize: number = 60;
    private _currentLevel: number = 1;
    private _boardState: number[][] = [];
    private _backBtn: Button | null = null;
    private _boardRoot: Node | null = null;
    private _ruleSystem: GameRuleSystem = GameRuleSystem.getInstance();
    private _userInfoRoot: Node | null = null;
    private _usernameLabel: Label | null = null;
    private _rankLabel: Label | null = null;
    private _starsLabel: Label | null = null;
    private _avatarSprite: Sprite | null = null;
    private _opponentInfoRoot: Node | null = null;
    private _opponentUsernameLabel: Label | null = null;
    private _opponentRankLabel: Label | null = null;
    private _opponentStarsLabel: Label | null = null;
    private _opponentAvatarSprite: Sprite | null = null;
    private _opponentInfo: OpponentInfo | null = null;

    start() {
        this._createUI();
        this._drawGameBoard();
        this._initBoardState();
        this._updateUserInfoDisplay();
        this._updateOpponentInfoDisplay();
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

        this._createUserInfoPanel(pageRoot);
        this._createOpponentInfoPanel(pageRoot);

        const backBtnNode = new Node('BackBtn');
        backBtnNode.parent = pageRoot;
        const pageSize = pageTransform?.contentSize;
        const pageWidth = pageSize?.width ?? 640;
        const pageHeight = pageSize?.height ?? 960;
        const backBtnHalfWidth = 90;
        const backBtnHalfHeight = 31;
        const safeMargin = 20;
        backBtnNode.setPosition(
            -pageWidth / 2 + backBtnHalfWidth + safeMargin,
            pageHeight / 2 - backBtnHalfHeight - safeMargin,
            0,
        );

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
     * 创建棋盘下方用户信息区域
     */
    private _createUserInfoPanel(parent: Node) {
        const userSystem = UserSystem.getInstance();
        const rankSystem = RankSystem.getInstance();

        this._userInfoRoot = new Node('GameUserInfoPanel');
        this._userInfoRoot.parent = parent;
        this._userInfoRoot.setPosition(new Vec3(0, -300, 0));

        const panelWidth = 560;
        const panelHeight = 120;
        const panelHalfWidth = panelWidth / 2;
        const panelHalfHeight = panelHeight / 2;

        const panelTransform = this._userInfoRoot.addComponent(UITransform);
        panelTransform.setContentSize(panelWidth, panelHeight);

        const panelGraphics = this._userInfoRoot.addComponent(Graphics);
        panelGraphics.fillColor = new Color(70, 120, 180, 190);
        panelGraphics.roundRect(-panelHalfWidth, -panelHalfHeight, panelWidth, panelHeight, 14);
        panelGraphics.fill();

        panelGraphics.strokeColor = new Color(40, 80, 140, 255);
        panelGraphics.lineWidth = 2;
        panelGraphics.roundRect(-panelHalfWidth, -panelHalfHeight, panelWidth, panelHeight, 14);
        panelGraphics.stroke();

        const avatarNode = new Node('Avatar');
        avatarNode.parent = this._userInfoRoot;
        avatarNode.setPosition(new Vec3(-225, 0, 0));
        const avatarTransform = avatarNode.addComponent(UITransform);
        const avatarSize = panelHeight * 0.5;
        avatarTransform.setContentSize(avatarSize, avatarSize);
        this._avatarSprite = avatarNode.addComponent(Sprite);
        this._avatarSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this._loadDefaultAvatar(this._avatarSprite);

        const usernameNode = new Node('UsernameLabel');
        usernameNode.parent = this._userInfoRoot;
        usernameNode.setPosition(new Vec3(-35, 20, 0));
        const usernameTransform = usernameNode.addComponent(UITransform);
        usernameTransform.setContentSize(240, 36);
        this._usernameLabel = usernameNode.addComponent(Label);
        this._usernameLabel.string = userSystem.getUsername();
        this._usernameLabel.fontSize = 24;
        this._usernameLabel.color = new Color(255, 255, 255, 255);
        this._usernameLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        this._usernameLabel.overflow = Label.Overflow.CLAMP;

        const rankNode = new Node('RankLabel');
        rankNode.parent = this._userInfoRoot;
        rankNode.setPosition(new Vec3(-5, -20, 0));
        const rankTransform = rankNode.addComponent(UITransform);
        rankTransform.setContentSize(300, 36);
        this._rankLabel = rankNode.addComponent(Label);
        this._rankLabel.string = rankSystem.getCurrentRankDisplayName();
        this._rankLabel.fontSize = 24;
        this._rankLabel.color = new Color(255, 228, 181, 255);
        this._rankLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        this._rankLabel.overflow = Label.Overflow.CLAMP;

        const starsNode = new Node('StarsLabel');
        starsNode.parent = this._userInfoRoot;
        const starsRightPadding = 24;
        starsNode.setPosition(new Vec3(panelHalfWidth - starsRightPadding - 60, 0, 0));
        const starsTransform = starsNode.addComponent(UITransform);
        starsTransform.setContentSize(120, 40);
        this._starsLabel = starsNode.addComponent(Label);
        this._starsLabel.string = `⭐ ${userSystem.getStars()}`;
        this._starsLabel.fontSize = 28;
        this._starsLabel.color = new Color(255, 255, 100, 255);
        this._starsLabel.horizontalAlign = Label.HorizontalAlign.RIGHT;
        this._starsLabel.overflow = Label.Overflow.CLAMP;
    }

    /**
     * 创建棋盘上方对手信息区域
     */
    private _createOpponentInfoPanel(parent: Node) {
        this._opponentInfoRoot = new Node('OpponentInfoPanel');
        this._opponentInfoRoot.parent = parent;
        this._opponentInfoRoot.setPosition(new Vec3(0, 300, 0));

        const panelWidth = 560;
        const panelHeight = 120;
        const panelHalfWidth = panelWidth / 2;
        const panelHalfHeight = panelHeight / 2;

        const panelTransform = this._opponentInfoRoot.addComponent(UITransform);
        panelTransform.setContentSize(panelWidth, panelHeight);

        const panelGraphics = this._opponentInfoRoot.addComponent(Graphics);
        panelGraphics.fillColor = new Color(70, 120, 180, 190);
        panelGraphics.roundRect(-panelHalfWidth, -panelHalfHeight, panelWidth, panelHeight, 14);
        panelGraphics.fill();

        panelGraphics.strokeColor = new Color(40, 80, 140, 255);
        panelGraphics.lineWidth = 2;
        panelGraphics.roundRect(-panelHalfWidth, -panelHalfHeight, panelWidth, panelHeight, 14);
        panelGraphics.stroke();

        const avatarNode = new Node('OpponentAvatar');
        avatarNode.parent = this._opponentInfoRoot;
        avatarNode.setPosition(new Vec3(-225, 0, 0));
        const avatarTransform = avatarNode.addComponent(UITransform);
        const avatarSize = panelHeight * 0.5;
        avatarTransform.setContentSize(avatarSize, avatarSize);
        this._opponentAvatarSprite = avatarNode.addComponent(Sprite);
        this._opponentAvatarSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this._loadDefaultAvatar(this._opponentAvatarSprite);

        const usernameNode = new Node('OpponentUsernameLabel');
        usernameNode.parent = this._opponentInfoRoot;
        usernameNode.setPosition(new Vec3(-35, 20, 0));
        const usernameTransform = usernameNode.addComponent(UITransform);
        usernameTransform.setContentSize(240, 36);
        this._opponentUsernameLabel = usernameNode.addComponent(Label);
        this._opponentUsernameLabel.string = '对手';
        this._opponentUsernameLabel.fontSize = 24;
        this._opponentUsernameLabel.color = new Color(255, 255, 255, 255);
        this._opponentUsernameLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        this._opponentUsernameLabel.overflow = Label.Overflow.CLAMP;

        const rankNode = new Node('OpponentRankLabel');
        rankNode.parent = this._opponentInfoRoot;
        rankNode.setPosition(new Vec3(-5, -20, 0));
        const rankTransform = rankNode.addComponent(UITransform);
        rankTransform.setContentSize(300, 36);
        this._opponentRankLabel = rankNode.addComponent(Label);
        this._opponentRankLabel.string = '倔强青铜 初期';
        this._opponentRankLabel.fontSize = 24;
        this._opponentRankLabel.color = new Color(255, 228, 181, 255);
        this._opponentRankLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        this._opponentRankLabel.overflow = Label.Overflow.CLAMP;

        const starsNode = new Node('OpponentStarsLabel');
        starsNode.parent = this._opponentInfoRoot;
        const starsRightPadding = 24;
        starsNode.setPosition(new Vec3(panelHalfWidth - starsRightPadding - 60, 0, 0));
        const starsTransform = starsNode.addComponent(UITransform);
        starsTransform.setContentSize(120, 40);
        this._opponentStarsLabel = starsNode.addComponent(Label);
        this._opponentStarsLabel.string = '⭐ 0';
        this._opponentStarsLabel.fontSize = 28;
        this._opponentStarsLabel.color = new Color(255, 255, 100, 255);
        this._opponentStarsLabel.horizontalAlign = Label.HorizontalAlign.RIGHT;
        this._opponentStarsLabel.overflow = Label.Overflow.CLAMP;
    }

    /**
     * 生成随机对手信息
     */
    private _generateRandomOpponentInfo(): OpponentInfo {
        const adjectives = ['神秘', '勇敢', '聪慧', '俊美', '高尚', '优雅', '威武', '睿智', '灿烂', '非凡', '杰出', '伟大'];
        const nouns = ['剑客', '骑士', '术士', '猎手', '盗贼', '圣骑', '法师', '射手', '战士', '智者', '诗人', '骑兵'];

        const rankSystem = RankSystem.getInstance();
        const userSystem = UserSystem.getInstance();
        const myRank = rankSystem.getCurrentRank();
        const myStars = userSystem.getStars();

        const canPromoteOneStep = !(myRank.tier === RankTier.KING && myRank.phase === RankPhase.LATE);
        const useNextStep = canPromoteOneStep && Math.random() < 0.5;

        let opponentTier = myRank.tier;
        let opponentPhase = myRank.phase;
        if (useNextStep) {
            if (myRank.phase < RankPhase.LATE) {
                opponentPhase = (myRank.phase + 1) as RankPhase;
            } else if (myRank.tier < RankTier.KING) {
                opponentTier = (myRank.tier + 1) as RankTier;
                opponentPhase = RankPhase.EARLY;
            }
        }

        const path = rankSystem.getAllRankPath();
        const requirement = path.find((item) => item.tier === opponentTier && item.phase === opponentPhase);
        const maxStars = Math.max(1, requirement?.starsNeeded ?? 10);
        let opponentStars = Math.floor(Math.random() * maxStars);
        if (maxStars > 1 && opponentStars === myStars) {
            opponentStars = (opponentStars + 1) % maxStars;
        }

        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomBase = Math.floor(Math.random() * 10000).toString();
        const randomNum = ('0000' + randomBase).slice(-4);

        return {
            username: `${adjective}${noun}${randomNum}`,
            tier: opponentTier,
            phase: opponentPhase,
            stars: opponentStars,
        };
    }

    /**
     * 更新对手信息展示
     */
    private _updateOpponentInfoDisplay() {
        this._opponentInfo = this._generateRandomOpponentInfo();
        const rankSystem = RankSystem.getInstance();

        if (this._opponentUsernameLabel) {
            this._opponentUsernameLabel.string = this._opponentInfo.username;
        }

        if (this._opponentRankLabel) {
            this._opponentRankLabel.string = rankSystem.getRankDisplayName(this._opponentInfo.tier, this._opponentInfo.phase);
        }

        if (this._opponentStarsLabel) {
            this._opponentStarsLabel.string = `⭐ ${this._opponentInfo.stars}`;
        }
    }

    /**
     * 加载默认头像
     */
    private _loadDefaultAvatar(sprite: Sprite) {
        resources.load('images/photo-default/spriteFrame', SpriteFrame, (err, sf) => {
            if (!err && sf) {
                sprite.spriteFrame = sf;
                return;
            }
            resources.load('images/photo-default', SpriteFrame, (fallbackErr, fallbackSf) => {
                if (!fallbackErr && fallbackSf) {
                    sprite.spriteFrame = fallbackSf;
                }
            });
        });
    }

    /**
     * 更新用户信息展示
     */
    private _updateUserInfoDisplay() {
        const userSystem = UserSystem.getInstance();
        const rankSystem = RankSystem.getInstance();

        if (this._usernameLabel) {
            this._usernameLabel.string = userSystem.getUsername();
        }

        if (this._rankLabel) {
            this._rankLabel.string = rankSystem.getCurrentRankDisplayName();
        }

        if (this._starsLabel) {
            this._starsLabel.string = `⭐ ${userSystem.getStars()}`;
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

        // 更新用户信息
        this._updateUserInfoDisplay();
        this._updateOpponentInfoDisplay();

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
            const pageHeight = pageTransform?.contentSize.height ?? 960;
            const backBtnHalfWidth = 90;
            const backBtnHalfHeight = 31;
            const safeMargin = 20;
            this._backBtn.node.setPosition(
                -pageWidth / 2 + backBtnHalfWidth + safeMargin,
                pageHeight / 2 - backBtnHalfHeight - safeMargin,
                0,
            );
        }

        const boardCenterY = this._boardRoot?.position.y ?? 20;
        const infoGap = 170;
        if (this._userInfoRoot) {
            this._userInfoRoot.setPosition(new Vec3(0, boardCenterY - boardPixelSize / 2 - infoGap, 0));
        }

        if (this._opponentInfoRoot) {
            this._opponentInfoRoot.setPosition(new Vec3(0, boardCenterY + boardPixelSize / 2 + infoGap, 0));
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

        // 初始不在棋盘上摆放棋子；保留 _drawStone 供后续对弈落子时复用。
    }

    /**
     * 绘制更接近真实质感的棋子（阴影 + 主体 + 高光）
     */
    private _drawStone(graphics: Graphics, x: number, y: number, radius: number, isWhite: boolean) {
        // 1) 轻微投影，增强厚度感
        graphics.fillColor = new Color(0, 0, 0, isWhite ? 55 : 75);
        graphics.circle(x + radius * 0.1, y - radius * 0.12, radius * 1.04);
        graphics.fill();

        // 2) 棋子主体
        graphics.fillColor = isWhite
            ? new Color(240, 240, 240, 255)
            : new Color(32, 35, 40, 255);
        graphics.circle(x, y, radius);
        graphics.fill();

        // 3) 边缘描边
        graphics.strokeColor = isWhite
            ? new Color(155, 155, 155, 255)
            : new Color(70, 78, 90, 255);
        graphics.lineWidth = 1.6;
        graphics.circle(x, y, radius);
        graphics.stroke();

        // 4) 内层渐亮（用同心圆模拟）
        graphics.fillColor = isWhite
            ? new Color(252, 252, 252, 120)
            : new Color(82, 92, 108, 105);
        graphics.circle(x - radius * 0.05, y + radius * 0.05, radius * 0.8);
        graphics.fill();

        graphics.fillColor = isWhite
            ? new Color(255, 255, 255, 95)
            : new Color(105, 118, 140, 85);
        graphics.circle(x - radius * 0.1, y + radius * 0.1, radius * 0.58);
        graphics.fill();

        // 5) 镜面高光点
        graphics.fillColor = isWhite
            ? new Color(255, 255, 255, 210)
            : new Color(200, 210, 220, 125);
        graphics.circle(x - radius * 0.28, y + radius * 0.3, radius * 0.18);
        graphics.fill();
    }

    /**
     * 初始化棋盘状态
     */
    private _initBoardState() {
        this._boardState = [];
        for (let i = 0; i < this._boardSize; i++) {
            this._boardState[i] = [];
            for (let j = 0; j < this._boardSize; j++) {
                this._boardState[i][j] = 0;
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

            // 检查是否可以吃掉对手的棋子
            this._checkAndApplyKills(row, col, 1);
        }
    }

    /**
     * 检查并应用吃子规则
     */
    private _checkAndApplyKills(row: number, col: number, pieceType: number) {
        // 构建当前棋盘的棋子列表
        const currentPieceList = this._getBoardPieceList();

        // 构建当前移动的棋子对象
        const currentPiece: Position = {
            point: [row, col],
            type: pieceType,
        };

        // 使用规则系统检查是否可以吃掉对手的棋子
        const killedPieces = this._ruleSystem.checkKill(currentPiece, currentPieceList);

        // 如果有被吃掉的棋子，从棋盘上移除
        if (killedPieces.length > 0) {
            console.log(`可以吃掉 ${killedPieces.length} 颗对手的棋子:`, killedPieces);
            killedPieces.forEach((piece) => {
                this._boardState[piece.point[0]][piece.point[1]] = 0;
                console.log(`移除棋子: [${piece.point[0]}, ${piece.point[1]}]`);
            });
        } else {
            console.log('无法应用任何吃子规则');
        }
    }

    /**
     * 获取当前棋盘的所有棋子列表
     */
    private _getBoardPieceList(): Position[] {
        const pieceList: Position[] = [];
        for (let row = 0; row < this._boardSize; row++) {
            for (let col = 0; col < this._boardSize; col++) {
                const pieceType = this._boardState[row][col];
                if (pieceType !== 0) {
                    pieceList.push({
                        point: [row, col],
                        type: pieceType,
                    });
                }
            }
        }
        return pieceList;
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
