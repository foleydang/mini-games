// 水果消消乐 - 固定水果 + 点击释放 + 碰撞其他水果 + 漏斗进桶 + 碰撞消除
import { drawRoundRect, drawButton, drawText, drawGradientBg, drawCircle, RankData, Storage } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';

const FRUITS = [
  { emoji: '🍎', radius: 40, color: '#ff4757' },
  { emoji: '🍊', radius: 42, color: '#f97316' },
  { emoji: '🍇', radius: 36, color: '#8b5cf6' },
  { emoji: '🍓', radius: 34, color: '#ec4899' },
  { emoji: '🍋', radius: 38, color: '#fde047' },
  { emoji: '🍑', radius: 41, color: '#f9a8d4' },
];

const GRAVITY = 0.35;
const BOUNCE_FACTOR = 0.15;
const BUCKET_WIDTH = 110;
const BUCKET_HEIGHT = 180;
const OVERFLOW_GRACE_MS = 3000;
const MAX_VY = 12;

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
    this.combo = 0;

    const { width, height, safeTop, safeBottom } = designSize;

    // 桶布局（最底部）
    this.bucketLeft = (width - BUCKET_WIDTH) / 2;
    this.bucketRight = this.bucketLeft + BUCKET_WIDTH;
    this.bucketBottom = height - safeBottom - 30;
    this.bucketTop = this.bucketBottom - BUCKET_HEIGHT;

    // 漏斗：桶口上方斜坡
    this.funnelHeight = 80;
    this.funnelBottom = this.bucketTop;
    this.funnelTop = this.funnelBottom - this.funnelHeight;
    this.funnelTopLeft = 30;
    this.funnelTopRight = width - 30;

    // 长方形容器：漏斗上方
    this.boxLeft = 30;
    this.boxRight = width - 30;
    this.boxTop = safeTop + 140;
    this.boxBottom = this.funnelTop;

    // 桶口中心X
    this.bucketCenterX = (this.bucketLeft + this.bucketRight) / 2;

    this.removing = [];
    this.removeProgress = 0;
    this.eliminating = false;
    this.scorePopups = [];

    // 上方固定水果
    this.topFruits = [];
    // 桶内水果（动态物理）
    this.bucketFruits = [];
    // 正在掉落的水果
    this.droppingFruit = null;

    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.init();
  }

  init() {
    this.generateTopFruits();
    this.draw();
    this.gameLoop();
  }

  // 散布式布局：水果随机散落在容器内，有间距但不紧密排列
  generateTopFruits() {
    this.topFruits = [];

    // 每种3个，共18个
    const types = [];
    for (let t = 0; t < FRUITS.length; t++) {
      for (let i = 0; i < 3; i++) types.push(t);
    }
    this.shuffleArray(types);

    const padding = 15;
    const minX = this.boxLeft + padding;
    const maxX = this.boxRight - padding;
    const minY = this.boxTop + padding;
    const maxY = this.boxBottom - padding;

    // 随机放置，碰撞修正推开
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const fruitDef = FRUITS[type];
      const radius = fruitDef.radius;

      // 随机位置
      const x = minX + radius + Math.random() * (maxX - minX - radius * 2);
      const y = minY + radius + Math.random() * (maxY - minY - radius * 2);

      this.topFruits.push({
        x, y,
        type, radius,
        emoji: fruitDef.emoji,
        color: fruitDef.color,
        removed: false,
      });
    }

    // 碰撞推开（多轮确保不重叠且间距足够）
    const minGap = 8; // 水果之间最小间距
    for (let iter = 0; iter < 20; iter++) {
      let moved = false;
      for (const f of this.topFruits) {
        if (f.removed) continue;
        for (const other of this.topFruits) {
          if (other === f || other.removed) continue;
          const dx = other.x - f.x;
          const dy = other.y - f.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = f.radius + other.radius + minGap;
          if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            f.x -= nx * overlap * 0.5;
            f.y -= ny * overlap * 0.5;
            other.x += nx * overlap * 0.5;
            other.y += ny * overlap * 0.5;
            moved = true;
          }
        }
        // 确保还在容器内
        f.x = Math.max(this.boxLeft + padding + f.radius, Math.min(this.boxRight - padding - f.radius, f.x));
        f.y = Math.max(this.boxTop + padding + f.radius, Math.min(this.boxBottom - padding - f.radius, f.y));
      }
      if (!moved) break;
    }
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // 点击水果 → 释放掉落（初始无推力，靠物理和碰撞自然运动）
  clickFruit(fruit) {
    fruit.removed = true;
    const fruitDef = FRUITS[fruit.type];

    this.droppingFruit = {
      x: fruit.x,
      y: fruit.y,
      vx: 0,
      vy: 0,
      type: fruit.type,
      radius: fruitDef.radius,
      emoji: fruitDef.emoji,
      color: fruitDef.color,
      phase: 'box',
    };
    this.combo = 0;
  }

  // ===== 游戏循环 =====
  gameLoop() {
    if (this.gameOver || this.gameWon) {
      this.draw();
      return;
    }

    // 更新掉落水果
    if (this.droppingFruit) {
      this.updateDropping();
    }

    // 更新桶内未稳定水果
    for (const bf of this.bucketFruits) {
      if (bf.settled) continue;
      bf.vy = Math.min(bf.vy + GRAVITY, MAX_VY);
      bf.y += bf.vy;
      bf.x += bf.vx || 0;

      // 碰桶壁
      if (bf.x - bf.radius < this.bucketLeft + 4) { bf.x = this.bucketLeft + 4 + bf.radius; bf.vx = 0; }
      if (bf.x + bf.radius > this.bucketRight - 4) { bf.x = this.bucketRight - 4 - bf.radius; bf.vx = 0; }

      // 碰桶底
      if (bf.y + bf.radius >= this.bucketBottom) {
        bf.y = this.bucketBottom - bf.radius;
        if (bf.vy > 4) {
          bf.vy = -bf.vy * BOUNCE_FACTOR;
        } else {
          bf.vy = 0; bf.vx = 0; bf.settled = true;
          if (!bf.settleTime) bf.settleTime = Date.now();
          this.checkBucketElimination();
        }
      }

      // 碰其他桶内水果
      for (const other of this.bucketFruits) {
        if (other === bf || !other.settled) continue;
        this.resolveBucketOverlap(bf, other);
      }

      // 速度很小时落地
      if (!bf.settled && bf.vy < 1.5 && bf.vy >= 0) {
        if (bf.y + bf.radius >= this.bucketBottom - 4 || this.hasBucketSupport(bf)) {
          bf.vy = 0; bf.vx = 0; bf.settled = true;
          if (!bf.settleTime) bf.settleTime = Date.now();
          this.checkBucketElimination();
        }
      }
    }

    // 消除动画
    if (this.eliminating) {
      this.removeProgress += 0.07;
      if (this.removeProgress >= 1) {
        this.bucketFruits = this.bucketFruits.filter(f => !this.removing.includes(f));
        this.removing = [];
        this.removeProgress = 0;
        this.eliminating = false;
        this.unsettleBucket();
      }
    }

    // 分数弹窗
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      this.scorePopups[i].progress += 0.04;
      if (this.scorePopups[i].progress >= 1) this.scorePopups.splice(i, 1);
    }

    this.checkWin();
    this.checkOverflow();

    this.draw();
    setTimeout(() => this.gameLoop(), 33);
  }

  // 掉落水果物理更新（子步防穿墙）
  updateDropping() {
    const df = this.droppingFruit;
    df.vy = Math.min(df.vy + GRAVITY, MAX_VY);

    const steps = Math.max(1, Math.ceil(df.vy / 5));
    for (let s = 0; s < steps; s++) {
      df.y += df.vy / steps;
      df.x += (df.vx || 0) / steps;
      if (this.droppingCollision(df)) return;
    }
  }

  // 掉落碰撞检测
  droppingCollision(df) {
    // === 容器区：碰撞固定水果 + 墙壁 ===
    if (df.phase === 'box') {
      // 碰左右壁
      if (df.x - df.radius < this.boxLeft + 5) { df.x = this.boxLeft + 5 + df.radius; df.vx = Math.abs(df.vx) * 0.3; }
      if (df.x + df.radius > this.boxRight - 5) { df.x = this.boxRight - 5 - df.radius; df.vx = -Math.abs(df.vx) * 0.3; }

      // 碰上方固定水果（作为固体障碍）
      for (const f of this.topFruits) {
        if (f.removed) continue;
        const dx = f.x - df.x;
        const dy = f.y - df.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = df.radius + f.radius + 2;

        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          // 推开掉落水果
          df.x -= nx * overlap;
          df.y -= ny * overlap;

          // 反弹：根据碰撞方向
          if (ny > 0.5) {
            // 从上方撞到固定水果（落在上面）→ 反弹vy
            df.vy = -df.vy * BOUNCE_FACTOR;
          } else if (ny < -0.5) {
            // 从下方撞 → 向上反弹
            df.vy = -Math.abs(df.vy) * BOUNCE_FACTOR;
          } else {
            // 侧面碰撞 → vx反弹
            df.vx = -df.vx * 0.3 + nx * 2;
            df.vy *= 0.7;
          }
        }
      }

      // 限制在容器内
      df.x = Math.max(this.boxLeft + 5 + df.radius, Math.min(this.boxRight - 5 - df.radius, df.x));
      df.y = Math.max(this.boxTop + 5 + df.radius, df.y); // 不会飞出顶部

      // 到达容器底部 → 进入漏斗
      if (df.y + df.radius >= this.boxBottom) {
        df.phase = 'funnel';
      }
    }

    // === 漏斗区 ===
    if (df.phase === 'funnel') {
      const funnelProgress = Math.max(0, Math.min(1, (df.y - this.funnelTop) / this.funnelHeight));
      const leftWall = this.funnelTopLeft + (this.bucketLeft - this.funnelTopLeft) * funnelProgress;
      const rightWall = this.funnelTopRight - (this.funnelTopRight - this.bucketRight) * funnelProgress;

      if (df.x - df.radius < leftWall + 4) {
        df.x = leftWall + 4 + df.radius;
        df.vx = 3 + Math.abs(df.vx) * 0.4;
      }
      if (df.x + df.radius > rightWall - 4) {
        df.x = rightWall - 4 - df.radius;
        df.vx = -(3 + Math.abs(df.vx) * 0.4);
      }

      if (df.y + df.radius >= this.bucketTop) {
        df.phase = 'bucket';
        df.x = Math.max(this.bucketLeft + df.radius + 4,
                      Math.min(this.bucketRight - df.radius - 4, df.x));
      }
    }

    // === 桶区 ===
    if (df.phase === 'bucket') {
      if (df.x - df.radius < this.bucketLeft + 4) { df.x = this.bucketLeft + 4 + df.radius; df.vx = 0; }
      if (df.x + df.radius > this.bucketRight - 4) { df.x = this.bucketRight - 4 - df.radius; df.vx = 0; }

      // 碰桶底
      if (df.y + df.radius >= this.bucketBottom) {
        df.y = this.bucketBottom - df.radius;
        if (df.vy > 4) {
          df.vy = -df.vy * BOUNCE_FACTOR;
        } else {
          this.finishDrop(df);
          return true;
        }
      }

      // 碰桶内其他水果
      for (const bf of this.bucketFruits) {
        if (!bf.settled) continue;
        const dx = bf.x - df.x;
        const dy = bf.y - df.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = df.radius + bf.radius;

        if (dist < minDist && dist > 0) {
          df.y = bf.y - minDist;
          df.x += (df.x > bf.x ? 1 : -1) * (minDist - dist) * 0.3;
          df.x = Math.max(this.bucketLeft + df.radius + 4,
                        Math.min(this.bucketRight - df.radius - 4, df.x));

          if (df.vy > 4) {
            df.vy = -df.vy * BOUNCE_FACTOR;
          } else {
            this.finishDrop(df);
            return true;
          }
        }
      }

      // 速度够小 → 落地
      if (df.vy < 1.5 && df.vy >= 0) {
        this.finishDrop(df);
        return true;
      }
    }

    return false;
  }

  finishDrop(df) {
    this.bucketFruits.push({
      x: df.x, y: df.y, vx: 0, vy: 0,
      type: df.type, radius: df.radius,
      emoji: df.emoji, color: df.color,
      settled: true,
      settleTime: Date.now(),
    });
    this.droppingFruit = null;
    this.checkBucketElimination();
  }

  resolveBucketOverlap(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;

    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      a.x = Math.max(this.bucketLeft + a.radius + 4,
                    Math.min(this.bucketRight - a.radius - 4, a.x));
      if (ny < -0.3) {
        a.vy = -Math.abs(a.vy) * BOUNCE_FACTOR;
      } else {
        a.vy *= 0.5;
      }
    }
  }

  hasBucketSupport(f) {
    for (const other of this.bucketFruits) {
      if (other === f || !other.settled) continue;
      const dx = other.x - f.x;
      const dy = other.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dy > 0 && dist < f.radius + other.radius + 6) return true;
    }
    return false;
  }

  unsettleBucket() {
    for (const bf of this.bucketFruits) {
      if (!bf.settled) continue;
      if (!this.hasBucketSupport(bf) && bf.y + bf.radius < this.bucketBottom - 5) {
        bf.settled = false;
        bf.vy = 2;
      }
    }
  }

  checkBucketElimination() {
    let found = true;
    while (found) {
      found = false;
      for (let i = 0; i < this.bucketFruits.length; i++) {
        const a = this.bucketFruits[i];
        if (this.removing.includes(a)) continue;
        for (let j = i + 1; j < this.bucketFruits.length; j++) {
          const b = this.bucketFruits[j];
          if (this.removing.includes(b)) continue;
          if (a.type !== b.type) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < a.radius + b.radius + 8) {
            this.removing.push(a, b);
            this.eliminating = true;
            this.removeProgress = 0;
            this.combo++;
            const gain = 10 * this.combo;
            this.score += gain;
            this.scorePopups.push({
              text: `+${gain}`,
              x: (a.x + b.x) / 2,
              y: Math.min(a.y, b.y) - 40,
              progress: 0
            });
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
    const now = Date.now();
    for (const bf of this.bucketFruits) {
      if (bf.settled && !this.removing.includes(bf)) {
        const age = now - (bf.settleTime || 0);
        if (age < OVERFLOW_GRACE_MS) continue;
        if (bf.y - bf.radius < this.bucketTop + 30) {
          this.gameOver = true;
          RankData.save(this.gameId, this.score);
          return;
        }
      }
    }
  }

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

    if (this.eliminating || this.droppingFruit) return;

    // 找最近的可点击水果
    let closest = null;
    let closestDist = Infinity;
    for (const f of this.topFruits) {
      if (f.removed) continue;
      const dx = pos.x - f.x;
      const dy = pos.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= f.radius + 10 && dist < closestDist) {
        closest = f;
        closestDist = dist;
      }
    }
    if (closest) this.clickFruit(closest);
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  // ===== 绘制 =====
  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop, safeBottom } = this.designSize;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawGradientBg(ctx, width, height, '#fef9c3', '#fde68a');

    drawText(ctx, '水果消消乐', width / 2, safeTop + 70, { fontSize: 48, color: '#d97706', bold: true });
    drawText(ctx, `分数: ${this.score}`, width / 2, safeTop + 120, { fontSize: 26, color: '#92400e' });

    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);

    this.drawContainer();

    // 上方固定水果（无边框，纯emoji）
    for (const f of this.topFruits) {
      if (f.removed) continue;
      this.drawSingleFruit(f, 1, 1);
    }

    // 正在掉落的水果
    if (this.droppingFruit) {
      this.drawSingleFruit(this.droppingFruit, 1, 1);
    }

    // 桶内水果
    for (const bf of this.bucketFruits) {
      if (this.removing.includes(bf)) continue;
      this.drawSingleFruit(bf, 1, 1);
    }

    // 消除动画
    if (this.eliminating) {
      const p = this.removeProgress;
      for (const f of this.removing) {
        const scale = 1 + p * 0.3 - p * p * 1.3;
        const alpha = 1 - p;
        this.drawSingleFruit(f, Math.max(0, alpha), Math.max(0.2, scale));
      }
    }

    // 分数弹窗
    for (const sp of this.scorePopups) {
      ctx.globalAlpha = 1 - sp.progress;
      drawText(ctx, sp.text, sp.x, sp.y - sp.progress * 30, { fontSize: 36, color: '#ef4444', bold: true });
      ctx.globalAlpha = 1;
    }

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

  drawContainer() {
    const ctx = this.ctx;
    const wallW = 12;

    // 外壳
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(this.boxLeft - wallW, this.boxTop);
    ctx.lineTo(this.boxLeft - wallW, this.funnelTop);
    ctx.lineTo(this.bucketLeft - wallW, this.funnelBottom);
    ctx.lineTo(this.bucketLeft - wallW, this.bucketBottom + wallW);
    ctx.lineTo(this.bucketRight + wallW, this.bucketBottom + wallW);
    ctx.lineTo(this.bucketRight + wallW, this.funnelBottom);
    ctx.lineTo(this.boxRight + wallW, this.funnelTop);
    ctx.lineTo(this.boxRight + wallW, this.boxTop);
    ctx.closePath();
    ctx.fill();

    // 内部浅色
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(this.boxLeft + 4, this.boxTop + 4);
    ctx.lineTo(this.boxLeft + 4, this.funnelTop);
    ctx.lineTo(this.bucketLeft + 4, this.funnelBottom);
    ctx.lineTo(this.bucketLeft + 4, this.bucketBottom - 4);
    ctx.lineTo(this.bucketRight - 4, this.bucketBottom - 4);
    ctx.lineTo(this.bucketRight - 4, this.funnelBottom);
    ctx.lineTo(this.boxRight - 4, this.funnelTop);
    ctx.lineTo(this.boxRight - 4, this.boxTop + 4);
    ctx.closePath();
    ctx.fill();

    // 漏斗斜坡线
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.boxLeft + 4, this.funnelTop);
    ctx.lineTo(this.bucketLeft + 4, this.funnelBottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.boxRight - 4, this.funnelTop);
    ctx.lineTo(this.bucketRight - 4, this.funnelBottom);
    ctx.stroke();

    // 溢出警戒线
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(this.bucketLeft + 8, this.bucketTop + 30);
    ctx.lineTo(this.bucketRight - 8, this.bucketTop + 30);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawSingleFruit(f, alpha, scale) {
    const ctx = this.ctx;
    const r = (f.radius || FRUITS[f.type].radius) * scale;

    ctx.globalAlpha = alpha;
    // 只画emoji，不画背景圆和边框
    ctx.font = `${Math.floor(r * 2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.emoji || FRUITS[f.type].emoji, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  destroy() {
    this.gameOver = true;
  }
}

export default FruitGame;
