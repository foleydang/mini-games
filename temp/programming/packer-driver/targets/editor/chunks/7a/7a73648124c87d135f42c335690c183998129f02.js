System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, Button, tween, ShareManager, _dec, _class, _crd, ccclass, PauseMenu;

  function _reportPossibleCrUseOfShareManager(extras) {
    _reporterNs.report("ShareManager", "./ShareManager", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      Node = _cc.Node;
      Vec3 = _cc.Vec3;
      UITransform = _cc.UITransform;
      Sprite = _cc.Sprite;
      Color = _cc.Color;
      Label = _cc.Label;
      Button = _cc.Button;
      tween = _cc.tween;
    }, function (_unresolved_2) {
      ShareManager = _unresolved_2.ShareManager;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "0b88dpPEB5FjZmRjNJzbXDY", "PauseMenu", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'Vec3', 'UITransform', 'Sprite', 'Color', 'Label', 'Button', 'tween', 'director']);

      ({
        ccclass
      } = _decorator);

      _export("PauseMenu", PauseMenu = (_dec = ccclass('PauseMenu'), _dec(_class = class PauseMenu extends Component {
        constructor(...args) {
          super(...args);
          this.overlay = null;
          this.isPaused = false;
          this.pauseCallback = null;
          this.resumeCallback = null;
          this.gameName = '';
          this.gameScore = 0;
        }

        onLoad() {
          this.node.active = false;
        } // 显示暂停菜单


        show(gameName, score, onPause, onResume) {
          this.gameName = gameName;
          this.gameScore = score;
          this.pauseCallback = onPause;
          this.resumeCallback = onResume;
          this.node.active = true;
          this.node.removeAllChildren(); // 半透明背景

          this.overlay = new Node('Overlay');
          const overlaySprite = this.overlay.addComponent(Sprite);
          overlaySprite.color = new Color(0, 0, 0, 180);
          const overlayTrans = this.overlay.addComponent(UITransform);
          overlayTrans.width = 1000;
          overlayTrans.height = 1000;
          this.node.addChild(this.overlay); // 暂停标题

          const title = this.createLabel('⏸ 游戏暂停', 40, Color.WHITE, true);
          title.setPosition(new Vec3(0, 100, 0));
          this.node.addChild(title); // 当前分数

          const scoreLabel = this.createLabel(`当前分数: ${score}`, 24, new Color(255, 220, 100));
          scoreLabel.setPosition(new Vec3(0, 40, 0));
          this.node.addChild(scoreLabel); // 继续游戏按钮

          const resumeBtn = this.createButton('▶ 继续游戏', new Color(78, 205, 196));
          resumeBtn.setPosition(new Vec3(0, -20, 0));
          this.node.addChild(resumeBtn);
          resumeBtn.on(Node.EventType.TOUCH_END, () => this.resume()); // 分享按钮

          const shareBtn = this.createButton('📤 分享成绩', new Color(255, 200, 100));
          shareBtn.setPosition(new Vec3(0, -90, 0));
          this.node.addChild(shareBtn);
          shareBtn.on(Node.EventType.TOUCH_END, () => this.share()); // 返回首页按钮

          const homeBtn = this.createButton('🏠 返回首页', new Color(255, 107, 107));
          homeBtn.setPosition(new Vec3(0, -160, 0));
          this.node.addChild(homeBtn);
          homeBtn.on(Node.EventType.TOUCH_END, () => this.goHome()); // 执行暂停回调

          if (this.pauseCallback) {
            this.pauseCallback();
          }

          this.isPaused = true; // 入场动画

          this.node.scale = new Vec3(0.8, 0.8, 1);
          this.node.opacity = 0;
          tween(this.node).to(0.2, {
            scale: new Vec3(1, 1, 1),
            opacity: 255
          }).start();
        } // 继续游戏


        resume() {
          tween(this.node).to(0.15, {
            scale: new Vec3(0.9, 0.9, 1),
            opacity: 0
          }).call(() => {
            this.node.active = false;
            this.isPaused = false;

            if (this.resumeCallback) {
              this.resumeCallback();
            }
          }).start();
        } // 分享


        share() {
          (_crd && ShareManager === void 0 ? (_reportPossibleCrUseOfShareManager({
            error: Error()
          }), ShareManager) : ShareManager).shareGame(this.gameName, this.gameScore);
        } // 返回首页


        goHome() {
          tween(this.node).to(0.15, {
            scale: new Vec3(0.9, 0.9, 1),
            opacity: 0
          }).call(() => {
            this.node.active = false;
            this.isPaused = false; // 触发返回首页事件

            this.node.emit('goHome');
          }).start();
        } // 创建按钮


        createButton(text, color) {
          const btn = new Node('Button'); // 背景

          const sprite = btn.addComponent(Sprite);
          sprite.color = color;
          const transform = btn.addComponent(UITransform);
          transform.width = 200;
          transform.height = 50; // 文字

          const label = this.createLabel(text, 20, Color.WHITE, true);
          label.setPosition(new Vec3(0, 0, 0));
          btn.addChild(label); // 按钮组件

          const button = btn.addComponent(Button);
          button.transition = Button.Transition.SCALE;
          button.zoomScale = 0.95;
          return btn;
        } // 创建标签


        createLabel(text, size, color, bold = false) {
          const node = new Node('Label');
          const label = node.addComponent(Label);
          label.string = text;
          label.fontSize = size;
          label.color = color;
          if (bold) label.isBold = true;
          return node;
        }

        isGamePaused() {
          return this.isPaused;
        }

      }) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=7a73648124c87d135f42c335690c183998129f02.js.map