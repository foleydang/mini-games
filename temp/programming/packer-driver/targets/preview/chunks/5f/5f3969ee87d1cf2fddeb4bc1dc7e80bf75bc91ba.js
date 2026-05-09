System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Vec3, UITransform, Sprite, Label, tween, Input, COLORS, StorageManager, _dec, _dec2, _dec3, _class, _class2, _descriptor, _descriptor2, _crd, ccclass, property, Match3Game;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }

  function _reportPossibleCrUseOfCOLORS(extras) {
    _reporterNs.report("COLORS", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfStorageManager(extras) {
    _reporterNs.report("StorageManager", "./StorageManager", _context.meta, extras);
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
      Label = _cc.Label;
      tween = _cc.tween;
      Input = _cc.Input;
    }, function (_unresolved_2) {
      COLORS = _unresolved_2.COLORS;
    }, function (_unresolved_3) {
      StorageManager = _unresolved_3.StorageManager;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "c9c38TXpSBNrqdihikOZXj1", "Match3Game", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'Vec3', 'UITransform', 'Sprite', 'Color', 'Label', 'tween', 'Tween', 'Input', 'input', 'EventTouch']);

      ({
        ccclass,
        property
      } = _decorator);
      /**
       * 消消乐游戏组件
       * 支持触摸滑动交换、连消动画、关卡进度
       */

      _export("Match3Game", Match3Game = (_dec = ccclass('Match3Game'), _dec2 = property(Node), _dec3 = property(Node), _dec(_class = (_class2 = class Match3Game extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "gridRoot", _descriptor, this);

          // 格子根节点
          _initializerDefineProperty(this, "uiRoot", _descriptor2, this);

          // UI根节点
          this.gridSize = 6;
          this.cellSize = 50;
          this.gems = [];
          // 格子数据
          this.gemNodes = [];
          // 格子节点
          this.selectedGem = null;
          this.score = 0;
          this.moves = 15;
          this.target = 1000;
          this.colors = 4;
          this.isAnimating = false;
          this.touchStartPos = new Vec3();
          this.touchStartCell = null;
        }

        start() {
          this.initGame();
          this.setupTouchEvents();
        }

        initGame(level) {
          if (level === void 0) {
            level = {
              grid: 6,
              colors: 4,
              moves: 15,
              target: 1000
            };
          }

          this.gridSize = level.grid;
          this.colors = level.colors;
          this.moves = level.moves;
          this.target = level.target;
          this.score = 0;
          this.selectedGem = null;
          this.isAnimating = false; // 计算格子大小

          var visibleSize = this.getVisibleSize();
          this.cellSize = Math.min((visibleSize.width - 40) / this.gridSize, (visibleSize.height - 200) / this.gridSize, 55); // 初始化格子数据

          this.gems = [];
          this.gemNodes = [];

          for (var row = 0; row < this.gridSize; row++) {
            this.gems[row] = [];
            this.gemNodes[row] = [];

            for (var col = 0; col < this.gridSize; col++) {
              this.gems[row][col] = Math.floor(Math.random() * (this.colors - 0)) + 0;
            }
          } // 清除初始匹配


          while (this.findMatches().length > 0) {
            this.clearMatches();
            this.fillGems();
          } // 创建格子节点


          this.createGridNodes();
          this.updateUI();
        }

        getVisibleSize() {
          // 获取可视区域大小
          return {
            width: 360,
            height: 640
          };
        }

        createGridNodes() {
          this.gridRoot.removeAllChildren();
          var startX = -(this.gridSize * this.cellSize) / 2 + this.cellSize / 2;
          var startY = -(this.gridSize * this.cellSize) / 2 + this.cellSize / 2;

          for (var row = 0; row < this.gridSize; row++) {
            for (var col = 0; col < this.gridSize; col++) {
              var gemNode = this.createGemNode(row, col);
              gemNode.setPosition(new Vec3(startX + col * this.cellSize, startY + row * this.cellSize, 0));
              this.gridRoot.addChild(gemNode);
              this.gemNodes[row][col] = gemNode;
            }
          }
        }

        createGemNode(row, col) {
          var node = new Node('gem_' + row + '_' + col);
          node.addComponent(UITransform).setContentSize(this.cellSize - 6, this.cellSize - 6);
          var sprite = node.addComponent(Sprite);
          sprite.color = (_crd && COLORS === void 0 ? (_reportPossibleCrUseOfCOLORS({
            error: Error()
          }), COLORS) : COLORS).gems[this.gems[row][col]]; // 存储格子信息

          node['gemRow'] = row;
          node['gemCol'] = col;
          return node;
        }

        setupTouchEvents() {
          this.gridRoot.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
          this.gridRoot.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
          this.gridRoot.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        }

        onTouchStart(event) {
          if (this.isAnimating) return;
          var pos = event.getUILocation();
          var localPos = this.gridRoot.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(pos.x, pos.y, 0));
          if (!localPos) return;
          var cell = this.getCellFromPosition(localPos);

          if (cell) {
            this.touchStartPos = localPos;
            this.touchStartCell = cell;
            this.selectGem(cell.row, cell.col);
          }
        }

        onTouchMove(event) {
          if (this.isAnimating || !this.selectedGem || !this.touchStartCell) return;
          var pos = event.getUILocation();
          var localPos = this.gridRoot.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(pos.x, pos.y, 0));
          if (!localPos) return;
          var dx = localPos.x - this.touchStartPos.x;
          var dy = localPos.y - this.touchStartPos.y; // 滑动距离足够大时触发交换

          if (Math.abs(dx) > this.cellSize * 0.3 || Math.abs(dy) > this.cellSize * 0.3) {
            var targetRow = this.selectedGem.row;
            var targetCol = this.selectedGem.col;

            if (Math.abs(dx) > Math.abs(dy)) {
              targetCol += dx > 0 ? 1 : -1;
            } else {
              targetRow += dy > 0 ? 1 : -1;
            }

            if (this.isValidCell(targetRow, targetCol)) {
              this.trySwap(this.selectedGem.row, this.selectedGem.col, targetRow, targetCol);
              this.selectedGem = null;
              this.touchStartCell = null;
            }
          }
        }

        onTouchEnd(event) {
          if (this.isAnimating) return; // 如果没有滑动，检查是否点击了相邻格

          if (this.selectedGem && this.touchStartCell) {
            var pos = event.getUILocation();
            var localPos = this.gridRoot.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(pos.x, pos.y, 0));

            if (localPos) {
              var cell = this.getCellFromPosition(localPos);

              if (cell && (cell.row !== this.selectedGem.row || cell.col !== this.selectedGem.col)) {
                var dr = Math.abs(cell.row - this.selectedGem.row);
                var dc = Math.abs(cell.col - this.selectedGem.col);

                if (dr === 1 && dc === 0 || dr === 0 && dc === 1) {
                  this.trySwap(this.selectedGem.row, this.selectedGem.col, cell.row, cell.col);
                  this.selectedGem = null;
                }
              }
            }
          }

          this.touchStartCell = null;
        }

        getCellFromPosition(pos) {
          var startX = -(this.gridSize * this.cellSize) / 2;
          var startY = -(this.gridSize * this.cellSize) / 2;
          var col = Math.floor((pos.x - startX) / this.cellSize);
          var row = Math.floor((pos.y - startY) / this.cellSize);

          if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
            return {
              row,
              col
            };
          }

          return null;
        }

        isValidCell(row, col) {
          return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
        }

        selectGem(row, col) {
          // 清除之前的选中状态
          if (this.selectedGem) {
            this.updateGemAppearance(this.selectedGem.row, this.selectedGem.col, false);
          } // 如果点击的是同一个格子，取消选中


          if (this.selectedGem && this.selectedGem.row === row && this.selectedGem.col === col) {
            this.selectedGem = null;
            return;
          } // 选中新格子


          this.selectedGem = {
            row,
            col
          };
          this.updateGemAppearance(row, col, true);
        }

        updateGemAppearance(row, col, selected) {
          var node = this.gemNodes[row][col];

          if (node) {
            var scale = selected ? 1.2 : 1;
            tween(node).to(0.1, {
              scale: new Vec3(scale, scale, 1)
            }).start();
          }
        }

        trySwap(r1, c1, r2, c2) {
          this.isAnimating = true; // 交换数据

          var temp = this.gems[r1][c1];
          this.gems[r1][c1] = this.gems[r2][c2];
          this.gems[r2][c2] = temp; // 交换节点（动画）

          this.swapGemNodes(r1, c1, r2, c2, () => {
            this.moves--;
            var matches = this.findMatches();

            if (matches.length > 0) {
              this.processMatches(() => {
                this.isAnimating = false;
                this.updateUI();
                this.checkGameEnd();
              });
            } else {
              // 无效交换，换回来
              this.gems[r2][c2] = this.gems[r1][c1];
              this.gems[r1][c1] = temp;
              this.swapGemNodes(r1, c1, r2, c2, () => {
                this.moves++;
                this.isAnimating = false;
              });
            }
          });
        }

        swapGemNodes(r1, c1, r2, c2, callback) {
          var node1 = this.gemNodes[r1][c1];
          var node2 = this.gemNodes[r2][c2];
          var pos1 = node1.getPosition();
          var pos2 = node2.getPosition();
          tween(node1).to(0.15, {
            position: pos2
          }).start();
          tween(node2).to(0.15, {
            position: pos1
          }).call(callback).start(); // 更新节点引用

          this.gemNodes[r1][c1] = node2;
          this.gemNodes[r2][c2] = node1;
          node2['gemRow'] = r1;
          node2['gemCol'] = c1;
          node1['gemRow'] = r2;
          node1['gemCol'] = c2;
        }

        findMatches() {
          var matches = []; // 横向检查

          for (var row = 0; row < this.gridSize; row++) {
            for (var col = 0; col < this.gridSize - 2; col++) {
              if (this.gems[row][col] === this.gems[row][col + 1] && this.gems[row][col] === this.gems[row][col + 2]) {
                matches.push({
                  row,
                  col,
                  direction: 'horizontal'
                });
              }
            }
          } // 纵向检查


          for (var _row = 0; _row < this.gridSize - 2; _row++) {
            for (var _col = 0; _col < this.gridSize; _col++) {
              if (this.gems[_row][_col] === this.gems[_row + 1][_col] && this.gems[_row][_col] === this.gems[_row + 2][_col]) {
                matches.push({
                  row: _row,
                  col: _col,
                  direction: 'vertical'
                });
              }
            }
          }

          return matches;
        }

        processMatches(callback) {
          var matches = this.findMatches();
          var toRemove = new Set();
          matches.forEach(match => {
            if (match.direction === 'horizontal') {
              for (var i = 0; i < 3; i++) {
                toRemove.add(match.row + ',' + (match.col + i));
              }
            } else {
              for (var _i = 0; _i < 3; _i++) {
                toRemove.add(match.row + _i + ',' + match.col);
              }
            }
          });
          this.score += toRemove.size * 10; // 删除动画

          var removePromises = [];
          toRemove.forEach(key => {
            var [row, col] = key.split(',').map(Number);
            removePromises.push(this.removeGemAnimation(row, col));
          });
          Promise.all(removePromises).then(() => {
            // 清除数据
            toRemove.forEach(key => {
              var [row, col] = key.split(',').map(Number);
              this.gems[row][col] = -1;
            }); // 下落填充

            this.dropGemsAnimation(() => {
              this.fillGemsAnimation(() => {
                // 检查连消
                if (this.findMatches().length > 0) {
                  this.processMatches(callback);
                } else {
                  callback();
                }
              });
            });
          });
        }

        removeGemAnimation(row, col) {
          return new Promise(resolve => {
            var node = this.gemNodes[row][col];

            if (node) {
              tween(node).to(0.2, {
                scale: new Vec3(0, 0, 0)
              }).call(() => {
                node.destroy();
                resolve();
              }).start();
            } else {
              resolve();
            }
          });
        }

        dropGemsAnimation(callback) {
          // 让上面的宝石下落
          for (var col = 0; col < this.gridSize; col++) {
            var emptyRow = this.gridSize - 1;

            for (var row = this.gridSize - 1; row >= 0; row--) {
              if (this.gems[row][col] >= 0) {
                if (row !== emptyRow) {
                  this.gems[emptyRow][col] = this.gems[row][col];
                  this.gems[row][col] = -1; // 移动节点

                  var node = this.gemNodes[row][col];

                  if (node) {
                    var startY = -(this.gridSize * this.cellSize) / 2 + emptyRow * this.cellSize + this.cellSize / 2;
                    tween(node).to(0.2, {
                      position: new Vec3(node.getPosition().x, startY, 0)
                    }).start();
                    this.gemNodes[emptyRow][col] = node;
                    node['gemRow'] = emptyRow;
                  }
                }

                emptyRow--;
              }
            }
          }

          setTimeout(callback, 250);
        }

        fillGemsAnimation(callback) {
          var startX = -(this.gridSize * this.cellSize) / 2 + this.cellSize / 2;
          var startY = -(this.gridSize * this.cellSize) / 2 + this.cellSize / 2;

          for (var col = 0; col < this.gridSize; col++) {
            for (var row = 0; row < this.gridSize; row++) {
              if (this.gems[row][col] === -1) {
                this.gems[row][col] = Math.floor(Math.random() * (this.colors - 0)) + 0;
                var gemNode = this.createGemNode(row, col);
                gemNode.setPosition(new Vec3(startX + col * this.cellSize, startY + row * this.cellSize + 100, 0));
                gemNode.scale = new Vec3(0, 0, 0);
                this.gridRoot.addChild(gemNode);
                this.gemNodes[row][col] = gemNode;
                tween(gemNode).to(0.2, {
                  position: new Vec3(startX + col * this.cellSize, startY + row * this.cellSize, 0)
                }).to(0.1, {
                  scale: new Vec3(1, 1, 1)
                }).start();
              }
            }
          }

          setTimeout(callback, 350);
        }

        clearMatches() {
          var matches = this.findMatches();
          matches.forEach(match => {
            if (match.direction === 'horizontal') {
              for (var i = 0; i < 3; i++) this.gems[match.row][match.col + i] = -1;
            } else {
              for (var _i2 = 0; _i2 < 3; _i2++) this.gems[match.row + _i2][match.col] = -1;
            }
          });
        }

        fillGems() {
          for (var col = 0; col < this.gridSize; col++) {
            var emptyRow = this.gridSize - 1;

            for (var row = this.gridSize - 1; row >= 0; row--) {
              if (this.gems[row][col] >= 0) {
                if (row !== emptyRow) {
                  this.gems[emptyRow][col] = this.gems[row][col];
                  this.gems[row][col] = -1;
                }

                emptyRow--;
              }
            }

            for (var _row2 = emptyRow; _row2 >= 0; _row2--) {
              this.gems[_row2][col] = Math.floor(Math.random() * (this.colors - 0)) + 0;
            }
          }
        }

        updateUI() {
          // 更新分数、步数显示
          if (this.uiRoot) {
            // 更新分数Label
            var scoreLabel = this.uiRoot.getChildByName('scoreLabel');

            if (scoreLabel) {
              scoreLabel.getComponent(Label).string = '得分: ' + this.score;
            } // 更新步数Label


            var movesLabel = this.uiRoot.getChildByName('movesLabel');

            if (movesLabel) {
              movesLabel.getComponent(Label).string = '步数: ' + this.moves;
            } // 更新进度条


            var progress = Math.min(this.score / this.target, 1); // 进度条动画...
          }
        }

        checkGameEnd() {
          if (this.score >= this.target) {
            this.onWin();
          } else if (this.moves <= 0) {
            this.onLose();
          }
        }

        onWin() {
          (_crd && StorageManager === void 0 ? (_reportPossibleCrUseOfStorageManager({
            error: Error()
          }), StorageManager) : StorageManager).updateHighScore('match3', this.score); // 显示胜利界面

          console.log('游戏胜利！得分:', this.score);
        }

        onLose() {
          // 显示失败界面
          console.log('游戏失败');
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "gridRoot", [_dec2], {
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
//# sourceMappingURL=5f3969ee87d1cf2fddeb4bc1dc7e80bf75bc91ba.js.map