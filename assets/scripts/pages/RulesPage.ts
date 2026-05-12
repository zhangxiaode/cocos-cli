import { _decorator, Component, Button, Label, Node, Graphics, UITransform, Color, Vec3 } from 'cc';
import { UIManager } from '../framework/UIManager';
import { SoundManager } from '../framework/SoundManager';

const { ccclass } = _decorator;

type RulePiece = 'black' | 'white' | 'empty';

interface RuleItem {
    text: string;
    pattern: RulePiece[];
    rows?: RulePiece[][];
}

const RULE_ITEMS: RuleItem[] = [
    {
        text: '1、口袋杀：白子可杀同一田字方格内的其余三子',
        pattern: [],
        rows: [
            ['black', 'black'],
            ['black', 'white'],
        ],
    },
    { text: '2、点炮杀：白子可杀同一行内的连续三子', pattern: ['black', 'black', 'black', 'white'] },
    { text: '3、双顶杀：连续两个白子可杀同一行内紧挨着的黑子，要求剩余为空位', pattern: ['black', 'white', 'white', 'empty'] },
    { text: '4、三顶杀：连续三个白子可杀同一行内剩余的黑子', pattern: ['black', 'white', 'white', 'white'] },
    { text: '5、分割杀：中间两个白子可杀同一行内两边的黑子', pattern: ['black', 'white', 'white', 'black'] },
    { text: '6、双面杀：两边的两个白子可杀同一行内中间的两个黑子', pattern: ['white', 'black', 'black', 'white'] },
    { text: '7、对顶杀：一边的两个白子可杀同一行内另一边的两个黑子', pattern: ['black', 'black', 'white', 'white'] },
    { text: '8、单挑杀：单个白子可杀同一行内白子两边的两个黑子，要求另一子为空', pattern: ['black', 'white', 'black', 'empty'] },
    { text: '9、双夹杀：两个白子可杀同一行内白子中间的一个黑子，要求另一子为空', pattern: ['white', 'black', 'white', 'empty'] },
];

@ccclass('RulesPage')
export class RulesPage extends Component {
    private _backBtn: Button | null = null;

    start() {
        this._createUI();
    }

    private _createUI() {
        const pageRoot = this.node;

        const pageTransform = pageRoot.getComponent(UITransform);
        const pageSize = pageTransform?.contentSize;
        const pageWidth = pageSize?.width ?? 640;
        const pageHeight = pageSize?.height ?? 960;
        const contentScale = Math.min(1.35, Math.max(1, pageWidth / 720));

        const backgroundNode = new Node('Background');
        backgroundNode.parent = pageRoot;
        backgroundNode.setPosition(Vec3.ZERO);
        backgroundNode.addComponent(UITransform).setContentSize(pageWidth, pageHeight);
        const backgroundGraphics = backgroundNode.addComponent(Graphics);
        backgroundGraphics.fillColor = new Color(238, 238, 238, 255);
        backgroundGraphics.rect(-pageWidth / 2, -pageHeight / 2, pageWidth, pageHeight);
        backgroundGraphics.fill();

        const titleNode = new Node('Title');
        titleNode.parent = pageRoot;
        titleNode.setPosition(new Vec3(0, pageHeight / 2 - 118 * contentScale, 0));
        titleNode.addComponent(UITransform).setContentSize(460, 104);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '游戏规则';
        titleLabel.fontSize = Math.round(48 * contentScale);
        titleLabel.lineHeight = Math.round(58 * contentScale);
        titleLabel.color = new Color(40, 40, 40, 255);
        titleLabel.verticalAlign = Label.VerticalAlign.CENTER;

        const subtitleNode = new Node('Subtitle');
        subtitleNode.parent = pageRoot;
        subtitleNode.setPosition(new Vec3(0, pageHeight / 2 - 190 * contentScale, 0));
        subtitleNode.addComponent(UITransform).setContentSize(460, 48);
        const subtitleLabel = subtitleNode.addComponent(Label);
        subtitleLabel.string = '暂定敌方黑子，我方白子';
        subtitleLabel.fontSize = Math.round(24 * contentScale);
        subtitleLabel.color = new Color(70, 70, 70, 255);

        const dividerNode = new Node('Divider');
        dividerNode.parent = pageRoot;
        dividerNode.setPosition(new Vec3(0, pageHeight / 2 - 236 * contentScale, 0));
        dividerNode.addComponent(UITransform).setContentSize(pageWidth - 72, 2);
        const dividerGraphics = dividerNode.addComponent(Graphics);
        dividerGraphics.strokeColor = new Color(185, 185, 185, 255);
        dividerGraphics.lineWidth = 2;
        dividerGraphics.moveTo(-(pageWidth - 72) / 2, 0);
        dividerGraphics.lineTo((pageWidth - 72) / 2, 0);
        dividerGraphics.stroke();

        const listTopY = pageHeight / 2 - 306 * contentScale;
        const leftPadding = Math.round(34 * contentScale);
        const rightPadding = Math.round(34 * contentScale);
        const iconWidth = Math.round(102 * contentScale);
        const iconHeight = Math.round(68 * contentScale);
        const iconGap = Math.round(20 * contentScale);
        const textWidth = pageWidth - leftPadding - rightPadding - iconWidth - iconGap;
        const backButtonBottomOffset = Math.round(54 * contentScale);
        const backButtonTopSpace = Math.round(96 * contentScale);
        const listBottomY = -pageHeight / 2 + backButtonBottomOffset + backButtonTopSpace;
        const rowHeight = Math.max(78, Math.floor((listTopY - listBottomY) / RULE_ITEMS.length));

        RULE_ITEMS.forEach((item, index) => {
            const rowNode = new Node(`RuleRow${index + 1}`);
            rowNode.parent = pageRoot;
            rowNode.setPosition(new Vec3(0, listTopY - rowHeight / 2 - index * rowHeight, 0));
            rowNode.addComponent(UITransform).setContentSize(pageWidth - leftPadding - rightPadding, rowHeight);

            const iconNode = new Node(`RuleIcon${index + 1}`);
            iconNode.parent = rowNode;
            iconNode.setPosition(new Vec3(-pageWidth / 2 + leftPadding + iconWidth / 2, 0, 0));
            iconNode.addComponent(UITransform).setContentSize(iconWidth, iconHeight);
            this._drawRuleIcon(iconNode, item);

            const textNode = new Node(`RuleText${index + 1}`);
            textNode.parent = rowNode;
            textNode.setPosition(new Vec3(-pageWidth / 2 + leftPadding + iconWidth + iconGap + textWidth / 2, 0, 0));
            textNode.addComponent(UITransform).setContentSize(textWidth, rowHeight);
            const textLabel = textNode.addComponent(Label);
            textLabel.string = item.text;
            textLabel.fontSize = Math.round(26 * contentScale);
            textLabel.lineHeight = Math.round(34 * contentScale);
            textLabel.color = new Color(40, 40, 40, 255);
            textLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
            textLabel.verticalAlign = Label.VerticalAlign.CENTER;
            textLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        });

        const backBtnNode = new Node('BackBtn');
        backBtnNode.parent = pageRoot;
        backBtnNode.setPosition(new Vec3(0, -pageHeight / 2 + backButtonBottomOffset, 0));
        backBtnNode.addComponent(UITransform).setContentSize(Math.round(180 * contentScale), Math.round(62 * contentScale));

        const backGraphics = backBtnNode.addComponent(Graphics);
        backGraphics.fillColor = new Color(115, 165, 220, 255);
        backGraphics.roundRect(-90 * contentScale, -31 * contentScale, 180 * contentScale, 62 * contentScale, 16 * contentScale);
        backGraphics.fill();
        backGraphics.strokeColor = new Color(70, 120, 180, 255);
        backGraphics.lineWidth = 2;
        backGraphics.roundRect(-90 * contentScale, -31 * contentScale, 180 * contentScale, 62 * contentScale, 16 * contentScale);
        backGraphics.stroke();

        this._backBtn = backBtnNode.addComponent(Button);
        this._backBtn.interactable = true;
        this._backBtn.node.on(Button.EventType.CLICK, this._onBack, this);

        const backLabelNode = new Node('Label');
        backLabelNode.parent = backBtnNode;
        backLabelNode.addComponent(UITransform);
        const backLabel = backLabelNode.addComponent(Label);
        backLabel.string = '返回';
        backLabel.fontSize = Math.round(28 * contentScale);
        backLabel.color = new Color(255, 255, 255, 255);
    }

