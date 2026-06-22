// 宝石消除游戏 - 带动画效果
import { Colors, drawRoundRect, drawButton, drawText, drawGradientBg, Storage, RankData } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';

class Match3Game {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'match3';
    
    // 棋盘配置
    this.rows = 10;
    this.cols = 7;
    this.grid = [];
    this.selected = null;
    this.score = 0;
    this.moves = 35;
    this.cellSize = 85;
    this.animating = false;
    this.gameOver = false;
    
    // 动画状态
    this.swapAnim = null;     // 交换动画
    this.removeAnim = null;   // 消除动画
    this.fallAnim = null;     // 下落动画
    
    // 按钮配置
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
    ];
    
    this.init();
  }

  init() {
    const gridWidth = this.cols * this.cellSize;
    const gridHeight = this.rows * this.cellSize;
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
    drawGradientBg(ctx, width, height, '#fdf4ff', '#e9d5ff');
    
    // 标题和分数
    drawText(ctx, '宝石消除', width / 2, safeTop + 80, { fontSize: 48, color: '#7c3aed', bold: true });
    drawText(ctx, '分数: ' + this.score + '  步数: ' + this.moves, width / 2, safeTop + 140, { fontSize: 28, color: '#4b5563' });
    
    // 底部按钮
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);
    
    // 网格背景
    const gridWidth = this.cols * this.cellSize;
    const gridHeight = this.rows * this.cellSize;
    drawRoundRect(ctx, this.gridStartX - 10, this.gridStartY - 10, gridWidth + 20, gridHeight + 20, 16, '#1e3a5f');
    
    // 绘制宝石（考虑动画状态）
    this.drawGemsWithAnimation();
    
    // 游戏结束
    if (this.moves <= 0 && !this.animating) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '游戏结束', width / 2, height / 2 - 50, { fontSize: 48, color: '#fff', bold: true });
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
        
        // 计算宝石位置（考虑动画）
        let x = this.gridStartX + c * this.cellSize + this.cellSize / 2;
        let y = this.gridStartY + r * this.cellSize + this.cellSize / 2;
        let alpha = 1;
        let scale = 1;
        
        // 交换动画：移动两个宝石
        if (this.swapAnim) {
          const { gem1, gem2, progress } = this.swapAnim;
          if (gem1.row === r && gem1.col === c) {
            // gem1 移向 gem2 位置
            x = this.lerp(x, this.gridStartX + gem2.col * this.cellSize + this.cellSize / 2, progress);
            y = this.lerp(y, this.gridStartY + gem2.row * this.cellSize + this.cellSize / 2, progress);
          } else if (gem2.row === r && gem2.col === c) {
            // gem2 移向 gem1 位置
            x = this.lerp(x, this.gridStartX + gem1.col * this.cellSize + this.cellSize / 2, progress);
            y = this.lerp(y, this.gridStartY + gem1.row * this.cellSize + this.cellSize / 2, progress);
          }
        }
        
        // 消除动画：闪烁并缩小消失
        if (this.removeAnim) {
          const gem = this.removeAnim.gems.find(g => g.row === r && g.col === c);
          if (gem) {
            alpha = 1 - this.removeAnim.progress;
            scale = 1 - this.removeAnim.progress * 0.5;
            // 闪烁效果
            if (this.removeAnim.progress < 0.5) {
              alpha = this.removeAnim.progress < 0.25 ? 1 : 0.5;
            }
          }
        }
        
        // 下落动画
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
    
    // 绘制选中高亮（动画中不显示）
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

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

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
      case 'circle':
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'diamond':
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        break;
      case 'star':
        this.drawStar(ctx, x, y, size, 5);
        ctx.fill();
        break;
      case 'square':
        drawRoundRect(ctx, x - size, y - size, size * 2, size * 2, 8, gem.color);
        break;
      case 'heart':
        this.drawHeart(ctx, x, y, size);
        ctx.fill();
        break;
      case 'hexagon':
        this.drawHexagon(ctx, x, y, size);
        ctx.fill();
        break;
    }
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawStar(ctx, cx, cy, size, points) {
    const outerRadius = size, innerRadius = size * 0.4;
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
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
      const px = cx + Math.cos(angle) * size;
      const py = cy + Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  onTouchStart(pos) {
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') {
      this.onEnd(this.score);
      return;
    }
    if (btn === 'soundBtn') {
      this.soundEnabled = !this.soundEnabled;
      this.draw();
      return;
    }
    
    if (this.moves <= 0 && !this.animating) {
      this.onEnd(this.score);
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

  // 启动交换动画
  startSwapAnimation(r1, c1, r2, c2) {
    this.animating = true;
    this.swapAnim = {
      gem1: { row: r1, col: c1, type: this.grid[r1][c1] },
      gem2: { row: r2, col: c2, type: this.grid[r2][c2] },
      progress: 0,
      r1, c1, r2, c2
    };
    this.selected = null;
    this.animateSwap();
  }

  animateSwap() {
    if (!this.swapAnim) return;
    
    this.swapAnim.progress += 0.1;
    this.draw();
    
    if (this.swapAnim.progress < 1) {
      setTimeout(() => this.animateSwap(), 30);
    } else {
      // 交换完成
      const { r1, c1, r2, c2 } = this.swapAnim;
      const temp = this.grid[r1][c1];
      this.grid[r1][c1] = this.grid[r2][c2];
      this.grid[r2][c2] = temp;
      this.swapAnim = null;
      
      // 检查是否有匹配
      const matches = this.findMatches();
      if (matches.length > 0) {
        this.moves--;
        this.startRemoveAnimation(matches);
      } else {
        // 无效交换，换回去
        this.startSwapBackAnimation(r1, c1, r2, c2);
      }
    }
  }

  // 无效交换，换回去
  startSwapBackAnimation(r1, c1, r2, c2) {
    this.swapAnim = {
      gem1: { row: r1, col: c1 },
      gem2: { row: r2, col: c2 },
      progress: 0,
      r1, c1, r2, c2
    };
    // 先交换数据
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
    
    this.animateSwapBack();
  }

  animateSwapBack() {
    if (!this.swapAnim) return;
    
    this.swapAnim.progress += 0.1;
    this.draw();
    
    if (this.swapAnim.progress < 1) {
      setTimeout(() => this.animateSwapBack(), 30);
    } else {
      this.swapAnim = null;
      this.animating = false;
      this.draw();
    }
  }

  // 启动消除动画
  startRemoveAnimation(matches) {
    this.animating = true;
    this.score += matches.length * 10;
    
    this.removeAnim = {
      gems: matches,
      progress: 0
    };
    this.animateRemove();
  }

  animateRemove() {
    if (!this.removeAnim) return;
    
    this.removeAnim.progress += 0.08;
    this.draw();
    
    if (this.removeAnim.progress < 1) {
      setTimeout(() => this.animateRemove(), 30);
    } else {
      // 消除完成
      const matches = this.removeAnim.gems;
      for (const m of matches) this.grid[m.row][m.col] = -1;
      this.removeAnim = null;
      
      // 启动下落动画
      this.startFallAnimation();
    }
  }

  // 启动下落动画
  startFallAnimation() {
    // 记录需要下落的宝石
    const fallingGems = [];
    
    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1;
      const colGems = [];
      
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] >= 0) {
          if (r !== emptyRow) {
            colGems.push({ fromRow: r, toRow: emptyRow, col: c });
            this.grid[emptyRow][c] = this.grid[r][c];
            this.grid[r][c] = -1;
          }
          emptyRow--;
        }
      }
      
      // 新生成的宝石从顶部下落
      for (let r = emptyRow; r >= 0; r--) {
        const newType = Math.floor(Math.random() * this.gemTypes.length);
        this.grid[r][c] = newType;
        colGems.push({ fromRow: -1 - (emptyRow - r), toRow: r, col: c });
      }
      
      fallingGems.push(...colGems);
    }
    
    if (fallingGems.length === 0) {
      this.animating = false;
      this.checkNewMatches();
      return;
    }
    
    this.fallAnim = {
      gems: fallingGems,
      progress: 0
    };
    this.animateFall();
  }

  animateFall() {
    if (!this.fallAnim) return;
    
    this.fallAnim.progress += 0.12;
    this.draw();
    
    if (this.fallAnim.progress < 1) {
      setTimeout(() => this.animateFall(), 30);
    } else {
      this.fallAnim = null;
      this.animating = false;
      this.checkNewMatches();
    }
  }

  checkNewMatches() {
    const newMatches = this.findMatches();
    if (newMatches.length > 0) {
      this.startRemoveAnimation(newMatches);
    } else {
      this.draw();
    }
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
