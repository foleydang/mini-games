import { _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, input, Input, EventTouch } from 'cc';
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
    private homeTouchHandler: ((e: EventTouch) => void) | null = null;
    
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
    
    onDestroy() {
        // 清理全局触摸监听
        if (this.homeTouchHandler) {
            input.off(Input.EventType.TOUCH_END, this.homeTouchHandler);
        }
    }
    
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
        const title = this.createLabel('🎮 Yanten快乐屋', 28, COLORS.primary, true);
        title.setPosition(new Vec3(0, vs.height / 2 - 100, 0));
        this.homeRoot.addChild(title);
        
        // 游戏卡片
        const cardW = 160, cardH = 160, gapX = 40, gapY = 40;
        const startX = -(cardW + gapX) / 2;
        const startY = (cardH + gapY) / 2;
        const positions = [
            new Vec3(startX, startY, 0),
            new Vec3(startX + cardW + gapX, startY, 0),
            new Vec3(startX, startY - cardH - gapY, 0),
            new Vec3(startX + cardW + gapX, startY - cardH - gapY, 0),
        ];
        
        GameConfig.games.forEach((game, i) => {
            const card = this.createCard(game);
            card.setPosition(positions[i]);
            this.homeRoot.addChild(card);
            this.gameCards.push({ node: card, gameId: game.id });
        });
        
        // 全局触摸监听
        this.homeTouchHandler = (event: EventTouch) => {
            if (!this.homeRoot.active || this.isTransitioning) return;
            
            const touchLoc = event.getUILocation();
            const ht = this.homeRoot.getComponent(UITransform);
            if (!ht) return;
            
            const localPos = ht.convertToNodeSpaceAR(new Vec3(touchLoc.x, touchLoc.y, 0));
            
            for (const { node, gameId } of this.gameCards) {
                if (!node.active) continue;
                const ut = node.getComponent(UITransform);
                if (!ut) continue;
                
                const hw = ut.contentSize.width / 2;
                const hh = ut.contentSize.height / 2;
                const dx = localPos.x - node.position.x;
                const dy = localPos.y - node.position.y;
                
                if (Math.abs(dx) <= hw && Math.abs(dy) <= hh) {
                    console.log('✅ 点击卡片:', gameId);
                    this.startGame(gameId);
                    return;
                }
            }
        };
        input.on(Input.EventType.TOUCH_END, this.homeTouchHandler);
    }
    
    createCard(game: any): Node {
        const card = new Node('Card');
        const t = card.addComponent(UITransform);
        t.setContentSize(160, 160);
        t.setAnchorPoint(0.5, 0.5);
        
        const sp = card.addComponent(Sprite);
        sp.color = new Color(255, 255, 255, 220);
        sp.type = Sprite.Type.SIMPLE;
        
        // 图标背景
        const iconBg = new Node('IconBg');
        const ibg = iconBg.addComponent(UITransform);
        ibg.setContentSize(70, 70);
        const spBg = iconBg.addComponent(Sprite);
        spBg.color = game.color;
        spBg.type = Sprite.Type.SIMPLE;
        iconBg.setPosition(new Vec3(0, 18, 0));
        card.addChild(iconBg);
        
        // 图标
        const icon = this.createLabel(game.icon, 36, Color.WHITE, true);
        icon.setPosition(new Vec3(0, 18, 0));
        card.addChild(icon);
        
        // 名称
        const name = this.createLabel(game.name, 16, COLORS.text, true);
        name.setPosition(new Vec3(0, -52, 0));
        card.addChild(name);
        
        return card;
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
