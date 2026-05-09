System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, Input, director, _dec, _dec2, _dec3, _class, _class2, _descriptor, _descriptor2, _crd, ccclass, property, Game2048;

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
      Label = _cc.Label;
      Input = _cc.Input;
      director = _cc.director;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "fb5c9mL5B5Ji5ruFKXfP278", "Game2048", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'Vec3', 'UITransform', 'Sprite', 'Color', 'Label', 'tween', 'Input', 'input', 'EventTouch', 'director']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("Game2048", Game2048 = (_dec = ccclass('Game2048'), _dec2 = property(Node), _dec3 = property(Node), _dec(_class = (_class2 = class Game2048 extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "gameArea", _descriptor, this);

          _initializerDefineProperty(this, "uiRoot", _descriptor2, this);

          this.gridSize = 4;
          this.cellSize = 80;
          this.board = [];
          this.score = 0;
          this.bestScore = 0;
          this.touchStartPos = new Vec3();
        }

        start() {
          this.initGame();
          this.setupInput();
        }

        initGame() {
          var visibleSize = this.getVisibleSize();
          this.cellSize = Math.min((visibleSize.width - 60) / this.gridSize, 80);
          this.board = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0));
          this.score = 0;
          this.addRandomTile();
          this.addRandomTile();
          this.render();
        }

        getVisibleSize() {
          var canvas = director.getScene().getChildByName('Canvas');
          return canvas.getComponent(UITransform).contentSize;
        }

        setupInput() {
          this.node.on(Input.EventType.TOUCH_START, e => {
            this.touchStartPos = new Vec3(e.touch.getLocationX(), e.touch.getLocationY(), 0);
          });
          this.node.on(Input.EventType.TOUCH_END, e => {
            var endPos = new Vec3(e.touch.getLocationX(), e.touch.getLocationY(), 0);
            var dx = endPos.x - this.touchStartPos.x;
            var dy = endPos.y - this.touchStartPos.y;

            if (Math.abs(dx) > Math.abs(dy)) {
              if (dx > 30) this.move(1, 0);else if (dx < -30) this.move(-1, 0);
            } else {
              if (dy > 30) this.move(0, 1);else if (dy < -30) this.move(0, -1);
            }
          });
        }

        move(dx, dy) {
          var newBoard = this.board.map(row => [...row]);
          var moved = false;

          for (var i = 0; i < this.gridSize; i++) {
            var line = [];

            for (var j = 0; j < this.gridSize; j++) {
              var x = dx === 1 ? this.gridSize - 1 - j : j;
              var y = dy === 1 ? this.gridSize - 1 - j : j;
              var val = dx !== 0 ? newBoard[i][x] : newBoard[y][i];
              if (val !== 0) line.push(val);
            }

            var merged = [];

            for (var k = 0; k < line.length; k++) {
              if (k < line.length - 1 && line[k] === line[k + 1]) {
                merged.push(line[k] * 2);
                this.score += line[k] * 2;
                k++;
                moved = true;
              } else {
                merged.push(line[k]);
              }
            }

            while (merged.length < this.gridSize) {
              if (dx === 1 || dy === 1) merged.unshift(0);else merged.push(0);
            }

            for (var _j = 0; _j < this.gridSize; _j++) {
              var _x = dx === 1 ? this.gridSize - 1 - _j : _j;

              var _y = dy === 1 ? this.gridSize - 1 - _j : _j;

              var newVal = dx !== 0 ? merged[_j] : merged[_j];
              if (dx !== 0) newBoard[i][_x] = newVal;else newBoard[_y][i] = newVal;
            }
          }

          if (moved || JSON.stringify(newBoard) !== JSON.stringify(this.board)) {
            this.board = newBoard;
            this.addRandomTile();
            this.render();
          }
        }

        addRandomTile() {
          var empty = [];

          for (var i = 0; i < this.gridSize; i++) {
            for (var j = 0; j < this.gridSize; j++) {
              if (this.board[i][j] === 0) empty.push([i, j]);
            }
          }

          if (empty.length > 0) {
            var [_i, _j2] = empty[Math.floor(Math.random() * empty.length)];
            this.board[_i][_j2] = Math.random() < 0.9 ? 2 : 4;
          }
        }

        render() {
          this.gameArea.removeAllChildren();

          for (var i = 0; i < this.gridSize; i++) {
            for (var j = 0; j < this.gridSize; j++) {
              var value = this.board[i][j];
              var node = this.createCell(value, j, i);
              this.gameArea.addChild(node);
            }
          }
        }

        createCell(value, x, y) {
          var node = new Node('Cell');
          var sprite = node.addComponent(Sprite);
          sprite.color = this.getColor(value);
          var transform = node.addComponent(UITransform);
          transform.width = this.cellSize - 8;
          transform.height = this.cellSize - 8;
          node.position = new Vec3((x - this.gridSize / 2 + 0.5) * this.cellSize, (y - this.gridSize / 2 + 0.5) * this.cellSize, 0);

          if (value > 0) {
            var label = node.addComponent(Label);
            label.string = value.toString();
            label.fontSize = value > 100 ? 32 : 40;
            label.color = value > 4 ? Color.WHITE : new Color(119, 110, 101);
          }

          return node;
        }

        getColor(value) {
          var colors = {
            0: new Color(205, 193, 180),
            2: new Color(238, 228, 218),
            4: new Color(237, 224, 200),
            8: new Color(242, 177, 121),
            16: new Color(245, 149, 99),
            32: new Color(246, 124, 95),
            64: new Color(246, 94, 59),
            128: new Color(237, 207, 114),
            256: new Color(237, 204, 97),
            512: new Color(237, 200, 80),
            1024: new Color(237, 197, 63),
            2048: new Color(237, 194, 46)
          };
          return colors[value] || new Color(60, 58, 50);
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
//# sourceMappingURL=9a4c6ac66e1fa734605e3c1ab3f6abff8101c93a.js.map