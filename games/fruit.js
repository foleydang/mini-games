// 水果消消乐 - 水果掉落+三消游戏
import { Colors, drawRoundRect, drawButton, drawText, drawGradientBg, Storage, RankData } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';

// 关卡配置
const FRUIT_LEVELS = [
  { dropInterval: 1800, fruitCount: 4, name: '入门' },
  { dropInterval: 1400, fruitCount: 5, name: '简单' },
  { dropInterval: 1100, fruitCount: 6, name: '普通' },
  { dropInterval: 800, fruitCount: 7, name: '困难' },
  { dropInterval: 500, fruitCount: 8, name: '专家' }
];

// 水果列表
const FRUIT_EMOJIS = ['🍎', '🍍', '🍊', '🍇', '🍉', '🍑', '🍋', '🍓'];
const FRUIT_BG_COLORS = ['#ff4757', '#fbbf24', '#f97316', '#8b5cf6', '#ef4444', '#f9a8d4', '#fde047', '#ec4899'];

class FruitGame {
  constructor(canvas, ctx, designSize, onEnd, level = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'fruit';
    this.level = level;

    // 棋盘配置
    this.rows = 10;
    this.cols = 8;
    this.cellSize = 85;
    this.grid = []; // grid[row][col] = fruitType (-1 = empty)

    // 游戏状态
    this.score = 0;
    this.combo = 0;
    this.gameOver = false;
    this.animating = false;

    // 关卡配置
    const lvl = FRUIT_LEVELS[level] || FRUIT_LEVELS[0];
    this.dropInterval = lvl.dropInterval;
    this.fruitCount = lvl.fruitCount;
    this.fruitTypes = FRUIT_EMOJIS.slice(0, this.fruitCount);
    this.fruitColors = FRUIT_BG_COLORS.slice(0, this.fruitCount);

    // 掉落控制
    this.dropTimer = 0;
    this.droppingFruit = null; // { col, type, y, targetRow, bounced, bouncePhase }

    // 动画状态
    this.removeAnim = null;   // 消除动画 { gems, progress, scoreGain, combo }
    this.fallAnim = null;     // 下落动画 { gems, progress }
    this.bounceAnim = null;   // 弹跳动画 { gems, progress }

    // 选中状态
    this.selected = null; // { row, col }
    this.highlightGroup = []; // 高亮的可消除组

    // 按钮配置
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);
    this.soundEnabled = true;

    // 震动动画
    this.shakeAnim = null; // { progress }

