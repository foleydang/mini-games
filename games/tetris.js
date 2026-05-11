/**
 * 俄罗斯方块 - 鲜明活力风格（优化按钮）
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText,
  Storage, shareGame
} from '../common/utils.js';

export default class TetrisGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    this.cols = 10;
    this.rows = 16;
    this.cellSize = 36;
    this.board = [];
    this.currentPiece = null;
    this.score = 0;
    this.lines = 0;
    this.bestScore = Storage.load('tetris_best') || 0;
    this.gameOver = false;
    this.speed = 380;

    this.shapes = [
      { shape: [[1, 1, 1, 1]], color: 0 },
      { shape: [[1, 1], [1, 1]], color: 1 },
      { shape: [[1, 1, 1], [0, 1, 0]], color: 2 },
      { shape: [[1, 1, 1], [1, 0, 0]], color: 3 },
      { shape: [[1, 1, 1], [0, 0, 1]], color: 4 },
      { shape: [[1, 1, 0], [0, 1, 1]], color: 5 },
      { shape: [[0, 1, 1], [1, 1, 0]], color: 6 }
    ];

    this.touchStartPos = null;
    this.theme = Colors.themes.tetris;

    // 按钮放在标题下方，避开右上角胶囊按钮
    this.backButton = { x: designSize.width - 140, y: designSize.safeTop + 85, width: 120, height: 55 };
    this.shareButton = { x: 20, y: designSize.safeTop + 85, width: 120, height: 55 };

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    const headerHeight = 150; // 增大头部区域容纳按钮
    const footerHeight = 50;
    const availableHeight = height - safeTop - safeBottom - headerHeight - footerHeight;
    const availableWidth = width - 40; // 游戏盘居中，充分利用宽度

    // 让游戏盘尽可能大，填满可用空间
    this.cellSize = Math.min(availableWidth / this.cols, availableHeight / this.rows, 52);

    // 游戏盘居中
    this.gridStartX = (width - this.cols * this.cellSize) / 2;
    this.gridStartY = safeTop + headerHeight;

    this.board = [];
    for (let row = 0; row < this.rows; row++) {
      this.board[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.board[row][col] = -1;
      }
    }

    this.score = 0;
    this.lines = 0;
    this.gameOver = false;
    this.speed = 380;

    this.spawnPiece();
    this.render();
  }

  startLoop() {
    this.timer = setInterval(() => {
      if (!this.gameOver) this.drop();
      this.render();
    }, this.speed);
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }

  spawnPiece() {
    const piece = this.shapes[Math.floor(Math.random() * this.shapes.length)];
    this.currentPiece = {
      shape: piece.shape.map(row => [...row]),
      color: piece.color,
      x: Math.floor(this.cols / 2) - Math.floor(piece.shape[0].length / 2),
      y: 0
    };

    if (this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
      this.gameOver = true;

      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        Storage.save('tetris_best', this.bestScore);
      }

      wx.showModal({
        title: '游戏结束',
        content: `得分: ${this.score}\n消除: ${this.lines}行\n最高: ${this.bestScore}`,
        confirmText: '重试',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) this.initGame();
          else {
            this.destroy();
            this.onEnd(this.score);
          }
        }
      });
    }
  }

  checkCollision(shape, x, y) {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;

          if (newX < 0 || newX >= this.cols || newY >= this.rows) return true;
          if (newY >= 0 && this.board[newY][newX] !== -1) return true;
        }
      }
    }
    return false;
  }

  drop() {
    if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y++;
    } else {
      this.lockPiece();
      this.clearLines();
      this.spawnPiece();
    }
  }

  lockPiece() {
    for (let row = 0; row < this.currentPiece.shape.length; row++) {
      for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
        if (this.currentPiece.shape[row][col]) {
          const y = this.currentPiece.y + row;
          const x = this.currentPiece.x + col;
          if (y >= 0) this.board[y][x] = this.currentPiece.color;
        }
      }
    }
  }

  clearLines() {
    let linesCleared = 0;

    for (let row = this.rows - 1; row >= 0; row--) {
      if (this.board[row].every(cell => cell !== -1)) {
        this.board.splice(row, 1);
        this.board.unshift(Array(this.cols).fill(-1));
        linesCleared++;
        row++;
      }
    }

    if (linesCleared > 0) {
      this.lines += linesCleared;
      this.score += linesCleared * 100 * linesCleared;

      if (this.lines % 5 === 0 && this.speed > 80) {
        this.speed -= 40;
        clearInterval(this.timer);
        this.startLoop();
      }
    }
  }

  move(dx) {
    if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x + dx, this.currentPiece.y)) {
      this.currentPiece.x += dx;
      this.render();
    }
  }

  rotate() {
    const rotated = this.currentPiece.shape[0].map((_, i) =>
      this.currentPiece.shape.map(row => row[i]).reverse()
    );

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
    this.lockPiece();
    this.clearLines();
    this.spawnPiece();
    this.render();
  }

  onTouchStart(pos) {
    if (this.checkButton(pos, this.backButton)) {
      this.destroy();
      this.onEnd(this.score);
      return;
    }

    if (this.checkButton(pos, this.shareButton)) {
      shareGame('方块', this.score);
      return;
    }

    this.touchStartPos = pos;
  }

  onTouchMove(pos) {
    if (!this.touchStartPos || this.gameOver) return;

    const dx = pos.x - this.touchStartPos.x;

    if (Math.abs(dx) > 30) {
      this.move(dx > 0 ? 1 : -1);
      this.touchStartPos = pos;
    }
  }

  onTouchEnd(pos) {
    if (this.touchStartPos) {
      const dx = pos.x - this.touchStartPos.x;
      const dy = pos.y - this.touchStartPos.y;

      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        this.rotate();
      } else if (dy > 60) {
        this.hardDrop();
      }
    }

    this.touchStartPos = null;
  }

  checkButton(pos, btn) {
    return pos.x >= btn.x && pos.x <= btn.x + btn.width &&
           pos.y >= btn.y && pos.y <= btn.y + btn.height;
  }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');

    // 标题 - 稍微上移
    drawText(this.ctx, '方块', width / 2, safeTop + 55, {
      fontSize: 52,
      color: this.theme.primary,
      bold: true
    });

    // 按钮 - 大字体，在标题下方
    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享 ↗', Colors.success, { fontSize: 32, radius: 16 });

    // 游戏区域 - 居中显示
    const gridW = this.cols * this.cellSize;
    const gridH = this.rows * this.cellSize;

    drawRoundRect(this.ctx, this.gridStartX - 14, this.gridStartY - 14, gridW + 28, gridH + 28, 22, '#fff', this.theme.primary, 4);

    // 已固定方块
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.board[row][col] !== -1) {
          this.drawCell(col, row, Colors.tetris[this.board[row][col]]);
        }
      }
    }

    // 当前方块
    if (this.currentPiece) {
      for (let row = 0; row < this.currentPiece.shape.length; row++) {
        for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
          if (this.currentPiece.shape[row][col]) {
            this.drawCell(
              this.currentPiece.x + col,
              this.currentPiece.y + row,
              Colors.tetris[this.currentPiece.color]
            );
          }
        }
      }
    }

    // 分数显示在游戏盘下方
    const scoreY = this.gridStartY + gridH + 35;
    drawText(this.ctx, `得分: ${this.score}  |  消除: ${this.lines}行`, width / 2, scoreY, { fontSize: 32, color: Colors.textDark, bold: true });

    // 底部提示
    drawText(this.ctx, '操控方块消除', width / 2, height - safeBottom - 32, {
      fontSize: 24,
      color: Colors.textMuted
    });

    // 游戏结束
    if (this.gameOver) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.fillRect(0, 0, width, height);

      drawText(this.ctx, '游戏结束', width / 2, height / 2, {
        fontSize: 52,
        color: this.theme.primary,
        bold: true
      });
    }
  }

  drawCell(col, row, color) {
    const x = this.gridStartX + col * this.cellSize + 4;
    const y = this.gridStartY + row * this.cellSize + 4;
    const size = this.cellSize - 8;

    drawRoundRect(this.ctx, x, y, size, size, 6, color);
  }
}