// 水果消消乐 - 上方水果遮挡层 + 点击掉落进窄桶 + 碰撞消除
import { drawRoundRect, drawButton, drawText, drawGradientBg, drawCircle, RankData, Storage } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';

// 水果定义
const FRUITS = [
  { emoji: '🍎', radius: 30, color: '#ff4757' },
  { emoji: '🍊', radius: 32, color: '#f97316' },
  { emoji: '🍇', radius: 27, color: '#8b5cf6' },
  { emoji: '🍓', radius: 25, color: '#ec4899' },
  { emoji: '🍋', radius: 28, color: '#fde047' },
  { emoji: '🍑', radius: 31, color: '#f9a8d4' },
];

const GRAVITY = 0.7;
const BOUNCE_FACTOR = 0.2;
const BUCKET_WIDTH = 150;

class FruitGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'fruit';

    this.score = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.soundEnabled = true;

    // 布局
    const { width, height, safeTop, safeBottom } = designSize;
    this.bucketLeft = (width - BUCKET_WIDTH) / 2;
    this.bucketRight = this.bucketLeft + BUCKET_WIDTH;
    this.bucketTop = height - safeBottom - 160;
    this.bucketBottom = height - safeBottom - 30;

    // 上方水果区域
    this.fruitAreaTop = safeTop + 160;
    this.fruitAreaLeft = 30;
    this.fruitAreaRight = width - 30;

    // 上方水果层（类似羊了个羊遮挡）
    this.topFruits = []; // { x, y, type, layer, blocked, removed }

    // 桶内水果（物理掉落）
    this.bucketFruits = []; // { x, y, vy, type, radius, settled, emoji, color }

    // 正在掉落的水果（从上方到桶）
    this.droppingFruit = null; // { x, y, vy, type, radius, emoji, color, targetReached }

    // 消除动画
    this.removing = [];
    this.removeProgress = 0;
    this.eliminating = false;
    this.combo = 0;

    // 消除分数提示
    this.scorePopup = null; // { text, x, y, progress }

    // 按钮配置
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.init();
  }

  init() {
    this.generateFruitBoard();
    this.draw();
    this.gameLoop();
  }

  // 生成上方水果层
  generateFruitBoard() {
    this.topFruits = [];
    const { width } = this.designSize;
    const areaWidth = this.fruitAreaRight - this.fruitAreaLeft;
    const areaHeight = this.bucketTop - this.fruitAreaTop - 60;

    // 生成多层水果，确保每种水果出现偶数次（可以消除完）
    const totalFruits = 54; // 6种 × 9个
    const layers = 4;

    // 先生成水果类型列表，每种9个
    const types = [];
    for (let t = 0; t < FRUITS.length; t++) {
      for (let i = 0; i < 9; i++) {
        types.push(t);
      }
    }
    this.shuffleArray(types);

    // 每层的配置
    const layerConfigs = [
      { count: 20, offsetX: 0, offsetY: 0 },
      { count: 16, offsetX: 18, offsetY: 16 },
      { count: 12, offsetX: 36, offsetY: 32 },
      { count: 6, offsetX: 54, offsetY: 48 },
    ];

    let typeIdx = 0;
    for (let layer = 0; layer < layers; layer++) {
      const config = layerConfigs[layer];
      const count = Math.min(config.count, types.length - typeIdx);

      // 在区域内随机放置（但有一定结构）
      for (let i = 0; i < count; i++) {
        const fruit = FRUITS[types[typeIdx]];
        const radius = fruit.radius + (Math.random() - 0.5) * 4;

        // 网格化放置，但加随机偏移让它看起来自然
        const cols = Math.ceil(Math.sqrt(count * 1.5));
        const rows = Math.ceil(count / cols);
        const cellW = (areaWidth - 60) / cols;
        const cellH = (areaHeight - 40) / rows;
        const col = i % cols;
        const row = Math.floor(i / cols);

        const baseX = this.fruitAreaLeft + 30 + col * cellW + cellW / 2;
        const baseY = this.fruitAreaTop + row * cellH + cellH / 2;

        const x = baseX + config.offsetX + (Math.random() - 0.5) * 20;
        const y = baseY + config.offsetY + (Math.random() - 0.5) * 15;

        this.topFruits.push({
          x, y,
          type: types[typeIdx],
          layer: layer,
          radius: radius,
          emoji: fruit.emoji,
          color: fruit.color,
          blocked: false,  // 是否被上层遮挡（动态计算）
          removed: false,
        });
        typeIdx++;
      }
    }

    this.updateBlockedStatus();
  }

  // 更新哪些水果被遮挡
  updateBlockedStatus() {
    for (const f of this.topFruits) {
      if (f.removed) { f.blocked = false; continue; }
      f.blocked = false;

      // 检查是否有上层水果遮挡它
      for (const other of this.topFruits) {
        if (other.removed || other.layer <= f.layer) continue;
        // 检查是否重叠
        const dx = other.x - f.x;
        const dy = other.y - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < f.radius + other.radius - 4) {
          f.blocked = true;
          break;
        }
      }
    }
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ===== 游戏循环 =====
  gameLoop() {
    if (this.gameOver || this.gameWon) return;

    // 更新掉落水果
    if (this.droppingFruit) {
      this.droppingFruit.vy += GRAVITY;
      this.droppingFruit.y += this.droppingFruit.vy;

      // 进入桶区域后检查碰撞
      if (this.droppingFruit.y + this.droppingFruit.radius >= this.bucketTop) {
        // 限制x在桶内
        this.droppingFruit.x = Math.max(this.bucketLeft + this.droppingFruit.radius + 2,
          Math.min(this.bucketRight - this.droppingFruit.radius - 2, this.droppingFruit.x));
      }

      // 碰桶底
      if (this.droppingFruit.y + this.droppingFruit.radius >= this.bucketBottom) {
        this.droppingFruit.y = this.bucketBottom - this.droppingFruit.radius;
        if (this.droppingFruit.vy > 4) {
          this.droppingFruit.vy = -this.droppingFruit.vy * BOUNCE_FACTOR;
        } else {
          this.droppingFruit.vy = 0;
          this.droppingFruit.settled = true;
        }
      }

      // 碰桶内其他水果
      if (!this.droppingFruit.settled) {
        for (const bf of this.bucketFruits) {
          if (!bf.settled) continue;
          const dx = bf.x - this.droppingFruit.x;
          const dy = bf.y - this.droppingFruit.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = this.droppingFruit.radius + bf.radius;

          if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // 阻挡：把掉落水果推回去
            this.droppingFruit.x -= nx * overlap;
            this.droppingFruit.y -= ny * overlap;

            if (ny < -0.3) {
              // 从上方落到其他水果上
              if (this.droppingFruit.vy > 4) {
                this.droppingFruit.vy = -this.droppingFruit.vy * BOUNCE_FACTOR;
              } else {
                this.droppingFruit.vy = 0;
                this.droppingFruit.settled = true;
              }
            } else {
              this.droppingFruit.vy *= 0.5;
            }
          }
        }
      }

      // 微速检测落地
      if (!this.droppingFruit.settled && this.droppingFruit.vy < 1 && this.droppingFruit.vy >= 0) {
        if (this.droppingFruit.y + this.droppingFruit.radius >= this.bucketBottom - 3 || this.hasBucketSupport(this.droppingFruit)) {
          this.droppingFruit.settled = true;
          this.droppingFruit.vy = 0;
        }
      }

      // 掉落完成 → 进桶
      if (this.droppingFruit.settled) {
        this.bucketFruits.push(this.droppingFruit);
        this.droppingFruit = null;
        this.checkBucketElimination();
      }
    }

    // 处理桶内未稳定水果
    for (const bf of this.bucketFruits) {
      if (!bf.settled) {
        bf.vy += GRAVITY;
        bf.y += bf.vy;

        // 碰桶底
        if (bf.y + bf.radius >= this.bucketBottom) {
          bf.y = this.bucketBottom - bf.radius;
          bf.vy = 0;
          bf.settled = true;
        }

        // 碰其他水果
        for (const other of this.bucketFruits) {
          if (other === bf || !other.settled) continue;
          const dx = other.x - bf.x;
          const dy = other.y - bf.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = bf.radius + other.radius;
          if (dist < minDist && dist > 0) {
            bf.x -= (dx / dist) * (minDist - dist);
            bf.y -= (dy / dist) * (minDist - dist);
            bf.vy = 0;
            bf.settled = true;
          }
        }
      }
    }

    // 消除动画
    if (this.eliminating) {
      this.removeProgress += 0.06;
      if (this.removeProgress >= 1) {
        this.bucketFruits = this.bucketFruits.filter(f => !this.removing.includes(f));
        this.removing = [];
        this.removeProgress = 0;
        this.eliminating = false;
        // 上方水果可能需要下落
        this.unsettleBucket();
      }
    }

    // 分数弹窗动画
    if (this.scorePopup) {
      this.scorePopup.progress += 0.04;
      if (this.scorePopup.progress >= 1) {
        this.scorePopup = null;
      }
    }

    // 检查通关
    this.checkWin();

    // 检查溢出
    this.checkOverflow();

    this.draw();
    setTimeout(() => this.gameLoop(), 33);
  }

  hasBucketSupport(fruit) {
    for (const bf of this.bucketFruits) {
      if (bf === fruit || !bf.settled) continue;
      const dx = bf.x - fruit.x;
      const dy = bf.y - fruit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dy > 0 && dist < fruit.radius + bf.radius + 6) return true;
    }
    return false;
  }

  unsettleBucket() {
    for (const bf of this.bucketFruits) {
      if (!this.hasBucketSupport(bf) && bf.y + bf.radius < this.bucketBottom - 3) {
        bf.settled = false;
        bf.vy = 2;
      }
    }
  }

  // 检查桶内消除
  checkBucketElimination() {
    let found = true;
    while (found) {
      found = false;
      for (let i = 0; i < this.bucketFruits.length; i++) {
        const a = this.bucketFruits[i];
        if (!a.settled) continue;
        for (let j = i + 1; j < this.bucketFruits.length; j++) {
          const b = this.bucketFruits[j];
          if (!b.settled) continue;
          if (a.type !== b.type) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < a.radius + b.radius + 6) {
            this.removing.push(a, b);
            this.eliminating = true;
            this.removeProgress = 0;
            this.combo++;
            const gain = 10 * this.combo;
            this.score += gain;
            this.scorePopup = {
              text: `+${gain}`,
              x: (a.x + b.x) / 2,
              y: Math.min(a.y, b.y) - 30,
              progress: 0
            };
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  }

  checkWin() {
    if (this.topFruits.every(f => f.removed) && this.bucketFruits.length === 0 && !this.droppingFruit && !this.eliminating) {
      this.gameWon = true;
      RankData.save(this.gameId, this.score);
    }
  }

  checkOverflow() {
    for (const bf of this.bucketFruits) {
      if (bf.settled && bf.y - bf.radius < this.bucketTop + 8) {
        this.gameOver = true;
        RankData.save(this.gameId, this.score);
        return;
      }
    }
  }

  // ===== 触摸 =====
  onTouchStart(pos) {
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') {
      RankData.save(this.gameId, this.score);
      this.onEnd(this.score);
      return;
    }
    if (btn === 'soundBtn') {
      this.soundEnabled = !this.soundEnabled;
      this.draw();
      return;
    }

    if (this.gameOver || this.gameWon) {
      RankData.save(this.gameId, this.score);
      this.onEnd(this.score);
      return;
    }

    if (this.droppingFruit || this.eliminating) return;

    // 点击上方水果
    // 从最上层开始检查
    const maxLayer = Math.max(...this.topFruits.filter(f => !f.removed).map(f => f.layer), 0);
    for (let layer = maxLayer; layer >= 0; layer--) {
      for (const f of this.topFruits) {
        if (f.removed || f.layer !== layer) continue;
        if (f.blocked) continue;

        const dx = pos.x - f.x;
        const dy = pos.y - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= f.radius) {
          this.clickFruit(f);
          return;
        }
      }
    }
  }

  // 点击可点击的水果 → 开始掉落
  clickFruit(fruit) {
    fruit.removed = true;
    this.updateBlockedStatus();

    const f = FRUITS[fruit.type];
    this.droppingFruit = {
      x: fruit.x,
      y: fruit.y,
      vy: 0,
      type: fruit.type,
      radius: fruit.radius,
      emoji: fruit.emoji,
      color: fruit.color,
      settled: false,
    };
    this.combo = 0;
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  // ===== 绘制 =====
  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop, safeBottom } = this.designSize;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawGradientBg(ctx, width, height, '#fef9c3', '#fde68a');

    // 标题
    drawText(ctx, '水果消消乐', width / 2, safeTop + 70, { fontSize: 48, color: '#d97706', bold: true });
    drawText(ctx, `分数: ${this.score}`, width / 2, safeTop + 120, { fontSize: 26, color: '#92400e' });

    // 底部按钮
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);

    // 绘制上方水果区
    this.drawTopFruits();

    // 绘制桶
    this.drawBucket();

    // 绘制桶内水果
    this.drawBucketFruits();

    // 绘制正在掉落的水果
    if (this.droppingFruit) {
      this.drawFruitCircle(this.droppingFruit, 1, 1);
    }

    // 消除动画
    if (this.eliminating) {
      const p = this.removeProgress;
      for (const f of this.removing) {
        const scale = 1 + p * 0.4 - p * p * 1.4;
        const alpha = 1 - p;
        this.drawFruitCircle(f, Math.max(0, alpha), Math.max(0.2, scale));
      }
    }

    // 分数弹窗
    if (this.scorePopup) {
      const p = this.scorePopup.progress;
      ctx.globalAlpha = 1 - p;
      drawText(ctx, this.scorePopup.text, this.scorePopup.x, this.scorePopup.y - p * 30, { fontSize: 36, color: '#ef4444', bold: true });
      ctx.globalAlpha = 1;
    }

    // 通关或失败
    if (this.gameWon) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '🎉 通关！', width / 2, height / 2 - 50, { fontSize: 48, color: '#fff', bold: true });
      drawText(ctx, `得分: ${this.score}`, width / 2, height / 2 + 20, { fontSize: 32, color: '#fff' });
      drawHint(ctx, this.designSize, '点击返回');
    } else if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '失败了 😢', width / 2, height / 2 - 50, { fontSize: 48, color: '#fff', bold: true });
      drawText(ctx, `得分: ${this.score}`, width / 2, height / 2 + 20, { fontSize: 32, color: '#fff' });
      drawHint(ctx, this.designSize, '点击返回');
    }
  }

  drawTopFruits() {
    const ctx = this.ctx;
    const maxLayer = Math.max(...this.topFruits.filter(f => !f.removed).map(f => f.layer), 0);

    for (let layer = 0; layer <= maxLayer; layer++) {
      for (const f of this.topFruits) {
        if (f.removed || f.layer !== layer) continue;

        const layerRatio = (layer + 1) / (maxLayer + 1);
        const alpha = f.blocked ? 0.35 : (0.5 + 0.5 * layerRatio);
        const scale = f.blocked ? 0.85 : (0.85 + 0.15 * layerRatio);

        // 阻挡的水果：暗色、不可点击样式
        this.drawFruitCircle(f, alpha, scale, f.blocked);
      }
    }
  }

  drawFruitCircle(f, alpha, scale, blocked = false) {
    const ctx = this.ctx;
    const r = f.radius * scale;

    ctx.globalAlpha = alpha;

    // 圆形背景
    if (blocked) {
      drawCircle(ctx, f.x, f.y, r, '#d1d5db');
    } else {
      drawCircle(ctx, f.x, f.y, r, f.color);
      // 高亮边框（可点击）
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // emoji
    ctx.font = `${Math.floor(r * 1.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.emoji, f.x, f.y);

    ctx.globalAlpha = 1;
  }

  drawBucket() {
    const ctx = this.ctx;
    const wallW = 14;

    // 桶底
    drawRoundRect(ctx, this.bucketLeft - wallW, this.bucketBottom, BUCKET_WIDTH + wallW * 2, wallW, 6, '#78350f');

    // 左壁
    drawRoundRect(ctx, this.bucketLeft - wallW, this.bucketTop - 5, wallW, this.bucketBottom - this.bucketTop + 5, 4, '#78350f');

    // 右壁
    drawRoundRect(ctx, this.bucketRight, this.bucketTop - 5, wallW, this.bucketBottom - this.bucketTop + 5, 4, '#78350f');

    // 桶内背景
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(this.bucketLeft, this.bucketTop, BUCKET_WIDTH, this.bucketBottom - this.bucketTop);

    // 溢出警示线
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(this.bucketLeft, this.bucketTop + 8);
    ctx.lineTo(this.bucketRight, this.bucketTop + 8);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawBucketFruits() {
    for (const f of this.bucketFruits) {
      if (this.removing.includes(f)) continue;
      this.drawFruitCircle(f, 1, 1);
    }
  }

  destroy() {
    this.gameOver = true;
  }
}

export default FruitGame;
