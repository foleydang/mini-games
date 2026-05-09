System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Vec3, tween, _dec, _class, _class2, _crd, ccclass, ParticleManager;

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      Node = _cc.Node;
      Vec3 = _cc.Vec3;
      tween = _cc.tween;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "4c576V/FlRNaqbkqwd/OPHQ", "ParticleManager", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'ParticleSystem', 'Vec3', 'tween']);

      ({
        ccclass
      } = _decorator);

      _export("ParticleManager", ParticleManager = (_dec = ccclass('ParticleManager'), _dec(_class = (_class2 = class ParticleManager extends Component {
        onLoad() {
          ParticleManager.instance = this;
        } // 得分飘字效果


        showScoreFloat(score, pos, parent) {
          const label = new Node('ScoreFloat');
          label.parent = parent;
          label.position = pos;
          const lbl = label.addComponent(require('cc').Label);
          lbl.string = '+' + score;
          lbl.fontSize = 32;
          lbl.color = new require('cc').Color(255, 215, 0);
          tween(label).by(0.8, {
            position: new Vec3(0, 50, 0)
          }).to(0.2, {
            scale: new Vec3(0.5, 0.5, 1)
          }).call(() => label.destroy()).start();
        } // 消除爆炸效果（简化版，使用缩放动画）


        playExplosion(pos, parent) {
          const node = new Node('Explosion');
          node.parent = parent;
          node.position = pos;
          const sprite = node.addComponent(require('cc').Sprite);
          sprite.color = new require('cc').Color(255, 200, 100);
          const transform = node.addComponent(require('cc').UITransform);
          transform.width = 50;
          transform.height = 50;
          tween(node).to(0.3, {
            scale: new Vec3(2, 2, 1)
          }).to(0.1, {
            scale: new Vec3(0, 0, 1)
          }).call(() => node.destroy()).start();
        } // 按钮点击反馈


        buttonClickEffect(btn) {
          tween(btn).to(0.1, {
            scale: new Vec3(0.9, 0.9, 1)
          }).to(0.1, {
            scale: new Vec3(1, 1, 1)
          }).start();
        }

      }, _class2.instance = void 0, _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=47f00665b3dae8e8f50fd7c8d81f881e64f1660a.js.map