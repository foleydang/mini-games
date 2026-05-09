System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5", "__unresolved_6"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, Button, EventHandler, SnakeGame, Game2048, TetrisGame, Match3Game, GameConfig, COLORS, ScoreManager, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _class, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4, _descriptor5, _crd, ccclass, property, DESIGN_WIDTH, DESIGN_HEIGHT, GameController;

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

  function _reportPossibleCrUseOfScoreManager(extras) {
    _reporterNs.report("ScoreManager", "./ScoreManager", _context.meta, extras);
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
      EventHandler = _cc.EventHandler;
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
    }, function (_unresolved_7) {
      ScoreManager = _unresolved_7.ScoreManager;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "5092dxPBcpKPoyJOLjZlfFn", "GameController", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'Vec3', 'UITransform', 'Sprite', 'Color', 'Label', 'Button', 'EventHandler']);

      ({
        ccclass,
        property
      } = _decorator);
      DESIGN_WIDTH = 640;
      DESIGN_HEIGHT = 960;

      _export("GameController", GameController = (_dec = ccclass('GameController'), _dec2 = property(Node), _dec3 = property(Node), _dec4 = property(Node), _dec5 = property(Node), _dec6 = property(Node), _dec(_class = (_class2 = class GameController extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "homeRoot", _descriptor, this);

          _initializerDefineProperty(this, "gameRoot", _descriptor2, this);

          _initializerDefineProperty(this, "backButton", _descriptor3, this);

          _initializerDefineProperty(this, "pauseButton", _descriptor4, this);

          _initializerDefineProperty(this, "shareButton", _descriptor5, this);

          this.currentGame = null;
          this.isTransitioning = false;
          this.currentGameName = '';
          this.currentGameScore = 0;
          this.gameCards = [];
        }

        onLoad() {
          // 确保节点大小
          this._ensureNodeSize(this.homeRoot, DESIGN_WIDTH, DESIGN_HEIGHT);

          this._ensureNodeSize(this.gameRoot, DESIGN_WIDTH, DESIGN_HEIGHT); // 按钮默认隐藏


          this.backButton.active = false;
          this.pauseButton.active = false;
          this.shareButton.active = false; // 设置返回按钮

          this.backButton.on(Node.EventType.TOUCH_END, () => {
            if (!this.isTransitioning) {
              this.saveScore();
              this.showHome();
            }
          }); // 确保 Canvas 全屏

          var canvas = this.node;
          var canvasTransform = canvas.getComponent(UITransform);

          if (canvasTransform) {
            canvasTransform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
          }

          this.showHome();
        }

        _ensureNodeSize(node, width, height) {
          if (!node) return;
          var t = node.getComponent(UITransform);
          if (!t) t = node.addComponent(UITransform);

          if (t.contentSize.width < width || t.contentSize.height < height) {
            t.setContentSize(width, height);
          }
        }

        showHome() {
          this.homeRoot.active = true;
          this.gameRoot.active = false;
          this.backButton.active = false;
          this.pauseButton.active = false;
          this.shareButton.active = false;
          this.homeRoot.removeAllChildren();
          this.gameCards = [];
          this.createHomeUI();
        }

        createHomeUI() {
          var vs = this.getVisibleSize(); // 标题

          var title = this._createLabel('🎮 Yanten快乐屋', 24, (_crd && COLORS === void 0 ? (_reportPossibleCrUseOfCOLORS({
            error: Error()
          }), COLORS) : COLORS).primary, true);

          title.setPosition(new Vec3(0, vs.height / 2 - 120, 0));
          this.homeRoot.addChild(title); // 游戏卡片 2x2

          var cardW = 130,
              cardH = 130,
              gapX = 30,
              gapY = 30;
          var totalW = cardW * 2 + gapX;
          var totalH = cardH * 2 + gapY;
          var positions = [new Vec3(-totalW / 2 + cardW / 2, totalH / 2 - cardH / 2, 0), new Vec3(totalW / 2 - cardW / 2, totalH / 2 - cardH / 2, 0), new Vec3(-totalW / 2 + cardW / 2, -totalH / 2 + cardH / 2, 0), new Vec3(totalW / 2 - cardW / 2, -totalH / 2 + cardH / 2, 0)];
          (_crd && GameConfig === void 0 ? (_reportPossibleCrUseOfGameConfig({
            error: Error()
          }), GameConfig) : GameConfig).games.forEach((game, i) => {
            var card = this._createCard(game);

            card.setPosition(positions[i]);
            this.homeRoot.addChild(card);
            this.gameCards.push({
              node: card,
              gameId: game.id
            }); // Button + EventHandler

            var btn = card.getComponent(Button);
            if (!btn) btn = card.addComponent(Button);
            btn.transition = Button.Transition.SCALE;
            btn.zoomScale = 0.92;
            btn.target = card;
            btn.clickEvents = [];
            var eh = new EventHandler();
            eh.target = this.node;
            eh.component = 'GameController';
            eh.handler = '_onCardClick';
            eh.customEventData = game.id;
            btn.clickEvents.push(eh);
          });
        }

        _onCardClick(event, customEventData) {
          if (!this.isTransitioning) {
            console.log('✅ 点击卡片:', customEventData);
            this.startGame(customEventData);
          }
        }

        _createCard(game) {
          var card = new Node('Card');
          var t = card.addComponent(UITransform);
          t.setContentSize(130, 130);
          t.setAnchorPoint(0.5, 0.5);
          var sp = card.addComponent(Sprite);
          sp.color = new Color(255, 255, 255, 220);
          sp.type = Sprite.Type.SIMPLE; // 图标背景

          var iconBg = new Node('IconBg');
          var ibg = iconBg.addComponent(UITransform);
          ibg.setContentSize(60, 60);
          var spBg = iconBg.addComponent(Sprite);
          spBg.color = game.color;
          spBg.type = Sprite.Type.SIMPLE;
          iconBg.setPosition(new Vec3(0, 15, 0));
          card.addChild(iconBg); // 图标 emoji

          var icon = this._createLabel(game.icon, 30, Color.WHITE, true);

          icon.setPosition(new Vec3(0, 15, 0));
          card.addChild(icon); // 游戏名称

          var name = this._createLabel(game.name, 14, (_crd && COLORS === void 0 ? (_reportPossibleCrUseOfCOLORS({
            error: Error()
          }), COLORS) : COLORS).text, true);

          name.setPosition(new Vec3(0, -42, 0));
          card.addChild(name);
          return card;
        }

        _createLabel(text, size, color, bold) {
          if (bold === void 0) {
            bold = false;
          }

          var node = new Node('Label');
          var t = node.addComponent(UITransform);
          t.setContentSize(200, size * 1.5);
          t.setAnchorPoint(0.5, 0.5);
          var label = node.addComponent(Label);
          label.string = text;
          label.fontSize = size;
          label.color = color;
          label.horizontalAlign = Label.HorizontalAlign.CENTER;
          label.verticalAlign = Label.VerticalAlign.CENTER;
          if (bold) label.isBold = true;
          return node;
        }

        startGame(gameId) {
          var _games$find;

          if (this.isTransitioning) return;
          this.isTransitioning = true;
          this.currentGameName = ((_games$find = (_crd && GameConfig === void 0 ? (_reportPossibleCrUseOfGameConfig({
            error: Error()
          }), GameConfig) : GameConfig).games.find(g => g.id === gameId)) == null ? void 0 : _games$find.name) || '';
          console.log("\u5F00\u59CB\u6E38\u620F: " + this.currentGameName + " (" + gameId + ")");

          try {
            this.homeRoot.active = false;
            this.gameRoot.active = true;
            this.backButton.active = true;
            this.pauseButton.active = true;
            this.shareButton.active = true;
            this.gameRoot.removeAllChildren(); // 游戏容器

            var container = new Node('GameContainer');
            container.layer = 1073741824;
            var ct = container.addComponent(UITransform);
            ct.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
            ct.setAnchorPoint(0.5, 0.5);
            this.gameRoot.addChild(container);
            var gameNode = new Node('Game');
            gameNode.layer = 1073741824;
            container.addChild(gameNode);

            switch (gameId) {
              case 'match3':
                this.currentGame = gameNode.addComponent(_crd && Match3Game === void 0 ? (_reportPossibleCrUseOfMatch3Game({
                  error: Error()
                }), Match3Game) : Match3Game);
                break;

              case 'snake':
                this.currentGame = gameNode.addComponent(_crd && SnakeGame === void 0 ? (_reportPossibleCrUseOfSnakeGame({
                  error: Error()
                }), SnakeGame) : SnakeGame);
                break;

              case '2048':
                this.currentGame = gameNode.addComponent(_crd && Game2048 === void 0 ? (_reportPossibleCrUseOfGame({
                  error: Error()
                }), Game2048) : Game2048);
                break;

              case 'tetris':
                this.currentGame = gameNode.addComponent(_crd && TetrisGame === void 0 ? (_reportPossibleCrUseOfTetrisGame({
                  error: Error()
                }), TetrisGame) : TetrisGame);
                break;
            }

            if (this.currentGame) {
              if (gameId === 'match3') {
                this.currentGame.gridRoot = container;
                this.currentGame.uiRoot = container;
              } else {
                this.currentGame.gameArea = container;
                this.currentGame.uiRoot = container;
              }
            }

            this.isTransitioning = false;
            console.log('✅ 游戏组件已添加');
          } catch (e) {
            console.error('startGame 出错:', (e == null ? void 0 : e.message) || e);
            this.isTransitioning = false;
          }
        }

        getVisibleSize() {
          var canvas = this.node;
          var t = canvas == null ? void 0 : canvas.getComponent(UITransform);
          if (t) return {
            width: t.contentSize.width,
            height: t.contentSize.height
          };
          return {
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT
          };
        }

        saveScore() {
          if (this.currentGame && this.currentGameName) {
            var _games$find2;

            var score = this.currentGame.score || 0;
            (_crd && ScoreManager === void 0 ? (_reportPossibleCrUseOfScoreManager({
              error: Error()
            }), ScoreManager) : ScoreManager).saveHighScore(((_games$find2 = (_crd && GameConfig === void 0 ? (_reportPossibleCrUseOfGameConfig({
              error: Error()
            }), GameConfig) : GameConfig).games.find(g => g.name === this.currentGameName)) == null ? void 0 : _games$find2.id) || '', score);
          }
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "homeRoot", [_dec2], {
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
      }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, "pauseButton", [_dec5], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor5 = _applyDecoratedDescriptor(_class2.prototype, "shareButton", [_dec6], {
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
//# sourceMappingURL=b6a73a01fa539db071991dda586030b18f5b8d5b.js.map