System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, SnakeGame, Game2048, TetrisGame, Match3Game, GameConfig, COLORS, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _class, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4, _descriptor5, _crd, ccclass, property, DESIGN_WIDTH, DESIGN_HEIGHT, GameController;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }

  function _reportPossibleCrUseOfSnakeGame(extras) {
    _reporterNs.report("SnakeGame", "./SnakeGame", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGame(extras) {
    _reporterNs.report("Game2048", "./Game2048", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTetrisGame(extras) {
    _reporterNs.report("TetrisGame", "./TetrisGame", _context.meta, extras);
  }

  function _reportPossibleCrUseOfMatch3Game(extras) {
    _reporterNs.report("Match3Game", "./Match3Game", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGameConfig(extras) {
    _reporterNs.report("GameConfig", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCOLORS(extras) {
    _reporterNs.report("COLORS", "./GameConfig", _context.meta, extras);
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
    }, function (_unresolved_2) {
      SnakeGame = _unresolved_2.SnakeGame;
    }, function (_unresolved_3) {
      Game2048 = _unresolved_3.Game2048;
    }, function (_unresolved_4) {
      TetrisGame = _unresolved_4.TetrisGame;
    }, function (_unresolved_5) {
      Match3Game = _unresolved_5.Match3Game;
    }, function (_unresolved_6) {
      GameConfig = _unresolved_6.GameConfig;
      COLORS = _unresolved_6.COLORS;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "5092dxPBcpKPoyJOLjZlfFn", "GameController", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'Vec3', 'UITransform', 'Sprite', 'Color', 'Label']);

      ({
        ccclass,
        property
      } = _decorator);
      DESIGN_WIDTH = 640;
      DESIGN_HEIGHT = 960;

      _export("GameController", GameController = (_dec = ccclass('GameController'), _dec2 = property(Node), _dec3 = property(Node), _dec4 = property(Node), _dec5 = property(Node), _dec6 = property(Node), _dec(_class = (_class2 = class GameController extends Component {
        constructor(...args) {
          super(...args);

          _initializerDefineProperty(this, "homeRoot", _descriptor, this);

          _initializerDefineProperty(this, "gameRoot", _descriptor2, this);

          _initializerDefineProperty(this, "backButton", _descriptor3, this);

          _initializerDefineProperty(this, "pauseButton", _descriptor4, this);

          _initializerDefineProperty(this, "shareButton", _descriptor5, this);

          this.currentGame = null;
          this.isTransitioning = false;
          this.currentGameName = '';
          this.cards = [];
        }

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
          if (ct) ct.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT); // 关键：在 homeRoot 上监听触摸，做命中测试

          this.homeRoot.on(Node.EventType.TOUCH_END, ev => {
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

        _sz(n, w, h) {
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

          const vs = this._vs(); // 标题


          const title = this._lbl('🎮 Yanten快乐屋', 24, (_crd && COLORS === void 0 ? (_reportPossibleCrUseOfCOLORS({
            error: Error()
          }), COLORS) : COLORS).primary, true);

          title.setPosition(new Vec3(0, vs.height / 2 - 120, 0));
          this.homeRoot.addChild(title); // 卡片

          const W = 130,
                H = 130,
                GX = 30,
                GY = 30;
          const tw = W * 2 + GX,
                th = H * 2 + GY;
          const positions = [new Vec3(-tw / 2 + W / 2, th / 2 - H / 2, 0), new Vec3(tw / 2 - W / 2, th / 2 - H / 2, 0), new Vec3(-tw / 2 + W / 2, -th / 2 + H / 2, 0), new Vec3(tw / 2 - W / 2, -th / 2 + H / 2, 0)];
          (_crd && GameConfig === void 0 ? (_reportPossibleCrUseOfGameConfig({
            error: Error()
          }), GameConfig) : GameConfig).games.forEach((g, i) => {
            const card = this._card(g);

            card.setPosition(positions[i]);
            this.homeRoot.addChild(card);
            this.cards.push({
              node: card,
              id: g.id,
              x: positions[i].x,
              y: positions[i].y,
              w: W,
              h: H
            });
          });
        }

        _card(g) {
          const c = new Node('C');
          const t = c.addComponent(UITransform);
          t.setContentSize(130, 130);
          c.addComponent(Sprite).color = new Color(255, 255, 255, 230); // 子节点不要 UITransform，用纯 Node + setComponent 不注册触摸

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
          nl.color = (_crd && COLORS === void 0 ? (_reportPossibleCrUseOfCOLORS({
            error: Error()
          }), COLORS) : COLORS).text;
          nl.isBold = true;
          nm.setPosition(0, -40);
          c.addChild(nm);
          return c;
        }

        _lbl(text, size, color, bold) {
          const n = new Node('L');
          n.addComponent(UITransform).setContentSize(200, size * 1.5);
          const l = n.addComponent(Label);
          l.string = text;
          l.fontSize = size;
          l.color = color;
          if (bold) l.isBold = true;
          return n;
        }

        _vs() {
          const t = this.node.getComponent(UITransform);
          return t ? {
            width: t.contentSize.width,
            height: t.contentSize.height
          } : {
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT
          };
        }

        _start(id) {
          var _games$find;

          if (this.isTransitioning) return;
          this.isTransitioning = true;
          this.currentGameName = ((_games$find = (_crd && GameConfig === void 0 ? (_reportPossibleCrUseOfGameConfig({
            error: Error()
          }), GameConfig) : GameConfig).games.find(g => g.id === id)) == null ? void 0 : _games$find.name) || '';
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
            const comps = {
              match3: _crd && Match3Game === void 0 ? (_reportPossibleCrUseOfMatch3Game({
                error: Error()
              }), Match3Game) : Match3Game,
              snake: _crd && SnakeGame === void 0 ? (_reportPossibleCrUseOfSnakeGame({
                error: Error()
              }), SnakeGame) : SnakeGame,
              '2048': _crd && Game2048 === void 0 ? (_reportPossibleCrUseOfGame({
                error: Error()
              }), Game2048) : Game2048,
              tetris: _crd && TetrisGame === void 0 ? (_reportPossibleCrUseOfTetrisGame({
                error: Error()
              }), TetrisGame) : TetrisGame
            };
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
          } catch (e) {
            console.error('err:', (e == null ? void 0 : e.message) || e);
            this.isTransitioning = false;
          }
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "homeRoot", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "gameRoot", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "backButton", [_dec4], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, "pauseButton", [_dec5], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor5 = _applyDecoratedDescriptor(_class2.prototype, "shareButton", [_dec6], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=b6a73a01fa539db071991dda586030b18f5b8d5b.js.map