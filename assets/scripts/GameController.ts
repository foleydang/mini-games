import { _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, Button, EventHandler } from 'cc';
import { SnakeGame } from './SnakeGame';
import { Game2048 } from './Game2048';
import { TetrisGame } from './TetrisGame';
import { Match3Game } from './Match3Game';
import { GameConfig, COLORS } from './GameConfig';
import { ScoreManager } from './ScoreManager';
const { ccclass, property } = _decorator;

const DESIGN_WIDTH = 640;
const DESIGN_HEIGHT = 960;

@ccclass('GameController')
export class GameController extends Component {
    @property(Node) homeRoot: Node = null!;
    @property(Node) gameRoot: Node = null!;
    @property(Node) backButton: Node = null!;
    @property(Node) pauseButton: Node = null!;
    @property(Node) shareButton: Node = null!;
    
    private currentGame: any = null;
    private isTransitioning: boolean = false;
    private currentGameName: string = '';
    private currentGameScore: number = 0;
    private gameCards: { node: Node; gameId: string }[] = [];
    private _cardClickCallbacks: Map<string, () => void> = new Map();
    
    onLoad() {
        // 确保节点大小
        this.ensureNodeSize(this.homeRoot, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.ensureNodeSize(this.gameRoot, DESIGN_WIDTH, DESIGN_HEIGHT);
        
        // 按钮默认隐藏
        this.backButton.active = false;
        this.pauseButton.active = false;
        this.shareButton.active = false;
        
        // 设置返回按钮
        this.backButton.on(Node.EventType.TOUCH_END, () => {
            if (!this.isTransitioning) {
                this.saveScore();
                this.showHome();
            }
        });
        
        // 设置暂停按钮
        this.pauseButton.on(Node.EventType.TOUCH_END, () => {
            console.log('暂停按钮点击');
        });
        
        // 设置分享按钮
        this.shareButton.on(Node.EventType.TOUCH_END, () => {
            console.log('分享按钮点击');
        });
        
        // 确保 Canvas 全屏
        const canvas = this.node; // GameController 挂在 Canvas 上
        const canvasTransform = canvas.getComponent(UITransform);
        if (canvasTransform) {
            canvasTransform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        }
        
        this.showHome();
    }
    
    onDestroy() {}
    
    private ensureNodeSize(node: Node, width: number, height: number) {
        if (!node) return;
        let t = node.getComponent(UITransform);
        if (!t) t = node.addComponent(UITransform);
        if (t.contentSize.width < width || t.contentSize.height < height) {
            t.setContentSize(width, height);
        }
    }
    
    showHome() {
        this.homeRoot.active = true;
        this.gameRoot.active = false;
        this.backButton.active = false;
        this.pauseButton.active = false;
        this.shareButton.active = false;
        this.homeRoot.removeAllChildren();
        this.gameCards = [];
        
        // 清理旧的监听
        if (this.homeTouchHandler) {
            input.off(Input.EventType.TOUCH_END, this.homeTouchHandler);
        }
        
        this.createHomeUI();
    }
    
    createHomeUI() {
        const vs = this.getVisibleSize();
        
        // 标题
        const title = this._createLabel('🎮 Yanten快乐屋', 24, COLORS.primary, true);
        title.setPosition(new Vec3(0, vs.height / 2 - 120, 0));
        this.homeRoot.addChild(title);
        
        // 游戏卡片 2x2
        const cardW = 130, cardH = 130, gapX = 30, gapY = 30;
        const totalW = cardW * 2 + gapX;
        const totalH = cardH * 2 + gapY;
        const positions = [
            new Vec3(-totalW / 2 + cardW / 2, totalH / 2 - cardH / 2, 0),
            new Vec3(totalW / 2 - cardW / 2, totalH / 2 - cardH / 2, 0),
            new Vec3(-totalW / 2 + cardW / 2, -totalH / 2 + cardH / 2, 0),
            new Vec3(totalW / 2 - cardW / 2, -totalH / 2 + cardH / 2, 0),
        ];
        
        GameConfig.games.forEach((game, i) => {
            const card = this._createCard(game);
            card.setPosition(positions[i]);
            this.homeRoot.addChild(card);
            this.gameCards.push({ node: card, gameId: game.id });
            
            // Button + EventHandler 接收点击
            const btn = card.getComponent(Button);
            if (!btn) return;
            const eh = new EventHandler();
            eh.target = this.node;
            eh.component = 'GameController';
            eh.handler = '_onCardClick';
            eh.customEventData = game.id;
            btn.clickEvents = [eh];
        });
    }
    
    _onCardClick(event: Event, customEventData: string) {
        if (!this.isTransitioning) {
            console.log('✅ 点击卡片:', customEventData);
            this.startGame(customEventData);
        }
    }
    
    createCard(game: any): Node {
        const card = new Node('Card');
        const t = card.addComponent(UITransform);
        t.setContentSize(160, 160);
        t.setAnchorPoint(0.5, 0.5);
        
        const sp = card.addComponent(Sprite);
        sp.color = new Color(255, 255, 255, 220);
        sp.type = Sprite.Type.SIMPLE;
        
        // 图标背景 - 禁用触摸拦截
        const iconBg = this._createNoTouchNode('IconBg', 70, 70);
        iconBg.getComponent(Sprite).color = game.color;
        iconBg.setPosition(new Vec3(0, 18, 0));
        card.addChild(iconBg);
        
        // 图标 - 禁用触摸拦截
        const icon = this._createNoTouchLabel(game.icon, 36, Color.WHITE, true);
        icon.setPosition(new Vec3(0, 18, 0));
        card.addChild(icon);
        
        // 名称 - 禁用触摸拦截
        const name = this._createNoTouchLabel(game.name, 16, COLORS.text, true);
        name.setPosition(new Vec3(0, -52, 0));
        card.addChild(name);
        
        return card;
    }
    
    _createNoTouchNode(name: string, w: number, h: number): Node {
        const node = new Node(name);
        const ut = node.addComponent(UITransform);
        ut.setContentSize(w, h);
        const sp = node.addComponent(Sprite);
        // 透明材质 + 不拦截触摸的关键：把 layer 设为 0 但父卡片的 Sprite 仍然接收触摸
        // 实际上在 Cocos 3.x 中，子节点有 UITransform 就会拦截，所以不用 Sprite
        node.removeComponent(Sprite);
        return node;
    }
    
    _createNoTouchLabel(text: string, size: number, color: Color, bold: boolean = false): Node {
        const node = new Node('Label');
        const t = node.addComponent(UITransform);
        t.setContentSize(200, size * 1.5);
        t.setAnchorPoint(0.5, 0.5);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        if (bold) label.isBold = true;
        return node;
    }
    
    startGame(gameId: string) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.currentGameName = GameConfig.games.find(g => g.id === gameId)?.name || '';
        console.log(`开始游戏: ${this.currentGameName} (${gameId})`);
        
        try {
            // 切换场景
            this.homeRoot.active = false;
            this.gameRoot.active = true;
            this.backButton.active = true;
            this.pauseButton.active = true;
            this.shareButton.active = true;
            this.gameRoot.removeAllChildren();
            
            // 游戏容器
            const container = new Node('GameContainer');
            container.layer = 1073741824; // UI_2D 层
            const ct = container.addComponent(UITransform);
            ct.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
            ct.setAnchorPoint(0.5, 0.5);
            this.gameRoot.addChild(container);
            
            const gameNode = new Node('Game');
            gameNode.layer = 1 << 21;
            container.addChild(gameNode);
            
            switch (gameId) {
                case 'match3':
                    this.currentGame = gameNode.addComponent(Match3Game);
                    break;
                case 'snake':
                    this.currentGame = gameNode.addComponent(SnakeGame);
                    break;
                case '2048':
                    this.currentGame = gameNode.addComponent(Game2048);
                    break;
                case 'tetris':
                    this.currentGame = gameNode.addComponent(TetrisGame);
                    break;
            }
            
            if (this.currentGame) {
                if (gameId === 'match3') {
                    this.currentGame.gridRoot = container;
                    this.currentGame.uiRoot = container;
                } else {
                    this.currentGame.gameArea = container;
                    this.currentGame.uiRoot = container;
                }
            }
            
            this.isTransitioning = false;
            console.log('✅ 游戏组件已添加');
        } catch (e: any) {
            console.error('startGame 出错:', e?.message || e);
            this.isTransitioning = false;
        }
    }
    
    createLabel(text: string, size: number, color: Color, bold: boolean = false): Node {
        const node = new Node('Label');
        const t = node.addComponent(UITransform);
        t.setContentSize(200, size * 1.5);
        t.setAnchorPoint(0.5, 0.5);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        if (bold) label.isBold = true;
        return node;
    }
    
    getVisibleSize() {
        const canvas = this.node;
        const t = canvas?.getComponent(UITransform);
        if (t) return { width: t.contentSize.width, height: t.contentSize.height };
        return { width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
    }
    
    saveScore() {
        if (this.currentGame && this.currentGameName) {
            const score = this.currentGame.score || 0;
            ScoreManager.saveHighScore(
                GameConfig.games.find(g => g.name === this.currentGameName)?.id || '',
                score
            );
        }
    }
}
