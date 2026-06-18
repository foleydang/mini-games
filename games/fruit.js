// 水果消消乐 - 纯垂直自由落体 + 碰固定水果滑落 + 漏斗进桶 + 消除
import { drawRoundRect, drawButton, drawText, drawGradientBg, drawCircle, RankData, Storage } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';

const FRUITS = [
  { emoji: '🍎', radius: 30, color: '#ff4757' },
  { emoji: '🍊', radius: 30, color: '#f97316' },
  { emoji: '🍇', radius: 30, color: '#8b5cf6' },
  { emoji: '🍓', radius: 30, color: '#ec4899' },
  { emoji: '🍋', radius: 30, color: '#fde047' },
  { emoji: '🍑', radius: 30, color: '#f9a8d4' },
];

const GRAVITY = 0.3;
const BOUNCE_FACTOR = 0.15;
const BUCKET_WIDTH = 100;
const BUCKET_HEIGHT = 180;
const OVERFLOW_GRACE_MS = 3000;
const MAX_VY = 10;

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
    this.scoreSaved = false;
    this.soundEnabled = true;
    this.combo = 0;

    const { width, height, safeTop, safeBottom } = designSize;

    this.bucketLeft = (width - BUCKET_WIDTH) / 2;
    this.bucketRight = this.bucketLeft + BUCKET_WIDTH;
    this.bucketBottom = height - safeBottom - 30;
    this.bucketTop = this.bucketBottom - BUCKET_HEIGHT;

    this.funnelHeight = 150;
    this.funnelBottom = this.bucketTop;
    this.funnelTop = this.funnelBottom - this.funnelHeight;
    this.funnelTopLeft = 25;
    this.funnelTopRight = width - 25;

    this.boxLeft = 25;
    this.boxRight = width - 25;
    this.boxTop = safeTop + 140;
    this.boxBottom = this.funnelTop;

    this.bucketCenterX = (this.bucketLeft + this.bucketRight) / 2;

    this.removing = [];
    this.removeProgress = 0;
    this.eliminating = false;
    this.scorePopups = [];

    this.topFruits = [];
    this.bucketFruits = [];
    this.droppingFruits = [];

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

  generateTopFruits() {
    this.topFruits = [];
    const types = [];
    for (let t = 0; t < FRUITS.length; t++) {
      for (let i = 0; i < 3; i++) types.push(t);
    }
    this.shuffleArray(types);

    const padding = 20;
    const areaW = this.boxRight - this.boxLeft - padding * 2;
    const areaH = this.boxBottom - this.boxTop - padding * 2;
    const radius = FRUITS[0].radius;

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const fruitDef = FRUITS[type];
      const x = this.boxLeft + padding + radius + Math.random() * (areaW - radius * 2);
      const y = this.boxTop + padding + radius + Math.random() * (areaH - radius * 2);

      this.topFruits.push({
        x, y,
        type, radius,
        emoji: fruitDef.emoji,
        color: fruitDef.color,
        removed: false,
      });
    }

    const minGap = 6;
    for (let iter = 0; iter < 30; iter++) {
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

  // 点击水果 - 纯自由落体(vx=0 vy=0)
  clickFruit(fruit) {
    fruit.removed = true;
    const fruitDef = FRUITS[fruit.type];

    this.droppingFruits.push({
      x: fruit.x,
      y: fruit.y,
      vx: 0,
      vy: 0,
      type: fruit.type,
      radius: fruitDef.radius,
      emoji: fruitDef.emoji,
      color: fruitDef.color,
      phase: 'box',
    });
  }

  // ===== 游戏循环 =====
  gameLoop() {
    if (this.gameOver || this.gameWon) {
      if (!this.scoreSaved) {
        RankData.save(this.gameId, this.score);
        this.scoreSaved = true;
      }
      this.draw();
      return;
    }

    // 更新所有掉落水果
    for (let i = this.droppingFruits.length - 1; i >= 0; i--) {
      this.updateDropping(this.droppingFruits[i]);
    }

    // 更新桶内未稳定水果
    for (const bf of this.bucketFruits) {
      if (bf.settled) continue;
      bf.vy = Math.min(bf.vy + GRAVITY, MAX_VY);
      bf.y += bf.vy;
      bf.x += (bf.vx || 0);

      if (bf.x - bf.radius < this.bucketLeft + 4) { bf.x = this.bucketLeft + 4 + bf.radius; bf.vx = 0; }
      if (bf.x + bf.radius > this.bucketRight - 4) { bf.x = this.bucketRight - 4 - bf.radius; bf.vx = 0; }

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

      for (const other of this.bucketFruits) {
        if (other === bf || !other.settled) continue;
        this.resolveBucketOverlap(bf, other);
      }

      if (!bf.settled && bf.vy < 1.5 && bf.vy >= 0) {
        if (bf.y + bf.radius >= this.bucketBottom - 4 || this.hasBucketSupport(bf)) {
          bf.vy = 0; bf.vx = 0; bf.settled = true;
          if (!bf.settleTime) bf.settleTime = Date.now();
          this.checkBucketElimination();
        }
      }
    }

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

    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      this.scorePopups[i].progress += 0.04;
      if (this.scorePopups[i].progress >= 1) this.scorePopups.splice(i, 1);
    }

    this.checkWin();
    this.checkOverflow();

    this.draw();
    setTimeout(() => this.gameLoop(), 33);
  }

  updateDropping(df) {
    df.vy = Math.min(df.vy + GRAVITY, MAX_VY);
    const steps = Math.max(1, Math.ceil(df.vy / 5));
    for (let s = 0; s < steps; s++) {
      df.y += df.vy / steps;
      df.x += (df.vx || 0) / steps;
      if (this.droppingCollision(df)) return;
    }
  }

  droppingCollision(df) {
    // 容器区：碰墙壁 + 碰固定水果（落在上面则侧滑走）
    if (df.phase === 'box') {
      if (df.x - df.radius < this.boxLeft + 5) { df.x = this.boxLeft + 5 + df.radius; df.vx = 0; }
      if (df.x + df.radius > this.boxRight - 5) { df.x = this.boxRight - 5 - df.radius; df.vx = 0; }

      // 碰固定水果：落在上面 → 侧滑继续下落
      for (const f of this.topFruits) {
        if (f.removed) continue;
        const dx = df.x - f.x;
        const dy = df.y - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = df.radius + f.radius + 2;

        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          // 推开掉落水果到固定水果表面
          df.x += nx * overlap;
          df.y += ny * overlap;

          // 根据碰撞方向：侧面碰 → 沿表面滑落；上方碰 → 小反弹
          if (Math.abs(nx) > 0.4) {
            // 侧面碰撞：沿斜面滑落，给水平滑速
            df.vx = nx * Math.abs(df.vy) * 0.6;
            df.vy *= 0.4; // 减速但继续下落
          } else {
            // 正上方碰撞（落在固定水果上面）：小反弹
            df.vy = -df.vy * BOUNCE_FACTOR;
          }
        }
      }

      df.x = Math.max(this.boxLeft + 5 + df.radius, Math.min(this.boxRight - 5 - df.radius, df.x));
      df.y = Math.max(this.boxTop + 5 + df.radius, df.y);

      if (df.y + df.radius >= this.boxBottom) {
        df.phase = 'funnel';
      }
    }

    // 漏斗区
    if (df.phase === 'funnel') {
      const fp = Math.max(0, Math.min(1, (df.y - this.funnelTop) / this.funnelHeight));
      const leftWall = this.funnelTopLeft + (this.bucketLeft - this.funnelTopLeft) * fp;
      const rightWall = this.funnelTopRight - (this.funnelTopRight - this.bucketRight) * fp;

      if (df.x - df.radius < leftWall + 4) {
        df.x = leftWall + 4 + df.radius;
        df.vx = 3 + Math.abs(df.vx) * 0.3;
      }
      if (df.x + df.radius > rightWall - 4) {
        df.x = rightWall - 4 - df.radius;
        df.vx = -(3 + Math.abs(df.vx) * 0.3);
      }

      if (df.y + df.radius >= this.bucketTop) {
        df.phase = 'bucket';
        df.x = Math.max(this.bucketLeft + df.radius + 4,
                      Math.min(this.bucketRight - df.radius - 4, df.x));
      }
    }

    // 桶区
    if (df.phase === 'bucket') {
      if (df.x - df.radius < this.bucketLeft + 4) { df.x = this.bucketLeft + 4 + df.radius; df.vx = 0; }
      if (df.x + df.radius > this.bucketRight - 4) { df.x = this.bucketRight - 4 - df.radius; df.vx = 0; }

      if (df.y + df.radius >= this.bucketBottom) {
        df.y = this.bucketBottom - df.radius;
        if (df.vy > 4) {
          df.vy = -df.vy * BOUNCE_FACTOR;
        } else {
          this.finishDrop(df);
          return true;
        }
      }

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
    const idx = this.droppingFruits.indexOf(df);
    if (idx >= 0) this.droppingFruits.splice(idx, 1);
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
    if (this.topFruits.every(f => f.removed) && this.bucketFruits.length === 0 && this.droppingFruits.length === 0 && !this.eliminating) {
      this.gameWon = true;
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
          return;
        }
      }
    }
  }

  onTouchStart(pos) {
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') {
      if (!this.scoreSaved) {
        RankData.save(this.gameId, this.score);
        this.scoreSaved = true;
      }
      this.onEnd(this.score);
      return;
    }
    if (btn === 'soundBtn') {
      this.soundEnabled = !this.soundEnabled;
      this.draw();
      return;
    }

    if (this.gameOver || this.gameWon) {
      if (!this.scoreSaved) {
        RankData.save(this.gameId, this.score);
        this.scoreSaved = true;
      }
      this.onEnd(this.score);
      return;
    }

    if (this.eliminating) return;

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

    for (const f of this.topFruits) {
      if (f.removed) continue;
      this.drawSingleFruit(f, 1, 1);
    }

    for (const df of this.droppingFruits) {
      this.drawSingleFruit(df, 1, 1);
    }

    for (const bf of this.bucketFruits) {
      if (this.removing.includes(bf)) continue;
      this.drawSingleFruit(bf, 1, 1);
    }

    if (this.eliminating) {
      const p = this.removeProgress;
      for (const f of this.removing) {
        const scale = 1 + p * 0.3 - p * p * 1.3;
        const alpha = 1 - p;
        this.drawSingleFruit(f, Math.max(0, alpha), Math.max(0.2, scale));
      }
    }

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
