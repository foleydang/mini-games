// 消消乐游戏 - 视觉优化版
class Match3Game {
  constructor() {
    this.rows = 8;
    this.cols = 6;
    this.grid = [];
    this.selected = null;
    this.score = 0;
    this.moves = 30;
    this.cellSize = 60;
    this.gridStartX = 0;
    this.gridStartY = 0;
    this.animating = false;
    
    // 宝石类型 - 6种不同颜色和形状
    this.gemTypes = [
      { color: '#ff4757', shape: 'circle', name: 'ruby' },      // 红宝石 - 圆形
      { color: '#2ed573', shape: 'diamond', name: 'emerald' },   // 绿宝石 - 菱形
      { color: '#1e90ff', shape: 'star', name: 'sapphire' },     // 蓝宝石 - 星形
      { color: '#ffa502', shape: 'square', name: 'topaz' },      // 黄宝石 - 方形
      { color: '#ff6b81', shape: 'heart', name: 'rose' },        // 粉宝石 - 心形
      { color: '#a55eea', shape: 'hexagon', name: 'amethyst' }   // 紫宝石 - 六边形
    ];
  }

  init(canvas, ctx, designSize) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    
    // 计算网格位置 - 居中显示
    const gridWidth = this.cols * this.cellSize;
    const gridHeight = this.rows * this.cellSize;
    this.gridStartX = (designSize.width - gridWidth) / 2;
    this.gridStartY = 280; // 从标题下方开始
    
