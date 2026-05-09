import { _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, Button, tween, director } from 'cc';
import { SnakeGame } from './SnakeGame';
import { Game2048 } from './Game2048';
import { TetrisGame } from './TetrisGame';
import { Match3Game } from './Match3Game';
import { GameConfig, COLORS } from './GameConfig';
import { ScoreManager } from './ScoreManager';
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property(Node) homeRoot: Node = null!;
    @property(Node) gameRoot: Node = null!;
    @property(Node) backButton: Node = null!;
    
    private currentGame: Component = null;
    private isTransitioning: boolean = false;
    
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
        const visibleSize = this.getVisibleSize();
        
        const title = this.createLabel('🎮 Yanten快乐屋', 36, COLORS.primary, true);
        title.setPosition(new Vec3(0, visibleSize.height / 2 - 80, 0));
        this.homeRoot.addChild(title);
        
        const positions = [
            new Vec3(-100, 100, 0), new Vec3(100, 100, 0),
            new Vec3(-100, -80, 0), new Vec3(100, -80, 0)
        ];
        
        GameConfig.games.forEach((game, i) => {
            const card = this.createCard(game);
            card.setPosition(positions[i]);
            this.homeRoot.addChild(card);
            
            const score = ScoreManager.getHighScore(game.id);
            if (score > 0) {
                const scoreLabel = this.createLabel(`🏆 ${score}`, 14, new Color(255, 180, 0));
                scoreLabel.setPosition(new Vec3(0, -65, 0));
                card.addChild(scoreLabel);
            }
            
            card.on(Node.EventType.TOUCH_END, () => this.startGame(game.id));
        });
    }
    
    createCard(game: any): Node {
        const card = new Node('Card');
        const sprite = card.addComponent(Sprite);
        sprite.color = Color.WHITE;
        const transform = card.addComponent(UITransform);
        transform.width = 160;
        transform.height = 160;
        
        const iconBg = new Node('IconBg');
        iconBg.addComponent(Sprite).color = game.color;
        iconBg.addComponent(UITransform).setContentSize(80, 80);
        iconBg.setPosition(new Vec3(0, 15, 0));
        card.addChild(iconBg);
        
        const icon = this.createLabel(game.icon, 40, Color.WHITE, true);
        icon.setPosition(new Vec3(0, 15, 0));
        card.addChild(icon);
        
        const name = this.createLabel(game.name, 16, COLORS.text, true);
        name.setPosition(new Vec3(0, -55, 0));
        card.addChild(name);
        
        const btn = card.addComponent(Button);
        btn.transition = Button.Transition.SCALE;
        btn.zoomScale = 0.9;
        
        return card;
    }
    
    startGame(gameId: string) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        tween(this.homeRoot).to(0.3, { scale: new Vec3(0.9, 0.9, 1), opacity: 0 }).call(() => {
            this.homeRoot.active = false;
            this.gameRoot.active = true;
            this.backButton.active = true;
            this.gameRoot.removeAllChildren();
            
            const gameNode = new Node('Game');
            this.gameRoot.addChild(gameNode);
            
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
                (this.currentGame as any).gameArea = this.gameRoot;
            }
            
            this.gameRoot.scale = new Vec3(0.9, 0.9, 1);
            tween(this.gameRoot).to(0.3, { scale: new Vec3(1, 1, 1) }).call(() => {
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
    
    getVisibleSize() {
        const canvas = director.getScene().getChildByName('Canvas');
        return canvas.getComponent(UITransform).contentSize;
    }
}
