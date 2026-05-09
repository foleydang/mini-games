import { _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, Button, tween, director } from 'cc';
import { ShareManager } from './ShareManager';
const { ccclass } = _decorator;

@ccclass('PauseMenu')
export class PauseMenu extends Component {
    private overlay: Node = null;
    private isPaused: boolean = false;
    private pauseCallback: () => void = null;
    private resumeCallback: () => void = null;
    private gameName: string = '';
    private gameScore: number = 0;
    
    onLoad() {
        this.node.active = false;
    }
    
    // 显示暂停菜单
    show(gameName: string, score: number, onPause: () => void, onResume: () => void) {
        this.gameName = gameName;
        this.gameScore = score;
        this.pauseCallback = onPause;
        this.resumeCallback = onResume;
        
        this.node.active = true;
        this.node.removeAllChildren();
        
        // 半透明背景
        this.overlay = new Node('Overlay');
        const overlaySprite = this.overlay.addComponent(Sprite);
        overlaySprite.color = new Color(0, 0, 0, 180);
        const overlayTrans = this.overlay.addComponent(UITransform);
        overlayTrans.width = 1000;
        overlayTrans.height = 1000;
        this.node.addChild(this.overlay);
        
        // 暂停标题
        const title = this.createLabel('⏸ 游戏暂停', 40, Color.WHITE, true);
        title.setPosition(new Vec3(0, 100, 0));
        this.node.addChild(title);
        
        // 当前分数
        const scoreLabel = this.createLabel(`当前分数: ${score}`, 24, new Color(255, 220, 100));
        scoreLabel.setPosition(new Vec3(0, 40, 0));
        this.node.addChild(scoreLabel);
        
        // 继续游戏按钮
        const resumeBtn = this.createButton('▶ 继续游戏', new Color(78, 205, 196));
        resumeBtn.setPosition(new Vec3(0, -20, 0));
        this.node.addChild(resumeBtn);
        resumeBtn.on(Node.EventType.TOUCH_END, () => this.resume());
        
        // 分享按钮
        const shareBtn = this.createButton('📤 分享成绩', new Color(255, 200, 100));
        shareBtn.setPosition(new Vec3(0, -90, 0));
        this.node.addChild(shareBtn);
        shareBtn.on(Node.EventType.TOUCH_END, () => this.share());
        
        // 返回首页按钮
        const homeBtn = this.createButton('🏠 返回首页', new Color(255, 107, 107));
        homeBtn.setPosition(new Vec3(0, -160, 0));
        this.node.addChild(homeBtn);
        homeBtn.on(Node.EventType.TOUCH_END, () => this.goHome());
        
        // 执行暂停回调
        if (this.pauseCallback) {
            this.pauseCallback();
        }
        
        this.isPaused = true;
        
        // 入场动画
        this.node.scale = new Vec3(0.8, 0.8, 1);
        this.node.opacity = 0;
        tween(this.node)
            .to(0.2, { scale: new Vec3(1, 1, 1), opacity: 255 })
            .start();
    }
    
    // 继续游戏
    resume() {
        tween(this.node)
            .to(0.15, { scale: new Vec3(0.9, 0.9, 1), opacity: 0 })
            .call(() => {
                this.node.active = false;
                this.isPaused = false;
                if (this.resumeCallback) {
                    this.resumeCallback();
                }
            })
            .start();
    }
    
    // 分享
    share() {
        ShareManager.shareGame(this.gameName, this.gameScore);
    }
    
    // 返回首页
    goHome() {
        tween(this.node)
            .to(0.15, { scale: new Vec3(0.9, 0.9, 1), opacity: 0 })
            .call(() => {
                this.node.active = false;
                this.isPaused = false;
                // 触发返回首页事件
                this.node.emit('goHome');
            })
            .start();
    }
    
    // 创建按钮
    createButton(text: string, color: Color): Node {
        const btn = new Node('Button');
        
        // 背景
        const sprite = btn.addComponent(Sprite);
        sprite.color = color;
        
        const transform = btn.addComponent(UITransform);
        transform.width = 200;
        transform.height = 50;
        
        // 文字
        const label = this.createLabel(text, 20, Color.WHITE, true);
        label.setPosition(new Vec3(0, 0, 0));
        btn.addChild(label);
        
        // 按钮组件
        const button = btn.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.95;
        
        return btn;
    }
    
    // 创建标签
    createLabel(text: string, size: number, color: Color, bold: boolean = false): Node {
        const node = new Node('Label');
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.color = color;
        if (bold) label.isBold = true;
        return node;
    }
    
    isGamePaused(): boolean {
        return this.isPaused;
    }
}
