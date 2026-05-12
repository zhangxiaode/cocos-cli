import { _decorator, Component, Button, Label, Node, Graphics, UITransform, Color, Vec3, Sprite, SpriteFrame, resources, EventTouch } from 'cc';
import { UIManager } from '../framework/UIManager';
import { SoundManager } from '../framework/SoundManager';
import { GameRuleSystem, Position } from '../game/GameRuleSystem';
import { UserSystem } from '../system/UserSystem';
import { RankSystem, RankTier, RankPhase } from '../game/RankSystem';
import { AIOpponentSystem } from '../game/AIOpponentSystem';

const { ccclass } = _decorator;

interface OpponentInfo {
    username: string;
    tier: RankTier;
    phase: RankPhase;
    stars: number;
}

enum MatchPhase {
    PLACEMENT = 1,
    DISCARD = 2,
    MOVEMENT = 3,
    FINISHED = 4,
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
    private _userActionTipLabel: Label | null = null; // 用户操作提示标签
    private _opponentInfoRoot: Node | null = null;
    private _opponentUsernameLabel: Label | null = null;
    private _opponentRankLabel: Label | null = null;
    private _opponentStarsLabel: Label | null = null;
    private _opponentAvatarSprite: Sprite | null = null;
    private _opponentActionTipLabel: Label | null = null; // 对手操作提示标签
    private _opponentInfo: OpponentInfo | null = null;
    private _aiSystem: AIOpponentSystem = AIOpponentSystem.getInstance();
    private _currentTurn: number = 1; // 1=玩家(白), 2=AI(黑)
    private _isAiThinking: boolean = false;
    private _isGameOver: boolean = false;
    private _matchPhase: MatchPhase = MatchPhase.PLACEMENT;
    private _lastPlacerType: number = 1;
    private _selectedMovePiece: [number, number] | null = null;
    private _discardPopupRoot: Node | null = null;
    private _discardPopupMessage: Label | null = null;
    private _pendingDiscardPoint: [number, number] | null = null;
    private _resultPopupRoot: Node | null = null;
    private _resultPopupTitle: Label | null = null;
    private _resultPopupMessage: Label | null = null;

    start() {
        this._createUI();
        this._initBoardState();
        this._drawGameBoard();
        this._updateUserInfoDisplay();
        this._updateOpponentInfoDisplay();
        this._updateActionTip();
        this._bindBoardInteraction();
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
        this._createActionTipLabels(pageRoot);
        this._createDiscardPopup(pageRoot);
        this._createResultPopup(pageRoot);

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
     * 创建弃子确认弹框
     */
    private _createDiscardPopup(parent: Node) {
        const pageTransform = parent.getComponent(UITransform);
        const pageSize = pageTransform?.contentSize;
        const pageWidth = pageSize?.width ?? 640;
        const pageHeight = pageSize?.height ?? 960;

        this._discardPopupRoot = new Node('DiscardPopup');
        this._discardPopupRoot.parent = parent;
        this._discardPopupRoot.active = false;
        this._discardPopupRoot.setPosition(Vec3.ZERO);

        const maskTransform = this._discardPopupRoot.addComponent(UITransform);
        maskTransform.setContentSize(pageWidth, pageHeight);
        const maskGraphics = this._discardPopupRoot.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 120);
        maskGraphics.rect(-pageWidth / 2, -pageHeight / 2, pageWidth, pageHeight);
        maskGraphics.fill();

        const dialogNode = new Node('Dialog');
        dialogNode.parent = this._discardPopupRoot;
        dialogNode.setPosition(new Vec3(0, 0, 0));
        const dialogTransform = dialogNode.addComponent(UITransform);
        dialogTransform.setContentSize(420, 220);

        const dialogGraphics = dialogNode.addComponent(Graphics);
        dialogGraphics.fillColor = new Color(245, 245, 245, 255);
        dialogGraphics.roundRect(-210, -110, 420, 220, 18);
        dialogGraphics.fill();
        dialogGraphics.strokeColor = new Color(120, 150, 190, 255);
        dialogGraphics.lineWidth = 2;
        dialogGraphics.roundRect(-210, -110, 420, 220, 18);
        dialogGraphics.stroke();

        const messageNode = new Node('Message');
        messageNode.parent = dialogNode;
        messageNode.setPosition(new Vec3(0, 40, 0));
        const messageTransform = messageNode.addComponent(UITransform);
        messageTransform.setContentSize(320, 70);
        this._discardPopupMessage = messageNode.addComponent(Label);
        this._discardPopupMessage.string = '确定要弃掉这颗棋子吗？';
        this._discardPopupMessage.fontSize = 28;
        this._discardPopupMessage.color = new Color(60, 60, 60, 255);
        this._discardPopupMessage.horizontalAlign = Label.HorizontalAlign.CENTER;

        const confirmBtn = this._createPopupButton(dialogNode, 'ConfirmDiscardBtn', '确定', new Vec3(-90, -45, 0));
        confirmBtn.node.on(Button.EventType.CLICK, this._confirmPlayerDiscard, this);

        const cancelBtn = this._createPopupButton(dialogNode, 'CancelDiscardBtn', '取消', new Vec3(90, -45, 0));
        cancelBtn.node.on(Button.EventType.CLICK, this._cancelPlayerDiscard, this);
    }