    private _drawRuleIcon(iconNode: Node, item: RuleItem) {
        const graphics = iconNode.addComponent(Graphics);
        const iconTransform = iconNode.getComponent(UITransform);
        const width = iconTransform?.contentSize.width ?? 102;
        const height = iconTransform?.contentSize.height ?? 68;

        graphics.fillColor = new Color(221, 181, 118, 255);
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();

        graphics.strokeColor = new Color(138, 100, 45, 255);
        graphics.lineWidth = 1;

        if (item.rows) {
            this._drawGrid(graphics, width, height, 2, 2);
            const stepX = width / 2;
            const stepY = height / 2;
            for (let row = 0; row < item.rows.length; row++) {
                for (let col = 0; col < item.rows[row].length; col++) {
                    const x = -width / 2 + stepX * (col + 0.5);
                    const y = height / 2 - stepY * (row + 0.5);
                    this._drawPiece(graphics, x, y, item.rows[row][col]);
                }
            }
            return;
        }

        const columns = item.pattern.length;
        this._drawGrid(graphics, width, height, columns, 1);
        const stepX = width / columns;
        for (let col = 0; col < columns; col++) {
            const x = -width / 2 + stepX * (col + 0.5);
            this._drawPiece(graphics, x, 0, item.pattern[col]);
        }
    }

    private _drawGrid(graphics: Graphics, width: number, height: number, columns: number, rows: number) {
        for (let col = 0; col <= columns; col++) {
            const x = -width / 2 + (width / columns) * col;
            graphics.moveTo(x, -height / 2);
            graphics.lineTo(x, height / 2);
        }
        for (let row = 0; row <= rows; row++) {
            const y = -height / 2 + (height / rows) * row;
            graphics.moveTo(-width / 2, y);
            graphics.lineTo(width / 2, y);
        }
        graphics.stroke();
    }

    private _drawPiece(graphics: Graphics, x: number, y: number, piece: RulePiece) {
        if (piece === 'empty') {
            return;
        }

        const radius = 8.5;
        graphics.fillColor = piece === 'black' ? new Color(0, 0, 0, 255) : new Color(255, 255, 255, 255);
        graphics.circle(x, y, radius);
        graphics.fill();

        if (piece === 'white') {
            graphics.strokeColor = new Color(170, 170, 170, 255);
            graphics.lineWidth = 1;
            graphics.circle(x, y, radius);
            graphics.stroke();
        }
    }

    onShow() {
        console.log('规则页显示');
    }

    private _onBack() {
        SoundManager.getInstance().playEffect('sounds/click');
        UIManager.getInstance().backPage();
    }
}