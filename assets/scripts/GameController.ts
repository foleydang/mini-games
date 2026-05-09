import { _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label } from 'cc';
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
    private isTransitioning = false;
    private currentGameName = '';
    private cards: Array<{node: Node, id: string, x: number, y: number, w: number, h: number}> = [];
    
    onLoad() {
        this._sz(this.homeRoot, DESIGN_WIDTH, DESIGN_HEIGHT);
        this._sz(this.gameRoot, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.backButton.active = false;
        this.pauseButton.active = false;
        this.shareButton.active = false;
        
        this.backButton.on(Node.EventType.TOUCH_END, () => {
            if (!this.isTransitioning) this._goHome();
        });
        
        const ct = this.node.getComponent(UITransform);
        if (ct) ct.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        
        // 关键：在 homeRoot 上监听触摸，做命中测试
        this.homeRoot.on(Node.EventType.TOUCH_END, (ev: any) => {
            if (!this.homeRoot.active || this.isTransitioning) return;
            const loc = ev.getUILocation();
            const ht = this.homeRoot.getComponent(UITransform);
            if (!ht) return;
            const lp = ht.convertToNodeSpaceAR(new Vec3(loc.x, loc.y, 0));
            for (const c of this.cards) {
                if (Math.abs(lp.x - c.x) <= c.w / 2 && Math.abs(lp.y - c.y) <= c.h / 2) {
                    console.log('✅ clicked:', c.id);
                    this._start(c.id);
                    return;
                }
            }
        });
        
        this._goHome();
    }
    
    private _sz(n: Node, w: number, h: number) {
        if (!n) return;
        let t = n.getComponent(UITransform);
        if (!t) t = n.addComponent(UITransform);
        t.setContentSize(Math.max(t.contentSize.width, w), Math.max(t.contentSize.height, h));
    }
    
    _goHome() {
        this.homeRoot.active = true;
        this.gameRoot.active = false;
        this.backButton.active = false;
        this.pauseButton.active = false;
        this.shareButton.active = false;
        this.homeRoot.removeAllChildren();
        this.cards = [];
        
        const vs = this._vs();
        
        // 标题
        const title = this._lbl('🎮 Yanten快乐屋', 24, COLORS.primary, true);
        title.setPosition(new Vec3(0, vs.height / 2 - 120, 0));
        this.homeRoot.addChild(title);
        
        // 卡片
        const W = 130, H = 130, GX = 30, GY = 30;
        const tw = W * 2 + GX, th = H * 2 + GY;
        const positions = [
            new Vec3(-tw/2+W/2, th/2-H/2, 0),
            new Vec3(tw/2-W/2, th/2-H/2, 0),
            new Vec3(-tw/2+W/2, -th/2+H/2, 0),
            new Vec3(tw/2-W/2, -th/2+H/2, 0),
        ];
        
        GameConfig.games.forEach((g, i) => {
            const card = this._card(g);
            card.setPosition(positions[i]);
            this.homeRoot.addChild(card);
            this.cards.push({ node: card, id: g.id, x: positions[i].x, y: positions[i].y, w: W, h: H });
        });
    }
    
    _card(g: any): Node {
        const c = new Node('C');
        const t = c.addComponent(UITransform);
        t.setContentSize(130, 130);
        c.addComponent(Sprite).color = new Color(255, 255, 255, 230);
        
        // 子节点不要 UITransform，用纯 Node + setComponent 不注册触摸
        const icon = new Node('I');
        const il = icon.addComponent(Label);
        il.string = g.icon;
        il.fontSize = 28;
        il.color = Color.WHITE;
        il.isBold = true;
        icon.setPosition(0, 12);
        c.addChild(icon);
        
        const nm = new Node('N');
        const nl = nm.addComponent(Label);
        nl.string = g.name;
        nl.fontSize = 12;
        nl.color = COLORS.text;
        nl.isBold = true;
        nm.setPosition(0, -40);
        c.addChild(nm);
        
        return c;
    }
    
    _lbl(text: string, size: number, color: Color, bold: boolean): Node {
        const n = new Node('L');
        n.addComponent(UITransform).setContentSize(200, size * 1.5);
        const l = n.addComponent(Label);
        l.string = text; l.fontSize = size; l.color = color;
        if (bold) l.isBold = true;
        return n;
    }
    
    _vs() {
        const t = this.node.getComponent(UITransform);
        return t ? { width: t.contentSize.width, height: t.contentSize.height } : { width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
    }
    
    _start(id: string) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.currentGameName = GameConfig.games.find((g: any) => g.id === id)?.name || '';
        console.log(`start: ${this.currentGameName}`);
        
        try {
            this.homeRoot.active = false;
            this.gameRoot.active = true;
            this.backButton.active = true;
            this.pauseButton.active = true;
            this.shareButton.active = true;
            this.gameRoot.removeAllChildren();
            
            const gc = new Node('GC');
            gc.layer = 1073741824;
            gc.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
            this.gameRoot.addChild(gc);
            
            const gn = new Node('G');
            gn.layer = 1073741824;
            gc.addChild(gn);
            
            const comps: any = { match3: Match3Game, snake: SnakeGame, '2048': Game2048, tetris: TetrisGame };
            this.currentGame = gn.addComponent(comps[id]);
            
            if (id === 'match3') {
                this.currentGame.gridRoot = gc;
                this.currentGame.uiRoot = gc;
            } else {
                this.currentGame.gameArea = gc;
                this.currentGame.uiRoot = gc;
            }
            
            this.isTransitioning = false;
            console.log('✅ game added');
        } catch (e: any) {
            console.error('err:', e?.message || e);
            this.isTransitioning = false;
        }
    }
}
