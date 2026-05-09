System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Vec3, UITransform, Sprite, Color, director, _dec, _dec2, _dec3, _class, _class2, _descriptor, _descriptor2, _crd, ccclass, property, TetrisGame;

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

      _cclegacy._RF.push({}, "89141l20+NOSbSDP1J595m3", "TetrisGame", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'Vec3', 'UITransform', 'Sprite', 'Color', 'Label', 'tween', 'Input', 'input', 'EventTouch', 'EventKeyboard', 'KeyCode', 'director']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("TetrisGame", TetrisGame = (_dec = ccclass('TetrisGame'), _dec2 = property(Node), _dec3 = property(Node), _dec(_class = (_class2 = class TetrisGame extends Component {
        constructor(...args) {
          super(...args);

          _initializerDefineProperty(this, "gameArea", _descriptor, this);

          _initializerDefineProperty(this, "uiRoot", _descriptor2, this);

          this.cols = 10;
          this.rows = 20;
          this.cellSize = 25;
          this.board = [];
          this.currentPiece = null;
          this.score = 0;
          this.lines = 0;
          this.gameOver = false;
          this.dropInterval = 0.5;
          this.pieces = [{
            shape: [[1, 1, 1, 1]],
            color: 0
          }, {
            shape: [[1, 1], [1, 1]],
            color: 1
          }, {
            shape: [[1, 1, 1], [0, 1, 0]],
            color: 2
          }, {
            shape: [[1, 1, 1], [1, 0, 0]],
            color: 3
          }, {
            shape: [[1, 1, 1], [0, 0, 1]],
            color: 4
          }, {
            shape: [[1, 1, 0], [0, 1, 1]],
            color: 5
          }, {
            shape: [[0, 1, 1], [1, 1, 0]],
            color: 6
          }];
          this.colors = [new Color(0, 240, 240), new Color(240, 240, 0), new Color(160, 0, 200), new Color(0, 160, 240), new Color(240, 160, 0), new Color(0, 240, 0), new Color(240, 0, 0)];
        }

        start() {
          this.initGame();
          this.schedule(this.drop, this.dropInterval);
        }

        initGame() {
          const visibleSize = this.getVisibleSize();
          this.cellSize = Math.min((visibleSize.width - 40) / this.cols, (visibleSize.height - 200) / this.rows);
          this.board = Array(this.rows).fill(0).map(() => Array(this.cols).fill(-1));
          this.score = 0;
          this.lines = 0;
          this.gameOver = false;
          this.spawnPiece();
          this.render();
        }

        getVisibleSize() {
          const canvas = director.getScene().getChildByName('Canvas');
          return canvas.getComponent(UITransform).contentSize;
        }

        spawnPiece() {
          const piece = this.pieces[Math.floor(Math.random() * this.pieces.length)];
          this.currentPiece = {
            shape: piece.shape.map(row => [...row]),
            x: Math.floor(this.cols / 2) - Math.floor(piece.shape[0].length / 2),
            y: 0,
            color: piece.color
          };

          if (this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
            this.gameOver = true;
          }
        }

        checkCollision(shape, x, y) {
          for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
              if (shape[i][j]) {
                const newX = x + j;
                const newY = y + i;
                if (newX < 0 || newX >= this.cols || newY >= this.rows) return true;
                if (newY >= 0 && this.board[newY][newX] !== -1) return true;
              }
            }
          }

          return false;
        }

        drop() {
          if (this.gameOver) return;

          if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
          } else {
            this.lockPiece();
            this.clearLines();
            this.spawnPiece();
          }

          this.render();
        }

        lockPiece() {
          for (let i = 0; i < this.currentPiece.shape.length; i++) {
            for (let j = 0; j < this.currentPiece.shape[i].length; j++) {
              if (this.currentPiece.shape[i][j]) {
                const y = this.currentPiece.y + i;
                const x = this.currentPiece.x + j;
                if (y >= 0) this.board[y][x] = this.currentPiece.color;
              }
            }
          }
        }

        clearLines() {
          let linesCleared = 0;

          for (let i = this.rows - 1; i >= 0; i--) {
            if (this.board[i].every(cell => cell !== -1)) {
              this.board.splice(i, 1);
              this.board.unshift(Array(this.cols).fill(-1));
              linesCleared++;
              i++;
            }
          }

          if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += linesCleared * 100 * linesCleared;
            this.dropInterval = Math.max(0.1, 0.5 - this.lines * 0.01);
            this.unschedule(this.drop);
            this.schedule(this.drop, this.dropInterval);
          }
        }

        movePiece(dx) {
          if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x + dx, this.currentPiece.y)) {
            this.currentPiece.x += dx;
            this.render();
          }
        }

        rotatePiece() {
          const rotated = this.currentPiece.shape[0].map((_, i) => this.currentPiece.shape.map(row => row[i]).reverse());

          if (!this.checkCollision(rotated, this.currentPiece.x, this.currentPiece.y)) {
            this.currentPiece.shape = rotated;
            this.render();
          }
        }

        hardDrop() {
          while (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
            this.score += 2;
          }

          this.drop();
        }

        render() {
          this.gameArea.removeAllChildren();

          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
              if (this.board[i][j] !== -1) {
                const node = this.createCell(this.colors[this.board[i][j]], j, i);
                this.gameArea.addChild(node);
              }
            }
          }

          if (this.currentPiece) {
            for (let i = 0; i < this.currentPiece.shape.length; i++) {
              for (let j = 0; j < this.currentPiece.shape[i].length; j++) {
                if (this.currentPiece.shape[i][j]) {
                  const node = this.createCell(this.colors[this.currentPiece.color], this.currentPiece.x + j, this.currentPiece.y + i);
                  this.gameArea.addChild(node);
                }
              }
            }
          }
        }

        createCell(color, x, y) {
          const node = new Node('Cell');
          const sprite = node.addComponent(Sprite);
          sprite.color = color;
          const transform = node.addComponent(UITransform);
          transform.width = this.cellSize - 2;
          transform.height = this.cellSize - 2;
          node.position = new Vec3((x - this.cols / 2 + 0.5) * this.cellSize, -(y - this.rows / 2 + 0.5) * this.cellSize, 0);
          return node;
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "gameArea", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "uiRoot", [_dec3], {
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
//# sourceMappingURL=7a526a54ae499e0efb4f16ba94b3fdf1572bc3f7.js.map