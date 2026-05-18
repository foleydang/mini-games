// 消消乐游戏 - 关卡型，带动画效果
import { Colors, drawRoundRect, drawButton, drawText, drawGradientBg, Storage } from '../common/utils.js';
import { Levels } from '../common/config.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';

class Match3Game {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'match3';
    
    this.level = Storage.load('match3_level') || 0;
    
    // 棋盘配置 - 从关卡配置读取
    const levelConfig = Levels.match3[this.level] || Levels.match3[0];
    this.rows = levelConfig.rows;
    this.cols = levelConfig.cols;
    this.numColors = levelConfig.colors;
    this.movesLeft = levelConfig.moves;
    this.targetScore = levelConfig.target;
    this.levelName = levelConfig.name;
    
    this.grid = [];
    this.selected = null;
    this.score = 0;
    this.cellSize = 85;
    this.animating = false;
    this.gameOver = false;
    
    this.swapAnim = null;
    this.removeAnim = null;
    this.fallAnim = null;
    
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);
    this.soundEnabled = true;
    
    this.gemTypes = [
      { color: '#ff4757', shape: 'circle' },
      { color: '#2ed573', shape: 'diamond' },
      { color: '#1e90ff', shape: 'star' },
      { color: '#ffa502', shape: 'square' },
      { color: '#ff6b81', shape: 'heart' },
      { color: '#a55eea', shape: 'hexagon' }
    ].slice(0, this.numColors);
    
    this.theme = Colors.themes.match3;
    
    this.init();
  }

  init() {
    const gridWidth = this.cols * this.cellSize;
    this.gridStartX = (this.designSize.width - gridWidth) / 2;
    this.gridStartY = this.backButton.y + 80;
    
    this.initGrid();
    this.draw();
  }

  initGrid() {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        let type;
        do {
          type = Math.floor(Math.random() * this.gemTypes.length);
        } while (this.wouldMatch(r, c, type));
        this.grid[r][c] = type;
      }
    }
  }

  wouldMatch(row, col, type) {
    if (col >= 2 && this.grid[row] && this.grid[row][col-1] === type && this.grid[row][col-2] === type) return true;
    if (row >= 2 && this.grid[row-1] && this.grid[row-1][col] === type && this.grid[row-2][col] === type) return true;
    return false;
  }

  draw() {
    const ctx = this.ctx;
    const { width, safeTop, safeBottom, height } = this.designSize;
    
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawGradientBg(ctx, width, height, '#fef2f2', '#fee2e2');
    
    drawText(ctx, '消消乐', width / 2, safeTop + 55, { fontSize: 48, color: '#dc2626', bold: true });
    drawText(ctx, `第${this.level + 1}关 ${this.levelName}`, width / 2, safeTop + 95, { fontSize: 22, color: '#6b7280' });
    drawText(ctx, `分数: ${this.score}/${this.targetScore}  步数: ${this.movesLeft}`, width / 2, safeTop + 130, { fontSize: 26, color: '#4b5563' });
    
    // 目标分数进度条
    const progress = Math.min(this.score / this.targetScore, 1);
    const progressWidth = width - 80;
    drawRoundRect(ctx, 40, safeTop + 160, progressWidth, 14, 7, '#e5e7eb');
    const fillWidth = Math.max(progressWidth * progress, 14);
    drawRoundRect(ctx, 40, safeTop + 160, fillWidth, 14, 7, '#dc2626');
    
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);
    
    const gridWidth = this.cols * this.cellSize;
    const gridHeight = this.rows * this.cellSize;
    drawRoundRect(ctx, this.gridStartX - 10, this.gridStartY - 10, gridWidth + 20, gridHeight + 20, 16, '#1e3a5f');
    
    this.drawGemsWithAnimation();
    
    if (this.movesLeft <= 0 && !this.animating) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      const won = this.score >= this.targetScore;
      drawText(ctx, won ? '🎉 过关！' : '游戏结束', width / 2, height / 2 - 50, { fontSize: 48, color: '#fff', bold: true });
      drawText(ctx, '得分: ' + this.score, width / 2, height / 2 + 20, { fontSize: 32, color: '#fff' });
      drawHint(ctx, this.designSize, '点击返回');
    }
  }

  drawGemsWithAnimation() {
    const ctx = this.ctx;
    
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const type = this.grid[r][c];
        if (type < 0) continue;
        
        let x = this.gridStartX + c * this.cellSize + this.cellSize / 2;
        let y = this.gridStartY + r * this.cellSize + this.cellSize / 2;
        let alpha = 1, scale = 1;
        
        if (this.swapAnim) {
          const { gem1, gem2, progress } = this.swapAnim;
          if (gem1.row === r && gem1.col === c) {
            x = this.lerp(x, this.gridStartX + gem2.col * this.cellSize + this.cellSize / 2, progress);
            y = this.lerp(y, this.gridStartY + gem2.row * this.cellSize + this.cellSize / 2, progress);
          } else if (gem2.row === r && gem2.col === c) {
            x = this.lerp(x, this.gridStartX + gem1.col * this.cellSize + this.cellSize / 2, progress);
            y = this.lerp(y, this.gridStartY + gem1.row * this.cellSize + this.cellSize / 2, progress);
          }
        }
        
        if (this.removeAnim) {
          const gem = this.removeAnim.gems.find(g => g.row === r && g.col === c);
          if (gem) {
            alpha = 1 - this.removeAnim.progress;
            scale = 1 - this.removeAnim.progress * 0.5;
          }
        }
        
        if (this.fallAnim) {
          const gem = this.fallAnim.gems.find(g => g.row === r && g.col === c);
          if (gem) {
            const startY = this.gridStartY + gem.fromRow * this.cellSize + this.cellSize / 2;
            y = this.lerp(startY, y, this.fallAnim.progress);
          }
        }
        
        this.drawGemAt(x, y, type, alpha, scale);
      }
    }
    
    if (this.selected && !this.animating) {
      const x = this.gridStartX + this.selected.col * this.cellSize + this.cellSize / 2;
      const y = this.gridStartY + this.selected.row * this.cellSize + this.cellSize / 2;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, this.cellSize * 0.38 + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  lerp(a, b, t) { return a + (b - a) * t; }

  drawGemAt(x, y, type, alpha = 1, scale = 1) {
    const ctx = this.ctx;
    const gem = this.gemTypes[type];
    const size = this.cellSize * 0.38 * scale;
    
    ctx.globalAlpha = alpha;
    ctx.shadowColor = gem.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = gem.color;
    ctx.beginPath();
    
    switch (gem.shape) {
      case 'circle': ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); break;
      case 'diamond':
        ctx.moveTo(x, y - size); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath(); ctx.fill(); break;
      case 'star': this.drawStar(ctx, x, y, size, 5); ctx.fill(); break;
      case 'square': drawRoundRect(ctx, x - size, y - size, size * 2, size * 2, 8, gem.color); break;
      case 'heart': this.drawHeart(ctx, x, y, size); ctx.fill(); break;
      case 'hexagon': this.drawHexagon(ctx, x, y, size); ctx.fill(); break;
    }
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawStar(ctx, cx, cy, size, points) {
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? size : size * 0.4;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      if (i === 0) ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      else ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
    ctx.closePath();
  }

  drawHeart(ctx, cx, cy, size) {
    ctx.moveTo(cx, cy + size * 0.3);
    ctx.bezierCurveTo(cx, cy - size * 0.5, cx - size, cy - size * 0.5, cx - size, cy + size * 0.1);
    ctx.bezierCurveTo(cx - size, cy + size, cx, cy + size, cx, cy + size);
    ctx.bezierCurveTo(cx, cy + size, cx + size, cy + size, cx + size, cy + size * 0.1);
    ctx.bezierCurveTo(cx + size, cy - size * 0.5, cx, cy - size * 0.5, cx, cy + size * 0.3);
    ctx.closePath();
  }

  drawHexagon(ctx, cx, cy, size) {
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 2;
      if (i === 0) ctx.moveTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
      else ctx.lineTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
    }
    ctx.closePath();
  }

  onTouchStart(pos) {
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') { this.onEnd(this.score); return; }
    if (btn === 'soundBtn') { this.soundEnabled = !this.soundEnabled; this.draw(); return; }
    
    if (this.movesLeft <= 0 && !this.animating) {
      if (this.score >= this.targetScore) {
        const hasNext = this.level + 1 < Levels.match3.length;
        if (hasNext) { this.level++; Storage.save('match3_level', this.level); }
        // Reset for next level or replay
        this.init();
      } else {
        this.onEnd(this.score);
      }
      return;
    }
    
    if (this.animating) return;
    
    const col = Math.floor((pos.x - this.gridStartX) / this.cellSize);
    const row = Math.floor((pos.y - this.gridStartY) / this.cellSize);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    
    if (!this.selected) {
      this.selected = { row, col };
      this.draw();
    } else {
      const dr = Math.abs(row - this.selected.row);
      const dc = Math.abs(col - this.selected.col);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        this.startSwapAnimation(this.selected.row, this.selected.col, row, col);
      } else {
        this.selected = { row, col };
        this.draw();
      }
    }
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  startSwapAnimation(r1, c1, r2, c2) {
    this.animating = true;
    this.swapAnim = { gem1: { row: r1, col: c1 }, gem2: { row: r2, col: c2 }, progress: 0, r1, c1, r2, c2 };
    this.selected = null;
    this.animateSwap();
  }

  animateSwap() {
    if (!this.swapAnim) return;
    this.swapAnim.progress += 0.1;
    this.draw();
    if (this.swapAnim.progress < 1) { setTimeout(() => this.animateSwap(), 30); }
    else {
      const { r1, c1, r2, c2 } = this.swapAnim;
      const temp = this.grid[r1][c1]; this.grid[r1][c1] = this.grid[r2][c2]; this.grid[r2][c2] = temp;
      this.swapAnim = null;
      const matches = this.findMatches();
      if (matches.length > 0) { this.movesLeft--; this.startRemoveAnimation(matches); }
      else { this.startSwapBackAnimation(r1, c1, r2, c2); }
    }
  }

  startSwapBackAnimation(r1, c1, r2, c2) {
    const temp = this.grid[r1][c1]; this.grid[r1][c1] = this.grid[r2][c2]; this.grid[r2][c2] = temp;
    this.swapAnim = { gem1: { row: r1, col: c1 }, gem2: { row: r2, col: c2 }, progress: 0, r1, c1, r2, c2 };
    this.animateSwapBack();
  }

  animateSwapBack() {
    if (!this.swapAnim) return;
    this.swapAnim.progress += 0.1;
    this.draw();
    if (this.swapAnim.progress < 1) { setTimeout(() => this.animateSwapBack(), 30); }
    else { this.swapAnim = null; this.animating = false; this.draw(); }
  }

  startRemoveAnimation(matches) {
    this.animating = true;
    this.score += matches.length * 10;
    playSound(SoundType.MATCH);
    this.removeAnim = { gems: matches, progress: 0 };
    this.animateRemove();
  }

  animateRemove() {
    if (!this.removeAnim) return;
    this.removeAnim.progress += 0.08;
    this.draw();
    if (this.removeAnim.progress < 1) { setTimeout(() => this.animateRemove(), 30); }
    else {
      const matches = this.removeAnim.gems;
      for (const m of matches) this.grid[m.row][m.col] = -1;
      this.removeAnim = null;
      this.startFallAnimation();
    }
  }

  startFallAnimation() {
    const fallingGems = [];
    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] >= 0) {
          if (r !== emptyRow) {
            fallingGems.push({ fromRow: r, toRow: emptyRow, col: c });
            this.grid[emptyRow][c] = this.grid[r][c]; this.grid[r][c] = -1;
          }
          emptyRow--;
        }
      }
      for (let r = emptyRow; r >= 0; r--) {
        this.grid[r][c] = Math.floor(Math.random() * this.gemTypes.length);
        fallingGems.push({ fromRow: -1 - (emptyRow - r), toRow: r, col: c });
      }
    }
    if (fallingGems.length === 0) { this.animating = false; this.checkNewMatches(); return; }
    this.fallAnim = { gems: fallingGems, progress: 0 };
    this.animateFall();
  }

  animateFall() {
    if (!this.fallAnim) return;
    this.fallAnim.progress += 0.12;
    this.draw();
    if (this.fallAnim.progress < 1) { setTimeout(() => this.animateFall(), 30); }
    else { this.fallAnim = null; this.animating = false; this.checkNewMatches(); }
  }

  checkNewMatches() {
    const newMatches = this.findMatches();
    if (newMatches.length > 0) { this.startRemoveAnimation(newMatches); }
    else { this.draw(); }
  }

  findMatches() {
    const matches = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols - 2; c++) {
        if (this.grid[r][c] === this.grid[r][c+1] && this.grid[r][c] === this.grid[r][c+2] && this.grid[r][c] >= 0) {
          matches.push({ row: r, col: c }, { row: r, col: c + 1 }, { row: r, col: c + 2 });
        }
      }
    }
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows - 2; r++) {
        if (this.grid[r][c] === this.grid[r+1][c] && this.grid[r][c] === this.grid[r+2][c] && this.grid[r][c] >= 0) {
          matches.push({ row: r, col: c }, { row: r + 1, col: c }, { row: r + 2, col: c });
        }
      }
    }
    return matches;
  }
}

export default Match3Game;