    // 初始化网格
    this.initGrid();
    this.draw();
  }

  initGrid() {
    // 初始化网格，确保没有初始匹配
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
    // 检查是否会形成初始匹配
    // 检查左边两个
    if (col >= 2 && 
        this.grid[row][col-1] === type && 
        this.grid[row][col-2] === type) {
      return true;
    }
    // 检查上边两个
    if (row >= 2 && 
        this.grid[row-1][col] === type && 
        this.grid[row-2][col] === type) {
      return true;
    }
    return false;
  }

  draw() {
    const ctx = this.ctx;
    const { width, safeTop } = this.designSize;
    
    // 清空画布
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制标题
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('消消乐', width / 2, safeTop + 60);
    
    // 绘制分数和步数
    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.textAlign = 'left';
    ctx.fillText('分数: ' + this.score, 50, safeTop + 130);
    ctx.textAlign = 'right';
    ctx.fillText('步数: ' + this.moves, width - 50, safeTop + 130);
    
    // 绘制网格背景
    const gridWidth = this.cols * this.cellSize;
    const gridHeight = this.rows * this.cellSize;
    
    // 网格背景 - 渐变效果
    const gradient = ctx.createLinearGradient(
      this.gridStartX, this.gridStartY,
      this.gridStartX, this.gridStartY + gridHeight
    );
    gradient.addColorStop(0, '#1e3a5f');
    gradient.addColorStop(1, '#0f1f3d');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(this.gridStartX - 10, this.gridStartY - 10, gridWidth + 20, gridHeight + 20, 20);
    ctx.fill();
    
    // 绘制网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.cols; i++) {
      ctx.beginPath();
      ctx.moveTo(this.gridStartX + i * this.cellSize, this.gridStartY);
      ctx.lineTo(this.gridStartX + i * this.cellSize, this.gridStartY + gridHeight);
      ctx.stroke();
    }
    for (let i = 0; i <= this.rows; i++) {
      ctx.beginPath();
      ctx.moveTo(this.gridStartX, this.gridStartY + i * this.cellSize);
      ctx.lineTo(this.gridStartX + gridWidth, this.gridStartY + i * this.cellSize);
      ctx.stroke();
    }
    
    // 绘制宝石
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] >= 0) {
          this.drawGem(r, c, this.grid[r][c]);
        }
      }
    }
    
    // 游戏结束提示
    if (this.moves <= 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, this.designSize.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('游戏结束', width / 2, safeTop + 300);
      ctx.font = '32px sans-serif';
      ctx.fillText('最终得分: ' + this.score, width / 2, safeTop + 360);
      ctx.fillText('点击重新开始', width / 2, safeTop + 420);
    }
  }

  drawGem(row, col, type) {
    const ctx = this.ctx;
    const gem = this.gemTypes[type];
    const x = this.gridStartX + col * this.cellSize + this.cellSize / 2;
    const y = this.gridStartY + row * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.35;
    
    const isSelected = this.selected && 
                       this.selected.row === row && 
                       this.selected.col === col;
    
    // 外发光效果
    ctx.shadowColor = isSelected ? '#fff' : gem.color;
    ctx.shadowBlur = isSelected ? 15 : 10;
    ctx.shadowOffsetY = 2;
    
    // 根据形状绘制不同宝石
    ctx.fillStyle = gem.color;
    ctx.beginPath();
    
    switch (gem.shape) {
      case 'circle':
        // 圆形宝石 - 红宝石
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        // 内部光泽
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'diamond':
        // 菱形宝石 - 绿宝石
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        // 光泽线条
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - size * 0.5, y - size * 0.5);
        ctx.lineTo(x + size * 0.3, y + size * 0.3);
        ctx.stroke();
        break;
        
      case 'star':
        // 星形宝石 - 蓝宝石
        this.drawStar(ctx, x, y, size, 5);
        ctx.fill();
        break;
        
      case 'square':
        // 方形宝石 - 黄宝石
        ctx.roundRect(x - size, y - size, size * 2, size * 2, 8);
        ctx.fill();
        // 内部方块
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.roundRect(x - size * 0.4, y - size * 0.4, size * 0.8, size * 0.8, 4);
        ctx.fill();
        break;
        
      case 'heart':
        // 心形宝石 - 粉宝石
        this.drawHeart(ctx, x, y, size);
        ctx.fill();
        break;
        
      case 'hexagon':
        // 六边形宝石 - 紫宝石
        this.drawHexagon(ctx, x, y, size);
        ctx.fill();
        break;
    }
    
    // 选中状态 - 白色边框
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
    const outerRadius = size;
    const innerRadius = size * 0.4;
    
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
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
      const x = cx + Math.cos(angle) * size;
      const y = cy + Math.sin(angle) * size;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  }

  handleClick(pos) {
    if (this.animating || this.moves <= 0) {
      // 游戏结束时点击重新开始
      if (this.moves <= 0) {
        this.score = 0;
        this.moves = 30;
        this.initGrid();
        this.draw();
      }
      return;
    }
    
    const col = Math.floor((pos.x - this.gridStartX) / this.cellSize);
    const row = Math.floor((pos.y - this.gridStartY) / this.cellSize);
    
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return;
    }
    
    if (!this.selected) {
      this.selected = { row, col };
      this.draw();
    } else {
      // 检查是否相邻
      const dr = Math.abs(row - this.selected.row);
      const dc = Math.abs(col - this.selected.col);
      
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        // 交换
        this.swap(this.selected.row, this.selected.col, row, col);
      } else {
        // 重新选择
        this.selected = { row, col };
        this.draw();
      }
    }
  }

  swap(r1, c1, r2, c2) {
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
    
    this.selected = null;
    
    // 检查是否有匹配
    const matches = this.findMatches();
    
    if (matches.length > 0) {
      this.moves--;
      this.removeMatches(matches);
    } else {
      // 无效交换，恢复
      this.grid[r2][c2] = this.grid[r1][c1];
      this.grid[r1][c1] = temp;
      this.draw();
    }
  }

  findMatches() {
    const matches = [];
    
    // 横向检查
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols - 2; c++) {
        if (this.grid[r][c] === this.grid[r][c+1] &&
            this.grid[r][c] === this.grid[r][c+2] &&
            this.grid[r][c] >= 0) {
          matches.push({ row: r, col: c });
          matches.push({ row: r, col: c + 1 });
          matches.push({ row: r, col: c + 2 });
        }
      }
    }
    
    // 纵向检查
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows - 2; r++) {
        if (this.grid[r][c] === this.grid[r+1][c] &&
            this.grid[r][c] === this.grid[r+2][c] &&
            this.grid[r][c] >= 0) {
          matches.push({ row: r, col: c });
          matches.push({ row: r + 1, col: c });
          matches.push({ row: r + 2, col: c });
        }
      }
    }
    
    return matches;
  }

  removeMatches(matches) {
    this.animating = true;
    
    // 计算分数
    this.score += matches.length * 10;
    
    // 移除匹配的宝石
    for (const m of matches) {
      this.grid[m.row][m.col] = -1;
    }
    
    this.draw();
    
    // 填充空位
    setTimeout(() => {
      this.fillGrid();
      this.animating = false;
      
      // 检查新的匹配
      const newMatches = this.findMatches();
      if (newMatches.length > 0) {
        this.removeMatches(newMatches);
      } else {
        this.draw();
      }
    }, 300);
  }

  fillGrid() {
    // 下落填补空位
    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1;
      
      // 从底部向上填充
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] >= 0) {
          if (r !== emptyRow) {
            this.grid[emptyRow][c] = this.grid[r][c];
            this.grid[r][c] = -1;
          }
          emptyRow--;
        }
      }
      
      // 填充顶部空位
      for (let r = emptyRow; r >= 0; r--) {
        this.grid[r][c] = Math.floor(Math.random() * this.gemTypes.length);
      }
    }
  }
}

module.exports = Match3Game;