    private _createPopupButton(parent: Node, nodeName: string, text: string, position: Vec3): Button {
        const buttonNode = new Node(nodeName);
        buttonNode.parent = parent;
        buttonNode.setPosition(position);

        const buttonTransform = buttonNode.addComponent(UITransform);
        buttonTransform.setContentSize(140, 60);

        const graphics = buttonNode.addComponent(Graphics);
        graphics.fillColor = new Color(100, 150, 200, 255);
        graphics.roundRect(-70, -30, 140, 60, 14);
        graphics.fill();
        graphics.strokeColor = new Color(50, 100, 150, 255);
        graphics.lineWidth = 2;
        graphics.roundRect(-70, -30, 140, 60, 14);
        graphics.stroke();

        const button = buttonNode.addComponent(Button);
        const labelNode = new Node('Label');
        labelNode.parent = buttonNode;
        labelNode.addComponent(UITransform);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 24;
        label.color = new Color(255, 255, 255, 255);

        return button;
    }

    private _createResultPopup(parent: Node) {
        const pageTransform = parent.getComponent(UITransform);
        const pageSize = pageTransform?.contentSize;
        const pageWidth = pageSize?.width ?? 640;
        const pageHeight = pageSize?.height ?? 960;

        this._resultPopupRoot = new Node('ResultPopup');
        this._resultPopupRoot.parent = parent;
        this._resultPopupRoot.active = false;
        this._resultPopupRoot.setPosition(Vec3.ZERO);

        const maskTransform = this._resultPopupRoot.addComponent(UITransform);
        maskTransform.setContentSize(pageWidth, pageHeight);
        const maskGraphics = this._resultPopupRoot.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 140);
        maskGraphics.rect(-pageWidth / 2, -pageHeight / 2, pageWidth, pageHeight);
        maskGraphics.fill();

        const dialogNode = new Node('Dialog');
        dialogNode.parent = this._resultPopupRoot;
        dialogNode.setPosition(Vec3.ZERO);
        const dialogTransform = dialogNode.addComponent(UITransform);
        dialogTransform.setContentSize(440, 260);

        const dialogGraphics = dialogNode.addComponent(Graphics);
        dialogGraphics.fillColor = new Color(245, 245, 245, 255);
        dialogGraphics.roundRect(-220, -130, 440, 260, 20);
        dialogGraphics.fill();
        dialogGraphics.strokeColor = new Color(120, 150, 190, 255);
        dialogGraphics.lineWidth = 2;
        dialogGraphics.roundRect(-220, -130, 440, 260, 20);
        dialogGraphics.stroke();

