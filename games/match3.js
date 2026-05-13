// 消消乐游戏 - 视觉优化版
class Match3Game {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    
    this.rows = 8;
    this.cols = 6;
    this.grid = [];
    this.selected = null;
    this.score = 0;
    this.moves = 30;
    this.cellSize = 60;
    this.animating = false;
    this.gameOver = false;
    
    // 宝石类型 - 6种不同颜色和形状
    this.gemTypes = [
      { color: '#ff4757', shape: 'circle', name: 'ruby' },
      { color: '#2ed573', shape: 'diamond', name: 'emerald' },
      { color: '#1e90ff', shape: 'star', name: 'sapphire' },
      { color: '#ffa502', shape: 'square', name: 'topaz' },
      { color: '#ff6b81', shape: 'heart', name: 'rose' },
      { color: '#a55eea', shape: 'hexagon', name: 'amethyst' }
    ];
    
    this.init();
  }

  init() {
    // 计算网格位置 - 居中显示
    const gridWidth = this.cols * this.cellSize;
    const gridHeight = this.rows * this.cellSize;
    this.gridStartX = (this.designSize.width - gridWidth) / 2;
    this.gridStartY = 280;
    
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
    if (col >= 2 && this.grid[row][col-1] === type && this.grid[row][col-2] === type) return true;
    if (row >= 2 && this.grid[row-1][col] === type && this.grid[row-2][col] === type) return true;
    return false;
  }

  draw() {
    const ctx = this.ctx;
    const { width, safeTop, safeBottom, height } = this.designSize;
    
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#fdf4ff');
    gradient.addColorStop(1, '#e9d5ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 标题
    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('消消乐', width / 2, safeTop + 60);
    
    // 分数和步数
    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.textAlign = 'left';
    ctx.fillText('分数: ' + this.score, 50, safeTop + 130);
    ctx.textAlign = 'right';
    ctx.fillText('步数: ' + this.moves, width - 50, safeTop + 130);
    
    // 网格背景
    const gridWidth = this.cols * this.cellSize;
    const gridHeight = this.rows * this.cellSize;
    
    const bgGradient = ctx.createLinearGradient(this.gridStartX, this.gridStartY, this.gridStartX, this.gridStartY + gridHeight);
    bgGradient.addColorStop(0, '#1e3a5f');
    bgGradient.addColorStop(1, '#0f1f3d');
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.roundRect(this.gridStartX - 10, this.gridStartY - 10, gridWidth + 20, gridHeight + 20, 20);
    ctx.fill();
    
    // 绘制宝石
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] >= 0) this.drawGem(r, c, this.grid[r][c]);
      }
    }
    
    // 返回按钮
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(width - 140, safeTop + 85, 120, 55, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('← 返回', width - 80, safeTop + 117);
    
    // 游戏结束
    if (this.moves <= 0 && !this.animating) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText('游戏结束', width / 2, safeTop + 300);
      ctx.font = '32px sans-serif';
      ctx.fillText('得分: ' + this.score, width / 2, safeTop + 360);
      ctx.fillText('点击返回', width / 2, safeTop + 420);
    }
  }

  drawGem(row, col, type) {
    const ctx = this.ctx;
    const gem = this.gemTypes[type];
    const x = this.gridStartX + col * this.cellSize + this.cellSize / 2;
    const y = this.gridStartY + row * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.35;
    
    const isSelected = this.selected && this.selected.row === row && this.selected.col === col;
    
    ctx.shadowColor = isSelected ? '#fff' : gem.color;
    ctx.shadowBlur = isSelected ? 15 : 10;
    ctx.fillStyle = gem.color;
    ctx.beginPath();
    
    switch (gem.shape) {
      case 'circle':
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.3, 0, Math.PI * 2);
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
        ctx.roundRect(x - size, y - size, size * 2, size * 2, 8);
        ctx.fill();
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
    
    if (isSelected) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, size + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
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
    const { width, safeTop } = this.designSize;
    
    // 返回按钮
    if (pos.x >= width - 140 && pos.x <= width - 20 && pos.y >= safeTop + 85 && pos.y <= safeTop + 140) {
      this.onEnd(this.score);
      return;
    }
    
    // 游戏结束状态
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
        this.swap(this.selected.row, this.selected.col, row, col);
      } else {
        this.selected = { row, col };
        this.draw();
      }
    }
  }

  onTouchMove(pos) {}

  onTouchEnd(pos) {}

  swap(r1, c1, r2, c2) {
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
    this.selected = null;
    
    const matches = this.findMatches();
    if (matches.length > 0) {
      this.moves--;
      this.removeMatches(matches);
    } else {
      this.grid[r2][c2] = this.grid[r1][c1];
      this.grid[r1][c1] = temp;
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

  removeMatches(matches) {
    this.animating = true;
    this.score += matches.length * 10;
    
    for (const m of matches) this.grid[m.row][m.col] = -1;
    this.draw();
    
    setTimeout(() => {
      this.fillGrid();
      this.animating = false;
      const newMatches = this.findMatches();
      if (newMatches.length > 0) this.removeMatches(newMatches);
      else this.draw();
    }, 300);
  }

  fillGrid() {
    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] >= 0) {
          if (r !== emptyRow) {
            this.grid[emptyRow][c] = this.grid[r][c];
            this.grid[r][c] = -1;
          }
          emptyRow--;
        }
      }
      for (let r = emptyRow; r >= 0; r--) {
        this.grid[r][c] = Math.floor(Math.random() * this.gemTypes.length);
      }
    }
  }
}

export default Match3Game;
