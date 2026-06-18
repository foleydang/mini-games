// 水果消消乐 - 水果掉落进桶，相同碰撞消除
import { drawRoundRect, drawButton, drawText, drawGradientBg, drawCircle, RankData, Storage } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';

// 水果定义：emoji + 半径（不同大小显得随机自然）
const FRUITS = [
  { emoji: '🍎', radius: 28, color: '#ff4757' },
  { emoji: '🍊', radius: 30, color: '#f97316' },
  { emoji: '🍇', radius: 26, color: '#8b5cf6' },
  { emoji: '🍓', radius: 24, color: '#ec4899' },
  { emoji: '🍋', radius: 27, color: '#fde047' },
  { emoji: '🍑', radius: 29, color: '#f9a8d4' },
  { emoji: '🍉', radius: 32, color: '#ef4444' },
  { emoji: '🍍', radius: 31, color: '#fbbf24' },
];

const GRAVITY = 0.6;       // 重力加速度
const BOUNCE = 0.25;       // 弹跳系数
const SETTLE_THRESHOLD = 0.8; // 速度小于此值视为落地
const DROP_INTERVAL = 1200; // 新水果掉落间隔(ms)
const BUCKET_WIDTH = 140;  // 桶宽度（一列）

class FruitGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'fruit';

    this.score = 0;
    this.gameOver = false;
    this.combo = 0;
    this.soundEnabled = true;

    // 桶的位置
    const { width, height, safeTop, safeBottom } = designSize;
    this.bucketLeft = (width - BUCKET_WIDTH) / 2;
    this.bucketRight = this.bucketLeft + BUCKET_WIDTH;
    this.bucketTop = safeTop + 180;
    this.bucketBottom = height - safeBottom - 90;

    // 水果物理对象列表
    this.fruits = []; // { x, y, vy, type, radius, settled, emoji, color }
    this.removing = []; // 正在消除动画的水果
    this.removeProgress = 0;

    // 下一个要掉落的水果
    this.nextFruit = null;
    this.nextDropTime = Date.now() + 800;

    // 消除动画
    this.eliminating = false;

    // 按钮配置
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.init();
  }

  init() {
    this.spawnNext();
    this.draw();
    this.gameLoop();
  }

  // 生成下一个掉落的水果
  spawnNext() {
    const type = Math.floor(Math.random() * FRUITS.length);
    const fruit = FRUITS[type];
    // 随机偏移让水果不是严格居中，更自然
    const offsetX = (Math.random() - 0.5) * 40;
    this.nextFruit = {
      x: (this.bucketLeft + this.bucketRight) / 2 + offsetX,
      y: this.bucketTop - 60,
      vy: 0,
      type: type,
      radius: fruit.radius + (Math.random() - 0.5) * 4, // 半径随机波动
      settled: false,
      emoji: fruit.emoji,
      color: fruit.color,
    };
    this.nextDropTime = Date.now() + DROP_INTERVAL;
  }

  // 主游戏循环
  gameLoop() {
    if (this.gameOver) return;

    const now = Date.now();

    // 自动掉落新水果
    if (!this.nextFruit && !this.eliminating && now >= this.nextDropTime) {
      this.spawnNext();
    }

    // 掉落当前水果
    if (this.nextFruit && !this.eliminating) {
      this.updateFruit(this.nextFruit);
      if (this.nextFruit.settled) {
        this.fruits.push(this.nextFruit);
        this.nextFruit = null;
        this.checkElimination();
      }
    }

    // 处理已落地水果的微小调整（消除后上方水果可能需要继续下落）
    for (const f of this.fruits) {
      if (!f.settled) {
        this.updateFruit(f);
      }
    }

    // 消除动画推进
    if (this.eliminating) {
      this.removeProgress += 0.08;
      if (this.removeProgress >= 1) {
        // 移除消除的水果
        this.fruits = this.fruits.filter(f => !this.removing.includes(f));
        this.removing = [];
        this.removeProgress = 0;
        this.eliminating = false;
        this.combo = 0;
        // 消除后上方水果需要下落
        this.unsettleAbove();
      }
    }

    // 检查桶是否溢出
    this.checkOverflow();

    this.draw();
    setTimeout(() => this.gameLoop(), 33);
  }

  // 更新单个水果物理
  updateFruit(fruit) {
    fruit.vy += GRAVITY;
    fruit.y += fruit.vy;

    // 碰桶底
    if (fruit.y + fruit.radius >= this.bucketBottom) {
      fruit.y = this.bucketBottom - fruit.radius;
      if (fruit.vy > 3) {
        fruit.vy = -fruit.vy * BOUNCE;
      } else {
        fruit.vy = 0;
        fruit.settled = true;
      }
    }

    // 碰桶壁
    if (fruit.x - fruit.radius < this.bucketLeft) {
      fruit.x = this.bucketLeft + fruit.radius;
    }
    if (fruit.x + fruit.radius > this.bucketRight) {
      fruit.x = this.bucketRight - fruit.radius;
    }

    // 碰其他已落地水果
    for (const other of this.fruits) {
      if (other === fruit) continue;
      this.resolveCollision(fruit, other);
    }

    // 判断落地（速度足够小）
    if (!fruit.settled && fruit.vy < SETTLE_THRESHOLD && fruit.vy >= 0) {
      // 检查是否支撑在什么东西上
      if (fruit.y + fruit.radius >= this.bucketBottom - 2 || this.hasSupport(fruit)) {
        fruit.settled = true;
        fruit.vy = 0;
      }
    }
  }

  // 碰撞处理
  resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;

    if (dist < minDist && dist > 0) {
      // 分开重叠
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      if (b.settled) {
        // a 靠已落地的 b
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        // 碰到上方或侧面 → 反弹或停下
        if (ny < -0.3) {
          // 从上方落下碰到
          if (a.vy > 3) {
            a.vy = -a.vy * BOUNCE;
          } else {
            a.vy = 0;
          }
        } else {
          // 侧面碰撞
          a.vy *= 0.5;
          a.x -= nx * 2;
        }
      } else if (a.settled) {
        b.x += nx * overlap;
        b.y += ny * overlap;
      } else {
        // 两个都在运动，各分一半
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
      }
    }
  }

  // 检查水果是否有支撑（下方有其他水果或桶底）
  hasSupport(fruit) {
    for (const other of this.fruits) {
      if (other === fruit || !other.settled) continue;
      const dx = other.x - fruit.x;
      const dy = other.y - fruit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // 下方接触 = other 在 fruit 下方且距离接近
      if (dy > 0 && dist < fruit.radius + other.radius + 4) {
        return true;
      }
    }
    return false;
  }

  // 消除后让上方水果重新下落
  unsettleAbove() {
    // 找到每个水果下方是否有支撑，没有的就 unsettle
    for (const f of this.fruits) {
      f.settled = false;
      f.vy = 1;
    }
    // 桶底的立刻 settle
    for (const f of this.fruits) {
      if (f.y + f.radius >= this.bucketBottom - 4) {
        f.settled = true;
        f.vy = 0;
      }
    }
  }

  // 检查消除：相邻相同水果
  checkElimination() {
    let found = true;
    while (found) {
      found = false;
      for (let i = 0; i < this.fruits.length; i++) {
        const a = this.fruits[i];
        if (!a.settled) continue;
        for (let j = i + 1; j < this.fruits.length; j++) {
          const b = this.fruits[j];
          if (!b.settled) continue;
          if (a.type !== b.type) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // 两个相同水果接触就消除
          if (dist < a.radius + b.radius + 6) {
            this.removing.push(a, b);
            this.eliminating = true;
            this.removeProgress = 0;
            this.combo++;
            this.score += 10 * this.combo;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  }

  // 检查桶是否溢出
  checkOverflow() {
    for (const f of this.fruits) {
      if (f.settled && f.y - f.radius < this.bucketTop + 10) {
        this.gameOver = true;
        RankData.save(this.gameId, this.score);
        break;
      }
    }
  }

  // ===== 绘制 =====
  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop, safeBottom } = this.designSize;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawGradientBg(ctx, width, height, '#fef9c3', '#fde68a');

    // 标题和分数
    drawText(ctx, '水果消消乐', width / 2, safeTop + 70, { fontSize: 48, color: '#d97706', bold: true });
    drawText(ctx, `分数: ${this.score}`, width / 2, safeTop + 120, { fontSize: 28, color: '#92400e' });

    // 底部按钮
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);

    // 绘制桶
    this.drawBucket();

    // 绘制桶内水果
    this.drawFruits();

    // 绘制正在掉落的水果
    if (this.nextFruit) {
      this.drawSingleFruit(this.nextFruit, 1, 1);
    }

    // 消除动画
    if (this.eliminating) {
      const p = this.removeProgress;
      for (const f of this.removing) {
        const scale = 1 + p * 0.5 - p * p * 1.5;
        const alpha = 1 - p;
        this.drawSingleFruit(f, Math.max(0, alpha), Math.max(0.3, scale));
      }
      // 消除特效文字
      if (this.combo > 1) {
        const centerX = width / 2;
        const centerY = this.bucketTop + (this.bucketBottom - this.bucketTop) * 0.4;
        ctx.globalAlpha = 1 - p;
        drawText(ctx, `${this.combo}连击!`, centerX, centerY, { fontSize: 50, color: '#ef4444', bold: true });
        ctx.globalAlpha = 1;
      }
    }

    // 游戏结束
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '游戏结束 😢', width / 2, height / 2 - 50, { fontSize: 48, color: '#fff', bold: true });
      drawText(ctx, `得分: ${this.score}`, width / 2, height / 2 + 20, { fontSize: 32, color: '#fff' });
      drawHint(ctx, this.designSize, '点击返回');
    }
  }

  drawBucket() {
    const ctx = this.ctx;
    const wallWidth = 14;

    // 桶底
    drawRoundRect(ctx, this.bucketLeft - wallWidth, this.bucketBottom, BUCKET_WIDTH + wallWidth * 2, wallWidth, 6, '#92400e');

    // 左壁
    drawRoundRect(ctx, this.bucketLeft - wallWidth, this.bucketTop, wallWidth, this.bucketBottom - this.bucketTop, 6, '#92400e');

    // 右壁
    drawRoundRect(ctx, this.bucketRight, this.bucketTop, wallWidth, this.bucketBottom - this.bucketTop, 6, '#92400e');

    // 桶内背景
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(this.bucketLeft, this.bucketTop, BUCKET_WIDTH, this.bucketBottom - this.bucketTop);

    // 桶口标记线
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(this.bucketLeft, this.bucketTop + 10);
    ctx.lineTo(this.bucketRight, this.bucketTop + 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawFruits() {
    for (const f of this.fruits) {
      if (this.removing.includes(f)) continue; // 消除中的单独绘制
      this.drawSingleFruit(f, 1, 1);
    }
  }

  drawSingleFruit(f, alpha, scale) {
    const ctx = this.ctx;
    const r = f.radius * scale;

    ctx.globalAlpha = alpha;

    // 水果圆形背景
    drawCircle(ctx, f.x, f.y, r, f.color);

    // 水果emoji
    ctx.font = `${Math.floor(r * 1.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(f.emoji, f.x, f.y);

    ctx.globalAlpha = 1;
  }

  // ===== 触摸 =====
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
    if (this.gameOver) {
      this.onEnd(this.score);
      return;
    }

    // 点击可以微调掉落水果的水平位置
    if (this.nextFruit && !this.eliminating) {
      // 将点击的x映射到桶内范围
      const targetX = Math.max(this.bucketLeft + this.nextFruit.radius + 2,
                    Math.min(this.bucketRight - this.nextFruit.radius - 2, pos.x));
      this.nextFruit.x = targetX;
    }
  }

  onTouchMove(pos) {
    // 拖动掉落水果的水平位置
    if (this.nextFruit && !this.eliminating && !this.gameOver) {
      const targetX = Math.max(this.bucketLeft + this.nextFruit.radius + 2,
                    Math.min(this.bucketRight - this.nextFruit.radius - 2, pos.x));
      this.nextFruit.x = targetX;
    }
  }

  onTouchEnd(pos) {}

  destroy() {
    this.gameOver = true;
  }
}

export default FruitGame;