    this.init();
  }

  init() {
    const gridWidth = this.cols * this.cellSize;
    const gridHeight = this.rows * this.cellSize;
    this.gridStartX = (this.designSize.width - gridWidth) / 2;
    this.gridStartY = this.backButton.y + 80;

    // 初始化空网格
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = -1; // 空格子
      }
    }

    // 开始掉落定时器
    this.dropTimer = 0;
    this.lastTime = Date.now();

    this.draw();
  }

  // ===== 触摸事件 =====
  onTouchStart(pos) {
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') {
      this.onEnd(this.score);
      return;
    }
    if (btn === 'shareBtn') {
      shareGame('水果消消乐', this.score);
      return;
    }
    if (btn === 'soundBtn') {
      this.soundEnabled = !this.soundEnabled;
      this.draw();
      return;
    }

    if (this.gameOver) {
      this.onEnd(this.score);
      return;
    }

    if (this.animating) return;

    // 网格坐标
    const col = Math.floor((pos.x - this.gridStartX) / this.cellSize);
    const row = Math.floor((pos.y - this.gridStartY) / this.cellSize);

    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    if (this.grid[row][col] < 0) return;

    // 点击水果：查找相邻相同水果组（3个及以上）
    const group = this.findConnectedGroup(row, col);

    if (group.length >= 3) {
      this.combo++;
      const baseScore = group.length * 10;
      const comboBonus = this.combo > 1 ? (this.combo - 1) * 15 : 0;
      const scoreGain = baseScore + comboBonus;
      this.startRemoveAnimation(group, scoreGain);
    } else {
      // 选中高亮
      this.selected = { row, col };
      this.highlightGroup = group;
      this.draw();
    }
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  // ===== 查找相连的相同水果组 =====
  findConnectedGroup(row, col) {
    const type = this.grid[row][col];
    if (type < 0) return [];

    const visited = new Set();
    const group = [];
    const stack = [{ row, col }];

    while (stack.length > 0) {
      const { row: r, col: c } = stack.pop();
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;
      if (this.grid[r][c] !== type) continue;

      visited.add(key);
      group.push({ row: r, col: c });

      // 四方向扩展
      stack.push({ row: r - 1, col: c });
      stack.push({ row: r + 1, col: c });
      stack.push({ row: r, col: c - 1 });
      stack.push({ row: r, col: c + 1 });
    }

    return group;
  }

  // ===== 消除动画 =====
  startRemoveAnimation(group, scoreGain) {
    this.animating = true;
    this.selected = null;
    this.highlightGroup = [];
    this.score += scoreGain;

    this.removeAnim = {
      gems: group,
      progress: 0,
      scoreGain: scoreGain
    };
    this.animateRemove();
  }

  animateRemove() {
    if (!this.removeAnim) return;

    this.removeAnim.progress += 0.06;
    this.draw();

    if (this.removeAnim.progress < 1) {
      setTimeout(() => this.animateRemove(), 30);
    } else {
      // 消除完成，移除水果
      for (const g of this.removeAnim.gems) {
        this.grid[g.row][g.col] = -1;
      }
      this.removeAnim = null;

      // 启动下落动画
      this.startFallAnimation();
    }
  }

  // ===== 下落动画 =====
  startFallAnimation() {
    const fallingGems = [];

    for (let c = 0; c < this.cols; c++) {
      // 从底部往上找空位，让上方水果下落
      let writeRow = this.rows - 1;
      const columnGems = [];

      // 从底部往上扫描，收集非空水果
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] >= 0) {
          if (r !== writeRow) {
            columnGems.push({ fromRow: r, toRow: writeRow, col: c, type: this.grid[r][c] });
            this.grid[writeRow][c] = this.grid[r][c];
            this.grid[r][c] = -1;
          }
          writeRow--;
        }
      }

      fallingGems.push(...columnGems);
    }

    if (fallingGems.length === 0) {
      this.animating = false;
      // 检查是否有新的可消除组合（自动消除）
      this.checkAutoMatch();
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

      // 下落后检查弹跳效果
      const bounceGems = this.fallAnim ? this.fallAnim.gems : [];
      this.startBounceAnimation();

      // 检查自动消除
      this.animating = false;
      this.checkAutoMatch();
    }
  }

  // ===== 弹跳动画 =====
  startBounceAnimation() {
    this.bounceAnim = {
      progress: 0
    };
    this.animateBounce();
  }

  animateBounce() {
    if (!this.bounceAnim) return;

    this.bounceAnim.progress += 0.08;
    this.draw();

    if (this.bounceAnim.progress < 1) {
      setTimeout(() => this.animateBounce(), 30);
    } else {
      this.bounceAnim = null;
      this.draw();
    }
  }

  // ===== 自动检查连锁消除 =====
  checkAutoMatch() {
    // 不主动自动消除，等玩家点击
    // 但重置combo如果一段时间没有操作
    this.draw();
  }

  // ===== 游戏更新（掉落逻辑） =====
  update() {
    if (this.gameOver) return;
    if (this.animating) return;

    const now = Date.now();
    this.dropTimer += (now - this.lastTime);
    this.lastTime = now;

    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      this.dropNewFruit();
    }

    // 更新掉落中的水果
    if (this.droppingFruit) {
      this.updateDroppingFruit();
    }
  }

  // ===== 掉落新水果 =====
  dropNewFruit() {
    // 随机选一列
    const col = Math.floor(Math.random() * this.cols);
    const type = Math.floor(Math.random() * this.fruitCount);

    // 检查最顶行是否已有水果（游戏结束条件）
    if (this.grid[0][col] >= 0) {
      // 这列满了，检查是否所有列顶部都满了
      let allTopFull = true;
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[0][c] < 0) {
          allTopFull = false;
          break;
        }
      }
      if (allTopFull) {
        this.gameOver = true;
        this.draw();
        RankData.save(this.gameId, this.score);
        return;
      }
      // 某列满了，选其他列
      const availableCols = [];
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[0][c] < 0) availableCols.push(c);
      }
      if (availableCols.length === 0) {
        this.gameOver = true;
        this.draw();
        RankData.save(this.gameId, this.score);
        return;
      }
      this.dropNewFruitToCol(availableCols[Math.floor(Math.random() * availableCols.length)]);
      return;
    }

    this.dropNewFruitToCol(col);
  }

  dropNewFruitToCol(col) {
    const type = Math.floor(Math.random() * this.fruitCount);

    // 找到该列最低的空行
    let targetRow = -1;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r][col] < 0) {
        targetRow = r;
        break;
      }
    }

    if (targetRow < 0) return; // 该列满了

    // 开始掉落动画
    this.animating = true;
    this.droppingFruit = {
      col: col,
      type: type,
      y: this.gridStartY - this.cellSize, // 从网格上方开始
      targetRow: targetRow,
      speed: 12, // 每帧掉落的像素速度
      bounced: false,
      bounceY: 0,
      bouncePhase: 0
    };

    this.animateDrop();
  }

  // ===== 掉落动画 =====
  animateDrop() {
    if (!this.droppingFruit) return;

    const df = this.droppingFruit;
    const targetY = this.gridStartY + df.targetRow * this.cellSize + this.cellSize / 2;

    if (!df.bounced) {
      // 下落阶段
      df.y += df.speed;

      if (df.y >= targetY) {
        df.y = targetY;
        df.bounced = true;
        df.bouncePhase = 0;
        // 先在网格中放置水果
        this.grid[df.targetRow][df.col] = df.type;
      }
      this.draw();
      setTimeout(() => this.animateDrop(), 30);
    } else {
      // 弹跳阶段
      df.bouncePhase += 0.15;
      const bounceHeight = 15 * Math.sin(df.bouncePhase) * Math.exp(-df.bouncePhase * 0.5);
      df.bounceY = bounceHeight;

      if (df.bouncePhase >= 3) {
        // 弹跳结束
        this.droppingFruit = null;
        this.animating = false;
        this.draw();
        return;
      }
      this.draw();
      setTimeout(() => this.animateDrop(), 30);
    }
  }

  updateDroppingFruit() {
    // 已由 animateDrop 处理
  }

  // ===== 绘制 =====
  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop, safeBottom } = this.designSize;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawGradientBg(ctx, width, height, '#fef9c3', '#fde68a');

    // 标题和分数
    drawText(ctx, '水果消消乐', width / 2, safeTop + 80, { fontSize: 48, color: '#d97706', bold: true });

    const levelName = FRUIT_LEVELS[this.level]?.name || '入门';
    drawText(ctx, `分数: ${this.score}  关卡: ${levelName}  连击: ${this.combo}`, width / 2, safeTop + 130, { fontSize: 24, color: '#92400e' });

    // 底部按钮
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);

    // 网格背景
    const gridWidth = this.cols * this.cellSize;
    const gridHeight = this.rows * this.cellSize;

    // 网格外框
    drawRoundRect(ctx, this.gridStartX - 10, this.gridStartY - 10, gridWidth + 20, gridHeight + 20, 16, '#92400e');

    // 网格格子背景
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = this.gridStartX + c * this.cellSize;
        const y = this.gridStartY + r * this.cellSize;
        const bgColor = (r + c) % 2 === 0 ? '#fef3c7' : '#fde68a';
        drawRoundRect(ctx, x + 2, y + 2, this.cellSize - 4, this.cellSize - 4, 8, bgColor);
      }
    }

    // 绘制水果
    this.drawFruits();

    // 绘制掉落中的水果
    if (this.droppingFruit) {
      const df = this.droppingFruit;
      const x = this.gridStartX + df.col * this.cellSize + this.cellSize / 2;
      const y = df.y - df.bounceY;
      this.drawFruitEmoji(x, y, df.type, 1, 1);
    }

    // 高亮选中组
    if (this.highlightGroup.length > 0 && !this.animating) {
      for (const g of this.highlightGroup) {
        const x = this.gridStartX + g.col * this.cellSize + this.cellSize / 2;
        const y = this.gridStartY + g.row * this.cellSize + this.cellSize / 2;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, this.cellSize * 0.38 + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Combo 提示
    if (this.combo > 1 && this.removeAnim) {
      const comboText = `${this.combo}连击!`;
      const centerX = this.designSize.width / 2;
      const centerY = this.gridStartY + this.rows * this.cellSize / 2;
      ctx.globalAlpha = Math.max(0, 1 - this.removeAnim.progress);
      drawText(ctx, comboText, centerX, centerY, { fontSize: 60, color: '#ef4444', bold: true });
      ctx.globalAlpha = 1;
    }

    // 游戏结束
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '游戏结束', width / 2, height / 2 - 50, { fontSize: 48, color: '#fff', bold: true });
      drawText(ctx, `得分: ${this.score}`, width / 2, height / 2 + 20, { fontSize: 32, color: '#fff' });
      drawHint(ctx, this.designSize, '点击返回');
    }
  }

  drawFruits() {
    const ctx = this.ctx;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const type = this.grid[r][c];
        if (type < 0) continue;

        // 跳过正在掉落的水果（由掉落动画绘制）
        if (this.droppingFruit && this.droppingFruit.targetRow === r && this.droppingFruit.col === c) continue;

        let x = this.gridStartX + c * this.cellSize + this.cellSize / 2;
        let y = this.gridStartY + r * this.cellSize + this.cellSize / 2;
        let alpha = 1;
        let scale = 1;

        // 消除动画
        if (this.removeAnim) {
          const gem = this.removeAnim.gems.find(g => g.row === r && g.col === c);
          if (gem) {
            alpha = 1 - this.removeAnim.progress;
            scale = 1 + this.removeAnim.progress * 0.3; // 放大后缩小消失
            if (this.removeAnim.progress > 0.6) {
              scale = 1 + 0.3 - (this.removeAnim.progress - 0.6) * 2;
            }
            // 闪光效果
            ctx.save();
            ctx.globalAlpha = 0.3 * (1 - this.removeAnim.progress);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x, y, this.cellSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // 下落动画
        if (this.fallAnim) {
          const gem = this.fallAnim.gems.find(g => g.toRow === r && g.col === c);
          if (gem) {
            const startY = this.gridStartY + gem.fromRow * this.cellSize + this.cellSize / 2;
            y = this.lerp(startY, y, this.fallAnim.progress);
          }
        }

        // 弹跳动画（下落后的轻微弹跳）
        if (this.bounceAnim) {
          const bounceHeight = 8 * Math.sin(this.bounceAnim.progress * Math.PI) * (1 - this.bounceAnim.progress);
          y -= bounceHeight;
        }

        this.drawFruitEmoji(x, y, type, alpha, scale);
      }
    }
  }

  drawFruitEmoji(x, y, type, alpha = 1, scale = 1) {
    const ctx = this.ctx;
    const emoji = this.fruitTypes[type];
    const fontSize = Math.floor(this.cellSize * 0.55 * scale);

    ctx.globalAlpha = alpha;
    ctx.font = `${fontSize}px "PingFang SC", "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
    ctx.globalAlpha = 1;
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  destroy() {
    this.gameOver = true;
  }
}

export default FruitGame;
