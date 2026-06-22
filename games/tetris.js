/**
 * 方块大作战 - 无限型游戏（里程碑成就系统）
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, Storage, shareGame
} from '../common/utils.js';
import { Milestones } from '../common/config.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';
import { getBackButton, getShareButton, getSoundButton } from '../common/ui.js';

export default class TetrisGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    const config = Milestones.tetris;
    this.targets = config.targets;
    this.milestoneNames = config.names;
    this.speedStart = config.speedStart;
    this.speedMin = config.speedMin;
    this.speedDecPerLines = config.speedDecPerLines;

    this.cols = 10;
    this.rows = 16;
    this.cellSize = 36;
    this.board = [];
    this.currentPiece = null;
    this.score = 0;
    this.lines = 0;
    this.bestScore = Storage.load('tetris_best') || 0;
    this.bestLines = Storage.load('tetris_best_lines') || 0;
    this.gameOver = false;
    this.speed = this.speedStart;
    this.achievedMilestone = -1;

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
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    const headerHeight = 280;
    const footerHeight = 50;
    const availableHeight = height - safeTop - safeBottom - headerHeight - footerHeight;
    const availableWidth = width - 40;
    this.cellSize = Math.min(availableWidth / this.cols, availableHeight / this.rows, 52);
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
    this.speed = this.speedStart;
    this.achievedMilestone = -1;

    this.spawnPiece();
    this.render();
  }

  startLoop() {
    this.timer = setInterval(() => {
      if (!this.gameOver) this.drop();
      this.render();
    }, this.speed);
  }

  destroy() { if (this.timer) clearInterval(this.timer); }

  getCurrentMilestone() {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      if (this.lines >= this.targets[i]) return i;
    }
    return -1;
  }

  getNextMilestone() {
    const current = this.getCurrentMilestone();
    if (current < this.targets.length - 1) {
      return { target: this.targets[current + 1], name: this.milestoneNames[current + 1] };
    }
    return null;
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
      playSound(SoundType.GAME_OVER);

      if (this.score > this.bestScore) { this.bestScore = this.score; Storage.save('tetris_best', this.bestScore); }
      if (this.lines > this.bestLines) { this.bestLines = this.lines; Storage.save('tetris_best_lines', this.bestLines); }

      const milestone = this.getCurrentMilestone();
      wx.showModal({
        title: milestone >= 0 ? `🎉 ${this.milestoneNames[milestone]}` : '游戏结束',
        content: `消除: ${this.lines}行\n得分: ${this.score}\n最高行数: ${this.bestLines}`,
        confirmText: '重试',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) { this.destroy(); this.initGame(); this.startLoop(); }
          else { this.destroy(); this.onEnd(this.score); }
        }
      });
    }
  }

  checkCollision(shape, x, y) {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col, newY = y + row;
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
      playSound(SoundType.DROP);
      this.lockPiece();
      this.clearLines();
      this.spawnPiece();
    }
  }

  lockPiece() {
    for (let row = 0; row < this.currentPiece.shape.length; row++) {
      for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
        if (this.currentPiece.shape[row][col]) {
          const y = this.currentPiece.y + row, x = this.currentPiece.x + col;
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
      playSound(SoundType.CLEAR);
      this.lines += linesCleared;
      this.score += linesCleared * 100 * linesCleared;

      const newMilestone = this.getCurrentMilestone();
      if (newMilestone > this.achievedMilestone) {
        this.achievedMilestone = newMilestone;
        playSound(SoundType.LEVEL_UP);
      }

      const targetSpeed = Math.max(this.speedMin, this.speedStart - Math.floor(this.lines / this.speedDecPerLines) * 40);
      if (targetSpeed < this.speed) {
        this.speed = targetSpeed;
        clearInterval(this.timer);
        this.startLoop();
      }
    }
  }

  move(dx) {
    if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x + dx, this.currentPiece.y)) {
      playSound(SoundType.MOVE);
      this.currentPiece.x += dx;
      this.render();
    }
  }

  rotate() {
    const rotated = this.currentPiece.shape[0].map((_, i) => this.currentPiece.shape.map(row => row[i]).reverse());
    if (!this.checkCollision(rotated, this.currentPiece.x, this.currentPiece.y)) {
      playSound(SoundType.MOVE);
      this.currentPiece.shape = rotated;
      this.render();
    }
  }

  hardDrop() {
    while (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y++;
      this.score += 2;
    }
    playSound(SoundType.DROP);
    this.lockPiece();
    this.clearLines();
    this.spawnPiece();
    this.render();
  }

  checkButton(pos, btn) { return pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height; }

  onTouchStart(pos) {
    if (this.checkButton(pos, this.backButton)) { playSound(SoundType.CLICK); this.destroy(); this.onEnd(this.score); return; }
    if (this.checkButton(pos, this.shareButton)) { playSound(SoundType.SUCCESS); shareGame('方块大作战', this.score); return; }
    if (this.checkButton(pos, this.soundButton)) { audioManager.toggle(); this.render(); return; }
    this.touchStartPos = pos;
  }

  onTouchMove(pos) {
    if (!this.touchStartPos || this.gameOver) return;
    const dx = pos.x - this.touchStartPos.x;
    if (Math.abs(dx) > 30) { this.move(dx > 0 ? 1 : -1); this.touchStartPos = pos; }
  }

  onTouchEnd(pos) {
    if (this.touchStartPos) {
      const dx = pos.x - this.touchStartPos.x, dy = pos.y - this.touchStartPos.y;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) this.rotate();
      else if (dy > 60) this.hardDrop();
    }
    this.touchStartPos = null;
  }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');

    drawText(this.ctx, '方块大作战', width / 2, safeTop + 55, { fontSize: 52, color: this.theme.primary, bold: true });

    // 分数和里程碑 - 分行显示，避免重叠
    const milestone = this.getCurrentMilestone();
    if (milestone >= 0) drawText(this.ctx, `🏆 ${this.milestoneNames[milestone]}`, width / 2 - 100, safeTop + 105, { fontSize: 24, color: Colors.warning, bold: true });
    
    drawText(this.ctx, `得分: ${this.score}`, width / 2 + 100, safeTop + 105, { fontSize: 28, color: Colors.textDark, bold: true });
    drawText(this.ctx, `消除: ${this.lines}行`, width / 2 + 100, safeTop + 145, { fontSize: 24, color: Colors.textLight });
    const next = this.getNextMilestone();
    if (next) drawText(this.ctx, `→${next.target}行`, width / 2 + 200, safeTop + 145, { fontSize: 20, color: Colors.textMuted });

    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享', Colors.success, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.soundButton.x, this.soundButton.y, this.soundButton.width, this.soundButton.height, audioManager.enabled ? '🔊' : '🔇', Colors.info, { fontSize: 32, radius: 16 });

    const gridW = this.cols * this.cellSize, gridH = this.rows * this.cellSize;
    drawRoundRect(this.ctx, this.gridStartX - 14, this.gridStartY - 14, gridW + 28, gridH + 28, 22, '#fff', this.theme.primary, 4);

    // 已放置的方块 - 带光泽效果
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.board[row][col] !== -1) this.drawCell(col, row, Colors.tetris[this.board[row][col]]);
      }
    }

    // 当前方块 + 投影（半透明预判落点）
    if (this.currentPiece) {
      // 投影
      let ghostY = this.currentPiece.y;
      while (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, ghostY + 1)) ghostY++;
      if (ghostY > this.currentPiece.y) {
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
          for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
            if (this.currentPiece.shape[row][col]) {
              const x = this.gridStartX + (this.currentPiece.x + col) * this.cellSize + 4;
              const y = this.gridStartY + (ghostY + row) * this.cellSize + 4;
              const size = this.cellSize - 8;
              this.ctx.globalAlpha = 0.2;
              drawRoundRect(this.ctx, x, y, size, size, 6, Colors.tetris[this.currentPiece.color]);
              this.ctx.globalAlpha = 1;
            }
          }
        }
      }
      // 当前方块
      for (let row = 0; row < this.currentPiece.shape.length; row++) {
        for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
          if (this.currentPiece.shape[row][col]) {
            this.drawCell(this.currentPiece.x + col, this.currentPiece.y + row, Colors.tetris[this.currentPiece.color]);
          }
        }
      }
    }

    let hint = '滑动移动 | 点击旋转 ';
    for (let i = 0; i < this.targets.length; i++) {
      hint += this.lines >= this.targets[i] ? '✓' : ` →${this.targets[i]}`;
      if (this.lines < this.targets[i]) break;
    }
    drawText(this.ctx, hint, width / 2, height - safeBottom - 32, { fontSize: 22, color: Colors.textMuted });
  }

  drawCell(col, row, color) {
    const x = this.gridStartX + col * this.cellSize + 4;
    const y = this.gridStartY + row * this.cellSize + 4;
    const size = this.cellSize - 8;
    drawRoundRect(this.ctx, x, y, size, size, 6, color);
    // 高光效果
    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.ctx.fillRect(x, y, size, size * 0.4);
  }
}
