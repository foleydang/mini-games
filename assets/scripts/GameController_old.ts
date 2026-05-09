import { _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, Button, Layout, tween, Tween, director } from 'cc';
import { SnakeGame } from './SnakeGame';
import { Game2048 } from './Game2048';
import { TetrisGame } from './TetrisGame';
import { Match3Game } from './Match3Game';
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property(Node) homeRoot: Node = null!;
    @property(Node) gameRoot: Node = null!;
    @property(Node) backButton: Node = null!;
    
    private currentGame: Component = null;
    private isTransitioning: boolean = false;
    
    static readonly GAMES = [
        { id: 'match3', name: '开心消消乐', icon: '🌟', color: new Color(255, 107, 107) },
        { id: 'snake', name: '贪吃蛇', icon: '🐍', color: new Color(78, 205, 196) },
        { id: '2048', name: '2048', icon: '🎯', color: new Color(255, 230, 109) },
        { id: 'tetris', name: '俄罗斯方块', icon: '🧩', color: new Color(170, 150, 218) }
    ];
    
    onLoad() {
        this.showHome();
    }
    
    showHome() {
        this.homeRoot.active = true;
        this.gameRoot.active = false;
        this.backButton.active = false;
        this.homeRoot.removeAllChildren();
        this.createHomeUI();
    }
    
    createHomeUI() {
        // 标题
        const title = this.createLabel('🎮 游戏大厅', 36, new Color(196, 69, 105));
        title.setPosition(new Vec3(0, 250, 0));
        this.homeRoot.addChild(title);
        
        // 创建游戏卡片
        const positions = [
            new Vec3(-100, 100, 0),
            new Vec3(100, 100, 0),
            new Vec3(-100, -80, 0),
            new Vec3(100, -80, 0)
        ];
        
        GameController.GAMES.forEach((game, i) => {
            const card = this.createCard(game);
            card.setPosition(positions[i]);
            this.homeRoot.addChild(card);
            
            card.on(Node.EventType.TOUCH_END, () => this.startGame(game.id));
        });
    }
    
    createCard(game: any): Node {
        const card = new Node('Card');
        const sprite = card.addComponent(Sprite);
        sprite.color = new Color(255, 255, 255);
        
        const transform = card.addComponent(UITransform);
        transform.width = 160;
        transform.height = 160;
        
        // 图标背景
        const iconBg = new Node('IconBg');
        const iconSprite = iconBg.addComponent(Sprite);
        iconSprite.color = game.color;
        const iconTrans = iconBg.addComponent(UITransform);
        iconTrans.width = 100;
        iconTrans.height = 100;
        iconBg.setPosition(new Vec3(0, 20, 0));
        card.addChild(iconBg);
        
        // 图标
        const icon = this.createLabel(game.icon, 50, Color.WHITE, true);
        icon.setPosition(new Vec3(0, 20, 0));
        card.addChild(icon);
        
        // 名称
        const name = this.createLabel(game.name, 18, new Color(45, 52, 54), true);
        name.setPosition(new Vec3(0, -50, 0));
        card.addChild(name);
        
        // 点击效果
        const btn = card.addComponent(Button);
        btn.transition = Button.Transition.SCALE;
        btn.zoomScale = 0.9;
        
        return card;
    }
    
    startGame(gameId: string) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        // 淡出动画
        tween(this.homeRoot).to(0.3, { scale: new Vec3(0.9, 0.9, 1), opacity: 0 }).call(() => {
            this.homeRoot.active = false;
            this.gameRoot.active = true;
            this.backButton.active = true;
            this.gameRoot.removeAllChildren();
            
            // 创建游戏
            const gameNode = new Node('Game');
            this.gameRoot.addChild(gameNode);
            
            switch (gameId) {
                case 'match3':
                    const match3 = gameNode.addComponent(Match3Game);
                    match3.gridRoot = this.gameRoot;
                    match3.uiRoot = this.gameRoot;
                    break;
                case 'snake':
                    const snake = gameNode.addComponent(SnakeGame);
                    snake.gameArea = this.gameRoot;
                    break;
                case '2048':
                    const g2048 = gameNode.addComponent(Game2048);
                    g2048.gameArea = this.gameRoot;
                    break;
                case 'tetris':
                    const tetris = gameNode.addComponent(TetrisGame);
                    tetris.gameArea = this.gameRoot;
                    break;
            }
            
            // 淡入动画
            this.gameRoot.scale = new Vec3(0.9, 0.9, 1);
            tween(this.gameRoot).to(0.3, { scale: new Vec3(1, 1, 1) }).call(() => {
                this.isTransitioning = false;
            }).start();
        }).start();
    }
    
    backToHome() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        tween(this.gameRoot).to(0.3, { scale: new Vec3(0.9, 0.9, 1), opacity: 0 }).call(() => {
            if (this.currentGame) {
                this.currentGame.destroy();
                this.currentGame = null;
            }
            this.showHome();
            this.homeRoot.scale = new Vec3(0.9, 0.9, 1);
            this.homeRoot.opacity = 0;
            tween(this.homeRoot).to(0.3, { scale: new Vec3(1, 1, 1), opacity: 255 }).call(() => {
                this.isTransitioning = false;
            }).start();
        }).start();
    }
    
    createLabel(text: string, size: number, color: Color, bold: boolean = false): Node {
        const node = new Node('Label');
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.color = color;
        if (bold) label.isBold = true;
        return node;
    }
}
