System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, Button, tween, SnakeGame, Game2048, TetrisGame, Match3Game, _dec, _dec2, _dec3, _dec4, _class, _class2, _descriptor, _descriptor2, _descriptor3, _class3, _crd, ccclass, property, GameController;

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
      SnakeGame = _unresolved_2.SnakeGame;
    }, function (_unresolved_3) {
      Game2048 = _unresolved_3.Game2048;
    }, function (_unresolved_4) {
      TetrisGame = _unresolved_4.TetrisGame;
    }, function (_unresolved_5) {
      Match3Game = _unresolved_5.Match3Game;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "17c13wTXSxDVabdGn47cklZ", "GameController_old", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'Vec3', 'UITransform', 'Sprite', 'Color', 'Label', 'Button', 'Layout', 'tween', 'Tween', 'director']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("GameController", GameController = (_dec = ccclass('GameController'), _dec2 = property(Node), _dec3 = property(Node), _dec4 = property(Node), _dec(_class = (_class2 = (_class3 = class GameController extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "homeRoot", _descriptor, this);

          _initializerDefineProperty(this, "gameRoot", _descriptor2, this);

          _initializerDefineProperty(this, "backButton", _descriptor3, this);

          this.currentGame = null;
          this.isTransitioning = false;
        }

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
          var title = this.createLabel('🎮 游戏大厅', 36, new Color(196, 69, 105));
          title.setPosition(new Vec3(0, 250, 0));
          this.homeRoot.addChild(title); // 创建游戏卡片

          var positions = [new Vec3(-100, 100, 0), new Vec3(100, 100, 0), new Vec3(-100, -80, 0), new Vec3(100, -80, 0)];
          GameController.GAMES.forEach((game, i) => {
            var card = this.createCard(game);
            card.setPosition(positions[i]);
            this.homeRoot.addChild(card);
            card.on(Node.EventType.TOUCH_END, () => this.startGame(game.id));
          });
        }

        createCard(game) {
          var card = new Node('Card');
          var sprite = card.addComponent(Sprite);
          sprite.color = new Color(255, 255, 255);
          var transform = card.addComponent(UITransform);
          transform.width = 160;
          transform.height = 160; // 图标背景

          var iconBg = new Node('IconBg');
          var iconSprite = iconBg.addComponent(Sprite);
          iconSprite.color = game.color;
          var iconTrans = iconBg.addComponent(UITransform);
          iconTrans.width = 100;
          iconTrans.height = 100;
          iconBg.setPosition(new Vec3(0, 20, 0));
          card.addChild(iconBg); // 图标

          var icon = this.createLabel(game.icon, 50, Color.WHITE, true);
          icon.setPosition(new Vec3(0, 20, 0));
          card.addChild(icon); // 名称

          var name = this.createLabel(game.name, 18, new Color(45, 52, 54), true);
          name.setPosition(new Vec3(0, -50, 0));
          card.addChild(name); // 点击效果

          var btn = card.addComponent(Button);
          btn.transition = Button.Transition.SCALE;
          btn.zoomScale = 0.9;
          return card;
        }

        startGame(gameId) {
          if (this.isTransitioning) return;
          this.isTransitioning = true; // 淡出动画

          tween(this.homeRoot).to(0.3, {
            scale: new Vec3(0.9, 0.9, 1),
            opacity: 0
          }).call(() => {
            this.homeRoot.active = false;
            this.gameRoot.active = true;
            this.backButton.active = true;
            this.gameRoot.removeAllChildren(); // 创建游戏

            var gameNode = new Node('Game');
            this.gameRoot.addChild(gameNode);

            switch (gameId) {
              case 'match3':
                var match3 = gameNode.addComponent(_crd && Match3Game === void 0 ? (_reportPossibleCrUseOfMatch3Game({
                  error: Error()
                }), Match3Game) : Match3Game);
                match3.gridRoot = this.gameRoot;
                match3.uiRoot = this.gameRoot;
                break;

              case 'snake':
                var snake = gameNode.addComponent(_crd && SnakeGame === void 0 ? (_reportPossibleCrUseOfSnakeGame({
                  error: Error()
                }), SnakeGame) : SnakeGame);
                snake.gameArea = this.gameRoot;
                break;

              case '2048':
                var g2048 = gameNode.addComponent(_crd && Game2048 === void 0 ? (_reportPossibleCrUseOfGame({
                  error: Error()
                }), Game2048) : Game2048);
                g2048.gameArea = this.gameRoot;
                break;

              case 'tetris':
                var tetris = gameNode.addComponent(_crd && TetrisGame === void 0 ? (_reportPossibleCrUseOfTetrisGame({
                  error: Error()
                }), TetrisGame) : TetrisGame);
                tetris.gameArea = this.gameRoot;
                break;
            } // 淡入动画


            this.gameRoot.scale = new Vec3(0.9, 0.9, 1);
            tween(this.gameRoot).to(0.3, {
              scale: new Vec3(1, 1, 1)
            }).call(() => {
              this.isTransitioning = false;
            }).start();
          }).start();
        }

        backToHome() {
          if (this.isTransitioning) return;
          this.isTransitioning = true;
          tween(this.gameRoot).to(0.3, {
            scale: new Vec3(0.9, 0.9, 1),
            opacity: 0
          }).call(() => {
            if (this.currentGame) {
              this.currentGame.destroy();
              this.currentGame = null;
            }

            this.showHome();
            this.homeRoot.scale = new Vec3(0.9, 0.9, 1);
            this.homeRoot.opacity = 0;
            tween(this.homeRoot).to(0.3, {
              scale: new Vec3(1, 1, 1),
              opacity: 255
            }).call(() => {
              this.isTransitioning = false;
            }).start();
          }).start();
        }

        createLabel(text, size, color, bold) {
          if (bold === void 0) {
            bold = false;
          }

          var node = new Node('Label');
          var label = node.addComponent(Label);
          label.string = text;
          label.fontSize = size;
          label.color = color;
          if (bold) label.isBold = true;
          return node;
        }

      }, _class3.GAMES = [{
        id: 'match3',
        name: '开心消消乐',
        icon: '🌟',
        color: new Color(255, 107, 107)
      }, {
        id: 'snake',
        name: '贪吃蛇',
        icon: '🐍',
        color: new Color(78, 205, 196)
      }, {
        id: '2048',
        name: '2048',
        icon: '🎯',
        color: new Color(255, 230, 109)
      }, {
        id: 'tetris',
        name: '俄罗斯方块',
        icon: '🧩',
        color: new Color(170, 150, 218)
      }], _class3), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "homeRoot", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "gameRoot", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "backButton", [_dec4], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=3789fc19aa617cb4f8cf83ee51140d3864fb5f55.js.map