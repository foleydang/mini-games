/**
 * 2048 - 无限型游戏（目标块里程碑系统）
 * - 单局无限游戏，合并到无法移动为止
 * - 达到目标块（512/1024/2048/4096/8192）显示成就
 * - 可以继续挑战更高块
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, Storage, shareGame
} from '../common/utils.js';
import { Milestones } from '../common/config.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';
import { getBackButton, getShareButton, getSoundButton } from '../common/ui.js';

export default class Game2048 {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    // 里程碑配置
    const config = Milestones['2048'];
    this.targets = config.targets;       // [512, 1024, 2048, 4096, 8192]
    this.milestoneNames = config.names;  // ['入门', '挑战', '大师', '传奇', '神级']

    this.gridSize = 4;
    this.cellSize = 130;
    this.grid = [];
    this.score = 0;
    this.bestScore = Storage.load('2048_best') || 0;
    this.bestBlock = Storage.load('2048_best_block') || 0;
    this.gameOver = false;
    this.maxBlock = 0;  // 当前最大块
    this.achievedMilestone = -1;
    this.touchStartPos = null;

    this.theme = Colors.themes['2048'];
    this.backButton = { x: 20, y: designSize.safeTop + 100, width: 100, height: 42 }; // y在render中动态计算;
    this.shareButton = { x: 130, y: designSize.safeTop + 100, width: 100, height: 42 };
    this.soundButton = { x: designSize.width - 120, y: designSize.safeTop + 100, width: 100, height: 42 };

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    const headerHeight = 80;
    const footerHeight = 75;
    const availableHeight = height - safeTop - safeBottom - headerHeight - footerHeight;
    const availableWidth = width - 50;
    this.cellSize = Math.min(availableWidth / this.gridSize, availableHeight / this.gridSize, 180);
    this.gridStartX = (width - this.gridSize * this.cellSize) / 2;
    this.gridStartY = safeTop + 160;

    this.grid = [];
    for (let i = 0; i < this.gridSize; i++) {
      this.grid[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        this.grid[i][j] = 0;
      }
    }

    this.score = 0;
    this.gameOver = false;
    this.maxBlock = 0;
    this.achievedMilestone = -1;

    this.addRandomTile();
    this.addRandomTile();
    this.render();
  }

  startLoop() {
    this.timer = setInterval(() => { this.render(); }, 50);
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }

  addRandomTile() {
    const empty = [];
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.grid[i][j] === 0) empty.push({ row: i, col: j });
      }
    }
    if (empty.length > 0) {
      const pos = empty[Math.floor(Math.random() * empty.length)];
      this.grid[pos.row][pos.col] = Math.random() < 0.9 ? 2 : 4;
      this.maxBlock = Math.max(this.maxBlock, this.grid[pos.row][pos.col]);
    }
  }

  getCurrentMilestone() {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      if (this.maxBlock >= this.targets[i]) return i;
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

  checkButton(pos, btn) {
    return pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height;
  }

  onTouchStart(pos) {
    if (this.checkButton(pos, this.backButton)) {
      playSound(SoundType.CLICK);
      this.destroy();
      this.onEnd(this.score);
      return;
    }
    if (this.checkButton(pos, this.shareButton)) {
      playSound(SoundType.SUCCESS);
      shareGame('2048', this.score);
      return;
    }
    if (this.checkButton(pos, this.soundButton)) {
      audioManager.toggle();
      this.render();
      return;
    }
    this.touchStartPos = pos;
  }

  onTouchMove(pos) {}

  onTouchEnd(pos) {
    if (!this.touchStartPos || this.gameOver) return;
    const dx = pos.x - this.touchStartPos.x;
    const dy = pos.y - this.touchStartPos.y;

    if (Math.abs(dx) > 60 || Math.abs(dy) > 60) {
      playSound(SoundType.MOVE);
      let moved = false;
      if (Math.abs(dx) > Math.abs(dy)) {
        moved = this.move(dx > 0 ? 1 : -1, 0);
      } else {
        moved = this.move(0, dy > 0 ? 1 : -1);
      }
      if (moved) {
        this.addRandomTile();
        this.checkGameState();
      }
      this.touchStartPos = null;
      this.render();
    }
  }

  move(dx, dy) {
    let moved = false;
    const merged = new Set();
    const rows = dy === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const cols = dx === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];

    for (const row of rows) {
      for (const col of cols) {
        if (this.grid[row][col] === 0) continue;
        let newRow = row, newCol = col;
        while (true) {
          const nextRow = newRow + dy;
          const nextCol = newCol + dx;
          if (nextRow < 0 || nextRow >= this.gridSize || nextCol < 0 || nextCol >= this.gridSize) break;
          if (this.grid[nextRow][nextCol] === 0) {
            newRow = nextRow;
            newCol = nextCol;
          } else if (this.grid[nextRow][nextCol] === this.grid[row][col] && !merged.has(`${nextRow},${nextCol}`)) {
            newRow = nextRow;
            newCol = nextCol;
            this.grid[newRow][newCol] *= 2;
            this.score += this.grid[newRow][newCol];
            this.maxBlock = Math.max(this.maxBlock, this.grid[newRow][newCol]);
            
            // 检查里程碑
            const newMilestone = this.getCurrentMilestone();
            if (newMilestone > this.achievedMilestone) {
              this.achievedMilestone = newMilestone;
              playSound(SoundType.LEVEL_UP);
            } else {
              playSound(SoundType.SUCCESS);
            }
            
            merged.add(`${newRow},${newCol}`);
            this.grid[row][col] = 0;
            moved = true;
            break;
          } else {
            break;
          }
        }
        if ((newRow !== row || newCol !== col) && this.grid[row][col] !== 0) {
          this.grid[newRow][newCol] = this.grid[row][col];
          this.grid[row][col] = 0;
          moved = true;
        }
      }
    }
    return moved;
  }

  checkGameState() {
    // 检查是否游戏结束
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.grid[i][j] === 0) return;
      }
    }
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const val = this.grid[i][j];
        if (i < this.gridSize - 1 && this.grid[i + 1][j] === val) return;
        if (j < this.gridSize - 1 && this.grid[i][j + 1] === val) return;
      }
    }

    this.gameOver = true;
    playSound(SoundType.GAME_OVER);

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      Storage.save('2048_best', this.bestScore);
    }
    if (this.maxBlock > this.bestBlock) {
      this.bestBlock = this.maxBlock;
      Storage.save('2048_best_block', this.bestBlock);
    }

    const milestone = this.getCurrentMilestone();
    const milestoneText = milestone >= 0 ? `\n成就: ${this.milestoneNames[milestone]}` : '';
    const blockText = milestone >= 0 ? `${this.targets[milestone]}` : '未达成目标';

    wx.showModal({
      title: milestone >= 0 ? `🎉 ${this.milestoneNames[milestone]}` : '游戏结束',
      content: `最高块: ${this.maxBlock}${milestoneText}\n得分: ${this.score}\n历史最高块: ${this.bestBlock}`,
      confirmText: '重试',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          this.destroy();
          this.initGame();
          this.startLoop();
        } else {
          this.destroy();
          this.onEnd(this.score);
        }
      }
    });
  }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');
    // 底部按钮在后面统一绘制

    // 标题
    drawText(this.ctx, '2048', width / 2, safeTop + 50, { fontSize: 52, color: this.theme.primary, bold: true });

    // 当前最高块 + 成就
    const milestone = this.getCurrentMilestone();
    if (milestone >= 0) {
      drawText(this.ctx, this.milestoneNames[milestone], width / 2 - 120, safeTop + 50, { fontSize: 22, color: Colors.warning });
    }

    // 分数 + 下一个目标
    drawText(this.ctx, `${this.score}`, width / 2 + 120, safeTop + 50, { fontSize: 34, color: Colors.textDark, bold: true });
    const next = this.getNextMilestone();
    if (next) {
      drawText(this.ctx, `→${next.target}`, width / 2 + 180, safeTop + 50, { fontSize: 20, color: Colors.textLight });
    }

    // 按钮
    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享 ↗', Colors.success, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.soundButton.x, this.soundButton.y, this.soundButton.width, this.soundButton.height, audioManager.enabled ? '🔊' : '🔇', Colors.info, { fontSize: 32, radius: 16 });

    // 网格
    const gridW = this.gridSize * this.cellSize;
    const gridH = this.gridSize * this.cellSize;
    drawRoundRect(this.ctx, this.gridStartX - 16, this.gridStartY - 16, gridW + 32, gridH + 32, 26, '#fff', this.theme.primary, 4);

    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        this.drawCell(i, j);
      }
    }

    // 底部提示
    let hint = '滑动合并数字 ';
    for (let i = 0; i < this.targets.length; i++) {
      if (this.maxBlock >= this.targets[i]) {
        hint += '✓';
      } else {
        hint += ` →${this.targets[i]}`;
        break;
      }
    }
    drawText(this.ctx, hint, width / 2, height - safeBottom - 42, { fontSize: 24, color: Colors.textMuted });

    if (this.gameOver) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.fillRect(0, 0, width, height);
      drawText(this.ctx, '游戏结束', width / 2, height / 2, { fontSize: 56, color: this.theme.primary, bold: true });
    }
  }

  drawCell(row, col) {
    const x = this.gridStartX + col * this.cellSize + 14;
    const y = this.gridStartY + row * this.cellSize + 14;
    const size = this.cellSize - 28;
    const value = this.grid[row][col];
    const bgColor = Colors.get2048Color(value);
    drawRoundRect(this.ctx, x, y, size, size, 22, bgColor);
    if (value > 0) {
      const textColor = value <= 4 ? Colors.textDark : '#fff';
      const fontSize = value >= 1024 ? 42 : value >= 128 ? 48 : 60;
      drawText(this.ctx, String(value), x + size / 2, y + size / 2, { fontSize, color: textColor, bold: true });
    }
  }
}