        const titleNode = new Node('Title');
        titleNode.parent = dialogNode;
        titleNode.setPosition(new Vec3(0, 55, 0));
        const titleTransform = titleNode.addComponent(UITransform);
        titleTransform.setContentSize(320, 52);
        this._resultPopupTitle = titleNode.addComponent(Label);
        this._resultPopupTitle.string = '胜利';
        this._resultPopupTitle.fontSize = 36;
        this._resultPopupTitle.color = new Color(70, 120, 180, 255);
        this._resultPopupTitle.horizontalAlign = Label.HorizontalAlign.CENTER;

        const messageNode = new Node('Message');
        messageNode.parent = dialogNode;
        messageNode.setPosition(new Vec3(0, -5, 0));
        const messageTransform = messageNode.addComponent(UITransform);
        messageTransform.setContentSize(340, 70);
        this._resultPopupMessage = messageNode.addComponent(Label);
        this._resultPopupMessage.string = '恭喜赢得胜利';
        this._resultPopupMessage.fontSize = 28;
        this._resultPopupMessage.color = new Color(60, 60, 60, 255);
        this._resultPopupMessage.horizontalAlign = Label.HorizontalAlign.CENTER;

        const closeBtn = this._createPopupButton(dialogNode, 'CloseResultBtn', '确定', new Vec3(0, -70, 0));
        closeBtn.node.on(Button.EventType.CLICK, this._closeResultPopup, this);
    }

    /**
     * 绑定棋盘触摸事件
     */
    private _bindBoardInteraction() {
        if (!this._boardRoot) return;
        this._boardRoot.off(Node.EventType.TOUCH_END, this._onBoardTouch, this);
        this._boardRoot.on(Node.EventType.TOUCH_END, this._onBoardTouch, this);
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
     * 创建操作提示标签（在用户信息下方和对手信息上方）
     */
    private _createActionTipLabels(parent: Node) {
        // 用户操作提示（在用户信息下方）
        const userTipNode = new Node('UserActionTip');
        userTipNode.parent = parent;
        userTipNode.setPosition(new Vec3(0, -240, 0));
        const userTipTransform = userTipNode.addComponent(UITransform);
        userTipTransform.setContentSize(400, 30);
        this._userActionTipLabel = userTipNode.addComponent(Label);
        this._userActionTipLabel.string = '轮到你下子';
        this._userActionTipLabel.fontSize = 18;
        this._userActionTipLabel.color = new Color(100, 100, 100, 255);
        this._userActionTipLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this._userActionTipLabel.overflow = Label.Overflow.CLAMP;

        // 对手操作提示（在对手信息上方）
        const opponentTipNode = new Node('OpponentActionTip');
        opponentTipNode.parent = parent;
        opponentTipNode.setPosition(new Vec3(0, 240, 0));
        const opponentTipTransform = opponentTipNode.addComponent(UITransform);
        opponentTipTransform.setContentSize(400, 30);
        this._opponentActionTipLabel = opponentTipNode.addComponent(Label);
        this._opponentActionTipLabel.string = '';
        this._opponentActionTipLabel.fontSize = 18;
        this._opponentActionTipLabel.color = new Color(100, 100, 100, 255);
        this._opponentActionTipLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this._opponentActionTipLabel.overflow = Label.Overflow.CLAMP;
    }

    /**
     * 更新操作提示
     */
    private _updateActionTip() {
        let userTip = '';
        let opponentTip = '';

        if (this._currentTurn === 1) {
            // 轮到玩家
            if (this._matchPhase === MatchPhase.PLACEMENT) {
                userTip = '轮到你下子';
            } else if (this._matchPhase === MatchPhase.DISCARD) {
                userTip = '轮到你弃子';
            } else if (this._matchPhase === MatchPhase.MOVEMENT) {
                userTip = '轮到你走子';
            }
            opponentTip = '';
        } else {
            // 轮到AI
            userTip = '';
            if (this._matchPhase === MatchPhase.PLACEMENT) {
                opponentTip = '对手在下子...';
            } else if (this._matchPhase === MatchPhase.DISCARD) {
                opponentTip = '对手在弃子...';
            } else if (this._matchPhase === MatchPhase.MOVEMENT) {
                opponentTip = '对手在走子...';
            }
        }

        if (this._userActionTipLabel) {
            this._userActionTipLabel.string = userTip;
        }
        if (this._opponentActionTipLabel) {
            this._opponentActionTipLabel.string = opponentTip;
        }
    }
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

        // 提示文本跟随信息面板，避免漂移到棋盘区域
        if (this._userActionTipLabel && this._userInfoRoot) {
            this._userActionTipLabel.node.setPosition(new Vec3(0, this._userInfoRoot.position.y - 86, 0));
        }
        if (this._opponentActionTipLabel && this._opponentInfoRoot) {
            this._opponentActionTipLabel.node.setPosition(new Vec3(0, this._opponentInfoRoot.position.y + 86, 0));
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

        // 按当前棋盘状态绘制棋子
        const pieceRadius = this._cellSize * 0.2;
        for (let row = 0; row < this._boardSize; row++) {
            for (let col = 0; col < this._boardSize; col++) {
                const pieceType = this._boardState[row][col];
                if (pieceType === 0) continue;

                const x = -boardSpan / 2 + col * this._cellSize;
                const y = boardSpan / 2 - row * this._cellSize;
                this._drawStone(graphics, x, y, pieceRadius, pieceType === 1);

                const isSelectedMovePiece = !!this._selectedMovePiece
                    && this._selectedMovePiece[0] === row
                    && this._selectedMovePiece[1] === col;
                const isPendingDiscardPiece = !!this._pendingDiscardPoint
                    && this._pendingDiscardPoint[0] === row
                    && this._pendingDiscardPoint[1] === col;
                if (isSelectedMovePiece || isPendingDiscardPiece) {
                    this._drawSelectionMarker(graphics, x, y, pieceRadius, isPendingDiscardPiece);
                }
            }
        }
    }

    private _drawSelectionMarker(graphics: Graphics, x: number, y: number, radius: number, isDiscardTarget: boolean) {
        // 在棋子中心绘制小型蓝色标记，不遮挡棋子主体
        const centerMarkRadius = Math.max(4, radius * 0.3);

        graphics.fillColor = new Color(65, 150, 255, 235);
        graphics.circle(x, y, centerMarkRadius);
        graphics.fill();

        graphics.strokeColor = new Color(230, 245, 255, 255);
        graphics.lineWidth = 1.8;
        graphics.circle(x, y, centerMarkRadius + 1.5);
        graphics.stroke();

        // 细十字线强化“被选中”语义
        graphics.strokeColor = new Color(35, 110, 220, 255);
        graphics.lineWidth = 1.6;
        graphics.moveTo(x - centerMarkRadius * 0.55, y);
        graphics.lineTo(x + centerMarkRadius * 0.55, y);
        graphics.moveTo(x, y - centerMarkRadius * 0.55);
        graphics.lineTo(x, y + centerMarkRadius * 0.55);
        graphics.stroke();
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

        this._currentTurn = 1;
        this._isAiThinking = false;
        this._isGameOver = false;
        this._matchPhase = MatchPhase.PLACEMENT;
        this._lastPlacerType = 1;
        this._selectedMovePiece = null;
        this._pendingDiscardPoint = null;
        this._hideDiscardPopup();
    }

    /**
     * 处理棋盘触摸并转换为落子坐标
     */
    private _onBoardTouch(event: EventTouch) {
        if (this._isGameOver || this._isAiThinking || this._currentTurn !== 1 || !this._boardRoot || this._discardPopupRoot?.active) {
            return;
        }

        const boardTransform = this._boardRoot.getComponent(UITransform);
        if (!boardTransform) return;

        const uiPoint = event.getUILocation();
        const localPoint = boardTransform.convertToNodeSpaceAR(new Vec3(uiPoint.x, uiPoint.y, 0));

        const boardSpan = boardTransform.contentSize.width;
        const boardHalf = boardSpan / 2;
        const col = Math.round((localPoint.x + boardHalf) / this._cellSize);
        const row = Math.round((boardHalf - localPoint.y) / this._cellSize);

        if (row < 0 || row >= this._boardSize || col < 0 || col >= this._boardSize) {
            return;
        }

        const snapX = -boardHalf + col * this._cellSize;
        const snapY = boardHalf - row * this._cellSize;
        const offsetX = localPoint.x - snapX;
        const offsetY = localPoint.y - snapY;
        const touchDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

        if (touchDistance > this._cellSize * 0.46) {
            return;
        }

        if (this._matchPhase === MatchPhase.PLACEMENT) {
            this._onBoardClick(row, col);
            return;
        }

        if (this._matchPhase === MatchPhase.DISCARD) {
            this._handlePlayerDiscard(row, col);
            return;
        }

        if (this._matchPhase === MatchPhase.MOVEMENT) {
            this._handlePlayerMovement(row, col);
        }
    }

    /**
     * 玩家下子阶段落子
     */
    private _onBoardClick(row: number, col: number) {
        if (this._isGameOver || this._isAiThinking || this._currentTurn !== 1 || this._matchPhase !== MatchPhase.PLACEMENT) return;
        if (this._boardState[row][col] !== 0) return;

        this._boardState[row][col] = 1;
        this._lastPlacerType = 1;
        this._resolveCaptureAfterAction(row, col, 1, true);
        this._drawGameBoard();
        if (this._checkLoseByNoPieces()) {
            return;
        }

        if (this._isBoardFull()) {
            this._enterDiscardPhase();
            return;
        }

        this._startAiTurn();
    }

    /**
     * 玩家弃子阶段：在DISCARD阶段时选择一个自己的棋子弃掉
     */
    private _handlePlayerDiscard(row: number, col: number) {
        if (this._matchPhase !== MatchPhase.DISCARD || this._currentTurn !== 1) {
            return;
        }
        if (this._boardState[row][col] !== 1) return;

        this._pendingDiscardPoint = [row, col];
        this._drawGameBoard();
        this._showDiscardPopup();
    }

    /**
     * 玩家走子阶段：先选己方棋子，再选相邻空位落点
     */
    private _handlePlayerMovement(row: number, col: number) {
        if (this._matchPhase !== MatchPhase.MOVEMENT) return;

        if (!this._selectedMovePiece) {
            if (this._boardState[row][col] === 1) {
                this._selectedMovePiece = [row, col];
                this._drawGameBoard();
            }
            return;
        }

        const from = this._selectedMovePiece;
        if (from[0] === row && from[1] === col) {
            this._selectedMovePiece = null;
            this._drawGameBoard();
            return;
        }

        if (this._boardState[row][col] === 1) {
            this._selectedMovePiece = [row, col];
            this._drawGameBoard();
            return;
        }

        if (this._boardState[row][col] !== 0) return;
        if (!this._isAdjacentOrthogonal(from[0], from[1], row, col)) return;

        this._boardState[from[0]][from[1]] = 0;
        this._boardState[row][col] = 1;
        this._selectedMovePiece = null;

        this._resolveCaptureAfterAction(row, col, 1, true);
        this._drawGameBoard();
        if (this._checkLoseByNoPieces()) return;

        // 玩家走子后，检查AI是否有有效的走子
        if (this._canMakeValidMove(2)) {
            this._startAiTurn();
        } else {
            console.log('[GamePage] AI无法走子，玩家需要弃子给对方走');
            this._matchPhase = MatchPhase.DISCARD;
            this._lastPlacerType = 1; // 玩家需要弃子
            this._currentTurn = 1;
            this._updateActionTip();
        }
    }

    /**
     * 进入弃子阶段
     */
    private _enterDiscardPhase() {
        this._matchPhase = MatchPhase.DISCARD;
        this._selectedMovePiece = null;
        this._pendingDiscardPoint = null;
        this._hideDiscardPopup();
        this._updateActionTip();

        if (this._lastPlacerType === 2) {
            this._startAiTurn();
        }
    }

    /**
     * 启动AI回合
     */
    private _startAiTurn() {
        if (this._isGameOver) return;

        this._currentTurn = 2;
        this._updateActionTip();
        this._isAiThinking = true;
        this.scheduleOnce(() => {
            this._doAiTurn();
        }, 0.45);
    }

    /**
     * 执行AI回合（按阶段）
     */
    private _doAiTurn() {
        if (this._isGameOver) {
            this._isAiThinking = false;
            return;
        }

        if (this._matchPhase === MatchPhase.PLACEMENT) {
            this._doAiPlacement();
            return;
        }

        if (this._matchPhase === MatchPhase.DISCARD) {
            this._doAiDiscard();
            return;
        }

        if (this._matchPhase === MatchPhase.MOVEMENT) {
            this._doAiMovement();
            return;
        }

        this._isAiThinking = false;
    }

    /**
     * AI下子阶段
     */
    private _doAiPlacement() {
        const aiRankTier = this._opponentInfo?.tier ?? RankTier.BRONZE;
        const aiRankPhase = this._opponentInfo?.phase ?? RankPhase.EARLY;
        const move = this._aiSystem.chooseMove(this._boardState, 2, 1, aiRankTier, aiRankPhase);

        if (!move) {
            this._isAiThinking = false;
            this._currentTurn = 1;
            this._updateActionTip();
            return;
        }

        this._boardState[move.row][move.col] = 2;
        this._lastPlacerType = 2;
        this._resolveCaptureAfterAction(move.row, move.col, 2, false);
        this._drawGameBoard();
        if (this._checkLoseByNoPieces()) {
            this._isAiThinking = false;
            return;
        }

        if (this._isBoardFull()) {
            this._isAiThinking = false;
            this._enterDiscardPhase();
            return;
        }

        this._isAiThinking = false;
        this._currentTurn = 1;
        this._updateActionTip();
    }

    /**
     * AI弃子阶段
     */
    private _doAiDiscard() {
        if (this._matchPhase !== MatchPhase.DISCARD || this._currentTurn !== 2) {
            this._isAiThinking = false;
            return;
        }

        // AI弃子
        const ownPieces = this._findPiecesByType(2);
        if (ownPieces.length > 0) {
            const removeIndex = Math.floor(Math.random() * ownPieces.length);
            const removePoint = ownPieces[removeIndex];
            this._boardState[removePoint[0]][removePoint[1]] = 0;
        }
        this._drawGameBoard();
        
        // AI弃子后，检查玩家是否有有效的走子
        if (this._canMakeValidMove(1)) {
            // 玩家能走，转入MOVEMENT阶段
            this._matchPhase = MatchPhase.MOVEMENT;
            this._isAiThinking = false;
            this._currentTurn = 1;
            this._updateActionTip();
        } else {
            // 玩家无法走，AI继续弃子
            console.log('[GamePage] 玩家无法走子，AI继续弃子');
            // 保持在DISCARD阶段，继续让AI弃子
            this._isAiThinking = false;
            this.scheduleOnce(() => {
                this._doAiTurn();
            }, 0.45);
        }
    }

    /**
     * AI走子阶段
     */
    private _doAiMovement() {
        const aiRankTier = this._opponentInfo?.tier ?? RankTier.BRONZE;
        const aiRankPhase = this._opponentInfo?.phase ?? RankPhase.EARLY;
        const move = this._aiSystem.chooseStepMove(this._boardState, 2, 1, aiRankTier, aiRankPhase);

        if (!move) {
            this._isAiThinking = false;
            this._currentTurn = 1;
            this._updateActionTip();
            return;
        }

        this._boardState[move.fromRow][move.fromCol] = 0;
        this._boardState[move.toRow][move.toCol] = 2;
        this._resolveCaptureAfterAction(move.toRow, move.toCol, 2, false);
        this._drawGameBoard();
        if (this._checkLoseByNoPieces()) {
            this._isAiThinking = false;
            return;
        }

        // AI走子后，检查玩家是否有有效的走子
        if (this._canMakeValidMove(1)) {
            // 玩家能走，玩家继续走子
            this._isAiThinking = false;
            this._currentTurn = 1;
            this._updateActionTip();
        } else {
            // 玩家无法走，AI需要弃子给对方走
            console.log('[GamePage] 玩家无法走子，AI需要弃子给对方走');
            this._matchPhase = MatchPhase.DISCARD;
            this._lastPlacerType = 2; // AI需要弃子
            this._isAiThinking = false;
            this._currentTurn = 2;
            this._updateActionTip();
        }
    }

    /**
     * 执行吃子决策（玩家可选择吃或不吃）
     */
    private _resolveCaptureAfterAction(row: number, col: number, pieceType: number, isPlayer: boolean) {
        const killedPieces = this._getKillCandidates(row, col, pieceType);
        if (killedPieces.length === 0) {
            return;
        }

        let shouldCapture = true;
        if (isPlayer) {
            shouldCapture = this._askPlayerCapture(killedPieces.length);
        } else {
            const aiRankTier = this._opponentInfo?.tier ?? RankTier.BRONZE;
            const aiRankPhase = this._opponentInfo?.phase ?? RankPhase.EARLY;
            shouldCapture = this._aiSystem.shouldCapture(aiRankTier, aiRankPhase);
        }

        if (!shouldCapture) {
            return;
        }

        for (let i = 0; i < killedPieces.length; i++) {
            const p = killedPieces[i];
            this._boardState[p.point[0]][p.point[1]] = 0;
        }
    }

    /**
     * 玩家吃子确认提示
     */
    private _askPlayerCapture(killCount: number): boolean {
        const globalObj = globalThis as any;
        if (globalObj && typeof globalObj.confirm === 'function') {
            return globalObj.confirm(`可吃掉对方 ${killCount} 颗棋子，是否吃子？`);
        }

        // 非浏览器环境下默认吃子，避免流程中断
        return true;
    }

    private _showDiscardPopup() {
        if (!this._discardPopupRoot) return;
        this._discardPopupRoot.active = true;
        if (this._discardPopupMessage) {
            this._discardPopupMessage.string = '确定要弃掉这颗棋子吗？';
        }
    }

    private _hideDiscardPopup() {
        if (this._discardPopupRoot) {
            this._discardPopupRoot.active = false;
        }
    }

    private _confirmPlayerDiscard() {
        if (!this._pendingDiscardPoint) {
            this._hideDiscardPopup();
            return;
        }

        const row = this._pendingDiscardPoint[0];
        const col = this._pendingDiscardPoint[1];
        if (this._boardState[row][col] === 1) {
            this._boardState[row][col] = 0;
        }

        this._pendingDiscardPoint = null;
        this._hideDiscardPopup();
        this._drawGameBoard();
        
        // 玩家弃子后，检查AI是否有有效的走子
        if (this._canMakeValidMove(2)) {
            // AI能走，转入MOVEMENT阶段
            this._matchPhase = MatchPhase.MOVEMENT;
            this._currentTurn = 2;
            this._updateActionTip();
            this._startAiTurn();
        } else {
            // AI无法走，玩家继续弃子
            console.log('[GamePage] AI无法走子，玩家继续弃子');
            // 保持在DISCARD阶段，_currentTurn仍为1，玩家继续弃子
            // 不需要更新提示，因为玩家仍然轮到
        }
    }

    private _cancelPlayerDiscard() {
        this._pendingDiscardPoint = null;
        this._hideDiscardPopup();
        this._drawGameBoard();
    }

    private _showResultPopup(isVictory: boolean) {
        if (!this._resultPopupRoot || !this._resultPopupTitle || !this._resultPopupMessage) {
            return;
        }

        this._resultPopupRoot.active = true;
        this._resultPopupTitle.string = isVictory ? '胜利' : '失败';
        this._resultPopupTitle.color = isVictory
            ? new Color(70, 120, 180, 255)
            : new Color(200, 90, 90, 255);
        this._resultPopupMessage.string = isVictory ? '恭喜赢得胜利' : '失败了，再接再厉';
    }

    private _closeResultPopup() {
        if (this._resultPopupRoot) {
            this._resultPopupRoot.active = false;
        }
    }

    /**
     * 判断是否因棋子被吃完而结束
     */
    private _checkLoseByNoPieces(): boolean {
        if (this._matchPhase !== MatchPhase.MOVEMENT) {
            return false;
        }

        const counts = this._countPieces();
        if (counts.white > 0 && counts.black > 0) {
            return false;
        }

        this._isGameOver = true;
        this._matchPhase = MatchPhase.FINISHED;
        this._showResultPopup(counts.white > 0 && counts.black === 0);
        console.log('[GamePage] 对局结束', counts);
        return true;
    }

    private _countPieces(): { white: number; black: number; empty: number } {
        let white = 0;
        let black = 0;
        let empty = 0;

        for (let row = 0; row < this._boardSize; row++) {
            for (let col = 0; col < this._boardSize; col++) {
                const type = this._boardState[row][col];
                if (type === 0) empty += 1;
                if (type === 1) white += 1;
                if (type === 2) black += 1;
            }
        }

        return { white, black, empty };
    }

    private _isBoardFull(): boolean {
        for (let row = 0; row < this._boardSize; row++) {
            for (let col = 0; col < this._boardSize; col++) {
                if (this._boardState[row][col] === 0) {
                    return false;
                }
            }
        }
        return true;
    }

    private _findPiecesByType(pieceType: number): Array<[number, number]> {
        const points: Array<[number, number]> = [];
        for (let row = 0; row < this._boardSize; row++) {
            for (let col = 0; col < this._boardSize; col++) {
                if (this._boardState[row][col] === pieceType) {
                    points.push([row, col]);
                }
            }
        }
        return points;
    }

    private _isAdjacentOrthogonal(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
        const rowDistance = Math.abs(fromRow - toRow);
        const colDistance = Math.abs(fromCol - toCol);
        return rowDistance + colDistance === 1;
    }

    /**
     * 获取当前位置下可触发的吃子列表
     */
    private _getKillCandidates(row: number, col: number, pieceType: number): Position[] {
        const currentPieceList = this._getBoardPieceList();
        const currentPiece: Position = {
            point: [row, col],
            type: pieceType,
        };
        return this._ruleSystem.checkKill(currentPiece, currentPieceList);
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
     * 检查某一方是否有有效的走子（相邻空位）
     * @param pieceType 1=玩家白子, 2=AI黑子
     * @returns true 表示有至少一个棋子可以走到相邻的空位，false 表示无任何有效走子
     */
    private _canMakeValidMove(pieceType: number): boolean {
        const ownPieces = this._findPiecesByType(pieceType);
        for (const piece of ownPieces) {
            const [row, col] = piece;
            // 检查四个正交方向的相邻格子
            const directions = [
                [row - 1, col],
                [row + 1, col],
                [row, col - 1],
                [row, col + 1],
            ];
            for (const [r, c] of directions) {
                if (r >= 0 && r < this._boardSize && c >= 0 && c < this._boardSize) {
                    if (this._boardState[r][c] === 0) {
                        return true;
                    }
                }
            }
        }
        return false;
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
