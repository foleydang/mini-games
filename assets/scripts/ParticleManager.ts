import { _decorator, Component, Node, ParticleSystem, Vec3, tween } from 'cc';
const { ccclass } = _decorator;

@ccclass('ParticleManager')
export class ParticleManager extends Component {
    
    static instance: ParticleManager;
    
    onLoad() {
        ParticleManager.instance = this;
    }
    
    // 得分飘字效果
    showScoreFloat(score: number, pos: Vec3, parent: Node) {
        const label = new Node('ScoreFloat');
        label.parent = parent;
        label.position = pos;
        
        const lbl = label.addComponent(require('cc').Label);
        lbl.string = '+' + score;
        lbl.fontSize = 32;
        lbl.color = new require('cc').Color(255, 215, 0);
        
        tween(label)
            .by(0.8, { position: new Vec3(0, 50, 0) })
            .to(0.2, { scale: new Vec3(0.5, 0.5, 1) })
            .call(() => label.destroy())
            .start();
    }
    
    // 消除爆炸效果（简化版，使用缩放动画）
    playExplosion(pos: Vec3, parent: Node) {
        const node = new Node('Explosion');
        node.parent = parent;
        node.position = pos;
        
        const sprite = node.addComponent(require('cc').Sprite);
        sprite.color = new require('cc').Color(255, 200, 100);
        
        const transform = node.addComponent(require('cc').UITransform);
        transform.width = 50;
        transform.height = 50;
        
        tween(node)
            .to(0.3, { scale: new Vec3(2, 2, 1) })
            .to(0.1, { scale: new Vec3(0, 0, 1) })
            .call(() => node.destroy())
            .start();
    }
    
    // 按钮点击反馈
    buttonClickEffect(btn: Node) {
        tween(btn)
            .to(0.1, { scale: new Vec3(0.9, 0.9, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }
}
