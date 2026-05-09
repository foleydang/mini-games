import { _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, Button, EventHandler, SystemEventType } from 'cc';
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
    
    onLoad() {
        this._ensureSize(this.homeRoot, DESIGN_WIDTH, DESIGN_HEIGHT);
        this._ensureSize(this.gameRoot, DESIGN_WIDTH, DESIGN_HEIGHT);
        
        this.backButton.active = false;
        this.pauseButton.active = false;
        this.shareButton.active = false;
        
        this.backButton.on(Node.EventType.TOUCH_END, () => {
            if (!this.isTransitioning) this.showHome();
        });
        
        const ct = this.node.getComponent(UITransform);
        if (ct) ct.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        
        this.showHome();
    }
    
    private _ensureSize(node: Node, w: number, h: number) {
        if (!node) return;
        let t = node.getComponent(UITransform);
        if (!t) t = node.addComponent(UITransform);
        t.setContentSize(Math.max(t.contentSize.width, w), Math.max(t.contentSize.height, h));
    }
    
    showHome() {
        this.homeRoot.active = true;
        this.gameRoot.active = false;
        this.backButton.active = false;
        this.pauseButton.active = false;
        this.shareButton.active = false;
        this.homeRoot.removeAllChildren();
        this.createHomeUI();
    }
    
    createHomeUI() {
        const vs = this.getVisibleSize();
        
        // 标题
        const title = this._makeLabel('🎮 Yanten快乐屋', 24, COLORS.primary, true);
        title.setPosition(0, vs.height / 2 - 120);
        this.homeRoot.addChild(title);
        
        // 卡片
        const W = 130, H = 130, GX = 30, GY = 30;
        const tw = W * 2 + GX, th = H * 2 + GY;
        const pos = [
            new Vec3(-tw/2+W/2, th/2-H/2),
            new Vec3(tw/2-W/2, th/2-H/2),
            new Vec3(-tw/2+W/2, -th/2+H/2),
            new Vec3(tw/2-W/2, -th/2+H/2),
        ];
        
        GameConfig.games.forEach((g, i) => {
            const card = this._makeCard(g);
            card.setPosition(pos[i]);
            this.homeRoot.addChild(card);
            
            // 关键：直接用 node.on 监听，不用 Button
            card.on(SystemEventType.TOUCH_END, () => {
                if (!this.isTransitioning) {
                    console.log('✅ 点击了:', g.id);
                    this.startGame(g.id);
                }
            });
        });
    }
    
    _makeCard(g: any): Node {
        const card = new Node('Card');
        const t = card.addComponent(UITransform);
        t.setContentSize(130, 130);
        
        // 背景
        const bg = card.addComponent(Sprite);
        bg.color = new Color(255, 255, 255, 230);
        bg.type = Sprite.Type.SIMPLE;
        
        // 所有子节点都设为极小 size，不拦截触摸
        const icon = this._makeLabel(g.icon, 28, Color.WHITE, true);
        icon.setPosition(0, 12);
        // 关键：让 label 的 UITransform 极小，不拦截
        icon.getComponent(UITransform).setContentSize(1, 1);
        card.addChild(icon);
        
        const name = this._makeLabel(g.name, 12, COLORS.text, true);
        name.setPosition(0, -40);
        name.getComponent(UITransform).setContentSize(1, 1);
        card.addChild(name);
        
        return card;
    }
    
    _makeLabel(text: string, size: number, color: Color, bold: boolean): Node {
        const n = new Node('L');
        const t = n.addComponent(UITransform);
        t.setContentSize(200, size * 1.5);
        const l = n.addComponent(Label);
        l.string = text;
        l.fontSize = size;
        l.color = color;
        if (bold) l.isBold = true;
        return n;
    }
    
    startGame(id: string) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.currentGameName = GameConfig.games.find(g => g.id === id)?.name || '';
        console.log(`开始: ${this.currentGameName}`);
        
        try {
            this.homeRoot.active = false;
            this.gameRoot.active = true;
            this.backButton.active = true;
            this.pauseButton.active = true;
            this.shareButton.active = true;
            this.gameRoot.removeAllChildren();
            
            const container = new Node('GC');
            container.layer = 1073741824;
            container.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
            this.gameRoot.addChild(container);
            
            const gn = new Node('Game');
            gn.layer = 1073741824;
            container.addChild(gn);
            
            const comps: any = { match3: Match3Game, snake: SnakeGame, '2048': Game2048, tetris: TetrisGame };
            this.currentGame = gn.addComponent(comps[id]);
            
            if (id === 'match3') {
                this.currentGame.gridRoot = container;
                this.currentGame.uiRoot = container;
            } else {
                this.currentGame.gameArea = container;
                this.currentGame.uiRoot = container;
            }
            
            this.isTransitioning = false;
            console.log('✅ 已添加游戏');
        } catch (e: any) {
            console.error('出错:', e?.message || e);
            this.isTransitioning = false;
        }
    }
    
    getVisibleSize() {
        const t = this.node.getComponent(UITransform);
        return t ? { width: t.contentSize.width, height: t.contentSize.height } : { width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
    }
}
