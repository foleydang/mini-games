System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Vec3, UITransform, Sprite, Color, director, _dec, _dec2, _dec3, _class, _class2, _descriptor, _descriptor2, _crd, ccclass, property, SnakeGame;

  function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }

  return {
    setters: [function (_cc) {
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
      director = _cc.director;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "238b92Mh4RBFqlXXst+2ITh", "SnakeGame", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'Vec3', 'UITransform', 'Sprite', 'Color', 'Label', 'tween', 'Tween', 'Input', 'input', 'EventTouch', 'EventKeyboard', 'KeyCode', 'director', 'math']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("SnakeGame", SnakeGame = (_dec = ccclass('SnakeGame'), _dec2 = property(Node), _dec3 = property(Node), _dec(_class = (_class2 = class SnakeGame extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "gameArea", _descriptor, this);

          _initializerDefineProperty(this, "uiRoot", _descriptor2, this);

          this.gridWidth = 15;
          this.gridHeight = 20;
          this.cellSize = 20;
          this.snake = [];
          this.direction = {
            x: 0,
            y: 1
          };
          this.food = {
            x: 0,
            y: 0
          };
          this.score = 0;
          this.gameOver = false;
          this.moveInterval = 0.15;
        }

        start() {
          this.initGame();
          this.schedule(this.updateGame, this.moveInterval);
        }

        initGame() {
          var visibleSize = this.getVisibleSize();
          this.cellSize = Math.min((visibleSize.width - 40) / this.gridWidth, (visibleSize.height - 200) / this.gridHeight);
          this.snake = [{
            x: 7,
            y: 10
          }, {
            x: 7,
            y: 9
          }, {
            x: 7,
            y: 8
          }];
          this.direction = {
            x: 0,
            y: 1
          };
          this.score = 0;
          this.gameOver = false;
          this.generateFood();
          this.render();
        }

        getVisibleSize() {
          var canvas = director.getScene().getChildByName('Canvas');
          return canvas.getComponent(UITransform).contentSize;
        }

        updateGame() {
          if (this.gameOver) return;
          this.moveSnake();
        }

        moveSnake() {
          var head = _extends({}, this.snake[0]);

          head.x += this.direction.x;
          head.y += this.direction.y;

          if (head.x < 0 || head.x >= this.gridWidth || head.y < 0 || head.y >= this.gridHeight) {
            this.gameOver = true;
            return;
          }

          this.snake.unshift(head);

          if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.generateFood();
          } else {
            this.snake.pop();
          }

          this.render();
        }

        generateFood() {
          do {
            this.food = {
              x: Math.floor(Math.random() * this.gridWidth),
              y: Math.floor(Math.random() * this.gridHeight)
            };
          } while (this.snake.some(s => s.x === this.food.x && s.y === this.food.y));
        }

        render() {
          this.gameArea.removeAllChildren();
          this.snake.forEach((segment, i) => {
            var node = this.createCell(i === 0 ? new Color(78, 205, 196) : new Color(129, 236, 236), segment.x, segment.y);
            this.gameArea.addChild(node);
          });
          var foodNode = this.createCell(new Color(255, 107, 107), this.food.x, this.food.y);
          this.gameArea.addChild(foodNode);
        }

        createCell(color, x, y) {
          var node = new Node('Cell');
          var sprite = node.addComponent(Sprite);
          sprite.color = color;
          var transform = node.addComponent(UITransform);
          transform.width = this.cellSize - 2;
          transform.height = this.cellSize - 2;
          node.position = new Vec3((x - this.gridWidth / 2 + 0.5) * this.cellSize, (y - this.gridHeight / 2 + 0.5) * this.cellSize, 0);
          return node;
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "gameArea", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "uiRoot", [_dec3], {
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
//# sourceMappingURL=ee566c91b45579b8b516f57d1032e9fc2b7d6198.js.map