/**
 * 消消乐 - 关卡型游戏（优化UI）
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawProgress, Storage, shareGame
} from '../common/utils.js';
import { Levels } from '../common/config.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';
import { 
  getBackButton, getShareButton, getSoundButton,
  drawBottomButtons, checkBottomButtons, drawHint
} from '../common/ui.js';

export default class Match3Game {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    this.level = Storage.load('match3_level') || 0;
    this.gridSize = 6;
    this.colors = 4;
    this.moves = 20;
    this.target = 800;
    this.score = 0;
    this.bestScore = Storage.load('match3_best') || 0;
    this.cellSize = 70;
    this.grid = [];
    this.selectedGem = null;
    this.isAnimating = false;
    this.touchStartPos = null;
    this.comboCount = 0;
    this.levelName = '入门';

    this.theme = Colors.themes.match3;

    // 按钮在左下角和右下角（远离胶囊按钮）
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const levelConfig = Levels.match3[this.level] || Levels.match3[0];
    this.gridSize = levelConfig.grid;
    this.colors = levelConfig.colors;
    this.moves = levelConfig.moves;
    this.target = levelConfig.target;
    this.levelName = levelConfig.name;
    this.score = 0;
    this.selectedGem = null;
    this.isAnimating = false;
    this.comboCount = 0;

    const { width, height, safeTop, safeBottom } = this.designSize;
    const headerHeight = 140;
    const footerHeight = 85;
    const availableHeight = height - safeTop - safeBottom - headerHeight - footerHeight;
    const availableWidth = width - 50;

    this.cellSize = Math.max(40, Math.min(availableWidth / this.gridSize, availableHeight / this.gridSize, 120));
    this.gridStartX = (width - this.gridSize * this.cellSize) / 2;
    this.gridStartY = safeTop + headerHeight;

    this.grid = [];
    for (let row = 0; row < this.gridSize; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        this.grid[row][col] = Math.floor(Math.random() * this.colors);
      }
    }

    while (this.findMatches().length > 0) {
      this.clearMatches();
      this.fillGrid();
    }

    this.render();
  }

  startLoop() {
    this.timer = setInterval(() => {
      if (!this.isAnimating) this.render();
    }, 50);
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }

  checkButton(pos, btn) {
    return pos.x >= btn.x && pos.x <= btn.x + btn.width &&
           pos.y >= btn.y && pos.y <= btn.y + btn.height;
  }

  onTouchStart(pos) {
    if (this.isAnimating) return;

    // 公共按钮（左下角和右下角）
    if (this.checkButton(pos, this.backButton)) {
      playSound(SoundType.CLICK);
      this.destroy();
      this.onEnd(this.score);
      return;
    }

    if (this.checkButton(pos, this.shareButton)) {
      playSound(SoundType.SUCCESS);
      shareGame('消消乐', this.score);
      return;
    }

    if (this.checkButton(pos, this.soundButton)) {
      audioManager.toggle();
      this.render();
      return;
    }

    const cell = this.getCellAtPos(pos);
    if (cell) {
      this.touchStartPos = pos;
      if (this.selectedGem) {
        const dr = Math.abs(cell.row - this.selectedGem.row);
        const dc = Math.abs(cell.col - this.selectedGem.col);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
          playSound(SoundType.SWAP);
          this.trySwap(this.selectedGem.row, this.selectedGem.col, cell.row, cell.col);
        } else {
          this.selectedGem = cell;
        }
      } else {
        this.selectedGem = cell;
      }
      this.render();
    }
  }

  onTouchMove(pos) {
    if (this.isAnimating || !this.touchStartPos || !this.selectedGem) return;
    const dx = pos.x - this.touchStartPos.x;
    const dy = pos.y - this.touchStartPos.y;
    if (Math.abs(dx) > this.cellSize * 0.3 || Math.abs(dy) > this.cellSize * 0.3) {
      let targetRow = this.selectedGem.row;
      let targetCol = this.selectedGem.col;
      if (Math.abs(dx) > Math.abs(dy)) {
        targetCol += dx > 0 ? 1 : -1;
      } else {
        targetRow += dy > 0 ? 1 : -1;
      }
      if (targetRow >= 0 && targetRow < this.gridSize && targetCol >= 0 && targetCol < this.gridSize) {
        playSound(SoundType.SWAP);
        this.trySwap(this.selectedGem.row, this.selectedGem.col, targetRow, targetCol);
      }
      this.touchStartPos = null;
    }
  }

  onTouchEnd(pos) {
    this.touchStartPos = null;
  }

  getCellAtPos(pos) {
    const x = pos.x - this.gridStartX;
    const y = pos.y - this.gridStartY;
    if (x < 0 || x >= this.gridSize * this.cellSize || y < 0 || y >= this.gridSize * this.cellSize) return null;
    return { row: Math.floor(y / this.cellSize), col: Math.floor(x / this.cellSize) };
  }

  trySwap(r1, c1, r2, c2) {
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
    if (this.findMatches().length > 0) {
      this.moves--;
      this.selectedGem = null;
      this.comboCount = 0;
      this.processMatches();
    } else {
      this.grid[r2][c2] = this.grid[r1][c1];
      this.grid[r1][c1] = temp;
      this.selectedGem = null;
    }
    this.render();
  }

  findMatches() {
    const matches = [];
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize - 2; col++) {
        if (this.grid[row][col] === this.grid[row][col + 1] && this.grid[row][col] === this.grid[row][col + 2]) {
          matches.push({ row, col, dir: 'h' });
        }
      }
    }
    for (let row = 0; row < this.gridSize - 2; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.grid[row][col] === this.grid[row + 1][col] && this.grid[row][col] === this.grid[row + 2][col]) {
          matches.push({ row, col, dir: 'v' });
        }
      }
    }
    return matches;
  }

  processMatches() {
    const matches = this.findMatches();
    if (matches.length === 0) {
      this.checkGameEnd();
      return;
    }
    this.isAnimating = true;
    this.comboCount++;
    if (this.comboCount > 1) playSound(SoundType.SUCCESS);
    else playSound(SoundType.MATCH);

    const toRemove = new Set();
    matches.forEach(m => {
      if (m.dir === 'h') {
        for (let i = 0; i < 3; i++) toRemove.add(`${m.row},${m.col + i}`);
      } else {
        for (let i = 0; i < 3; i++) toRemove.add(`${m.row + i},${m.col}`);
      }
    });

    const baseScore = toRemove.size * 10;
    const comboBonus = this.comboCount > 1 ? (this.comboCount - 1) * 50 : 0;
    this.score += baseScore + comboBonus;

    toRemove.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      this.grid[row][col] = -1;
    });

    setTimeout(() => {
      this.dropGrid();
      this.fillGrid();
      this.render();
      setTimeout(() => {
        this.isAnimating = false;
        this.processMatches();
      }, 200);
    }, 200);
  }

  dropGrid() {
    for (let col = 0; col < this.gridSize; col++) {
      let emptyRow = this.gridSize - 1;
      for (let row = this.gridSize - 1; row >= 0; row--) {
        if (this.grid[row][col] >= 0) {
          if (row !== emptyRow) {
            this.grid[emptyRow][col] = this.grid[row][col];
            this.grid[row][col] = -1;
          }
          emptyRow--;
        }
      }
    }
  }

  fillGrid() {
    for (let col = 0; col < this.gridSize; col++) {
      for (let row = 0; row < this.gridSize; row++) {
        if (this.grid[row][col] === -1) {
          this.grid[row][col] = Math.floor(Math.random() * this.colors);
        }
      }
    }
  }

  clearMatches() {
    const matches = this.findMatches();
    matches.forEach(m => {
      if (m.dir === 'h') {
        for (let i = 0; i < 3; i++) this.grid[m.row][m.col + i] = -1;
      } else {
        for (let i = 0; i < 3; i++) this.grid[m.row + i][m.col] = -1;
      }
    });
  }

  checkGameEnd() {
    if (this.score >= this.target) {
      playSound(SoundType.LEVEL_UP);
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        Storage.save('match3_best', this.bestScore);
      }
      const hasNext = this.level + 1 < Levels.match3.length;
      const nextName = hasNext ? Levels.match3[this.level + 1].name : '已通关全部';
      wx.showModal({
        title: '🎉 过关！',
        content: `关卡${this.levelName} ✓\n得分: ${this.score}\n连击: ${this.comboCount}次\n${hasNext ? '下一关: ' + nextName : '恭喜通关全部关卡！'}`,
        confirmText: hasNext ? '下一关' : '重玩',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            this.level = hasNext ? this.level + 1 : 0;
            Storage.save('match3_level', this.level);
            this.initGame();
          } else {
            this.destroy();
            this.onEnd(this.score);
          }
        }
      });
    } else if (this.moves <= 0) {
      playSound(SoundType.GAME_OVER);
      wx.showModal({
        title: '未达成目标',
        content: `关卡: ${this.levelName}\n得分: ${this.score}/${this.target}\n连击: ${this.comboCount}次`,
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

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');

    // 标题 + 关卡
    drawText(this.ctx, '消消乐', width / 2, safeTop + 50, { fontSize: 48, color: this.theme.primary, bold: true });
    drawText(this.ctx, `第${this.level + 1}关 ${this.levelName}`, width / 2, safeTop + 85, { fontSize: 20, color: Colors.textLight });

    // 分数和步数
    drawText(this.ctx, `${this.score}`, width / 2 - 140, safeTop + 50, { fontSize: 34, color: Colors.textDark, bold: true });
    drawText(this.ctx, `${this.moves}`, width / 2 + 140, safeTop + 50, { fontSize: 34, color: this.moves <= 3 ? Colors.danger : Colors.textDark, bold: true });

    // 连击提示
    if (this.comboCount > 1) {
      drawText(this.ctx, `${this.comboCount}连击!`, width / 2, safeTop + 105, { fontSize: 22, color: Colors.warning });
    }

    // 底部按钮 - 左下角和右下角
    drawButton(this.ctx, this.backButton.x, this.backButton.y, 
               this.backButton.width, this.backButton.height,
               '← 返回', Colors.danger, { fontSize: 28, radius: 14 });
    
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y,
               this.shareButton.width, this.shareButton.height,
               '分享', Colors.success, { fontSize: 28, radius: 14 });
    
    drawButton(this.ctx, this.soundButton.x, this.soundButton.y,
               this.soundButton.width, this.soundButton.height,
               audioManager.enabled ? '🔊' : '🔇', Colors.info, { fontSize: 28, radius: 14 });

    // 网格背景
    const gridW = this.gridSize * this.cellSize;
    const gridH = this.gridSize * this.cellSize;
    drawRoundRect(this.ctx, this.gridStartX - 14, this.gridStartY - 14, gridW + 28, gridH + 28, 24, '#fff', this.theme.primary, 4);

    // 宝石
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        this.drawGem(row, col);
      }
    }

    // 进度条
    const progress = Math.min(this.score / this.target, 1);
    drawProgress(this.ctx, 30, height - safeBottom - 130, width - 60, 42, progress, this.theme.primary, 20);
    drawText(this.ctx, `${this.score}/${this.target}`, width / 2, height - safeBottom - 109, { fontSize: 26, color: progress > 0.6 ? Colors.white : Colors.textDark, bold: true });

    // 底部提示
    drawHint(this.ctx, this.designSize, '滑动交换宝石');
  }

  drawGem(row, col) {
    if (this.grid[row][col] < 0) return;
    const x = this.gridStartX + col * this.cellSize + 8;
    const y = this.gridStartY + row * this.cellSize + 8;
    const size = Math.max(20, this.cellSize - 16);
    const gemColor = Colors.gems[this.grid[row][col]];
    const isSelected = this.selectedGem && this.selectedGem.row === row && this.selectedGem.col === col;
    drawRoundRect(this.ctx, x, y, size, size, Math.min(12, size / 4), gemColor, isSelected ? Colors.white : null, isSelected ? 3 : 0);

    // 高光
    const highlightSize = Math.max(10, size * 0.4);
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.beginPath();
    const r = 6;
    this.ctx.moveTo(x + 4 + r, y + 4);
    this.ctx.arcTo(x + 4 + highlightSize, y + 4, x + 4 + highlightSize, y + 4 + r, r);
    this.ctx.arcTo(x + 4 + highlightSize, y + 4 + highlightSize, x + 4 + highlightSize - r, y + 4 + highlightSize, r);
    this.ctx.arcTo(x + 4, y + 4 + highlightSize, x + 4, y + 4 + highlightSize - r, r);
    this.ctx.arcTo(x + 4, y + 4, x + 4 + r, y + 4, r);
    this.ctx.fill();
  }
}
