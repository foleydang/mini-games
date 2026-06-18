// 水果消消乐 - 长方形容器 + 底部小漏斗 + 窄桶碰撞消除
import { drawRoundRect, drawButton, drawText, drawGradientBg, drawCircle, RankData, Storage } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';

const FRUITS = [
  { emoji: '🍎', radius: 52, color: '#ff4757' },
  { emoji: '🍊', radius: 55, color: '#f97316' },
  { emoji: '🍇', radius: 48, color: '#8b5cf6' },
  { emoji: '🍓', radius: 46, color: '#ec4899' },
  { emoji: '🍋', radius: 50, color: '#fde047' },
  { emoji: '🍑', radius: 54, color: '#f9a8d4' },
];

const GRAVITY = 0.5;
const BOUNCE_FACTOR = 0.15;
const FUNNEL_HEIGHT = 80; // 漏斗斜坡高度（很小一段）
const BUCKET_WIDTH = 130; // 桶宽度（一列）

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

    // 布局计算
    // 桶在最底部
    this.bucketLeft = (width - BUCKET_WIDTH) / 2;
    this.bucketRight = this.bucketLeft + BUCKET_WIDTH;
    this.bucketBottom = height - safeBottom - 30;
    this.bucketTop = this.bucketBottom - 120; // 桶高度120

    // 漏斗：桶口上方的一小段斜坡
    this.funnelBottom = this.bucketTop;      // 漏斗底 = 桶口
    this.funnelTop = this.funnelBottom - FUNNEL_HEIGHT; // 漏斗顶
    this.funnelTopLeft = 30;
    this.funnelTopRight = width - 30;

    // 长方形容器：漏斗上方
    this.boxLeft = 30;
    this.boxRight = width - 30;
    this.boxTop = safeTop + 140;
    this.boxBottom = this.funnelTop; // 容器底 = 漏斗顶

    // 漏斗壁的斜率（从宽到窄）
    this.funnelLeftSlope = (this.bucketLeft - this.funnelTopLeft) / FUNNEL_HEIGHT;
    this.funnelRightSlope = (this.funnelTopRight - this.bucketRight) / FUNNEL_HEIGHT;

    // 所有水果
    this.fruits = [];
    this.removing = [];
    this.removeProgress = 0;
    this.eliminating = false;
    this.scorePopups = [];

    // 按钮配置
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.init();
  }

  init() {
    this.generateFruits();
    this.draw();
    this.gameLoop();
  }

  generateFruits() {
    this.fruits = [];

    // 每种水果偶数个
    const types = [];
    for (let t = 0; t < FRUITS.length; t++) {
      for (let i = 0; i < 4; i++) {
        types.push(t);
      }
    }
    this.shuffleArray(types);

    // 在长方形容器内从底部往上堆叠放置
    // 先放底部一行，再往上
    const padding = 8;
    const areaWidth = this.boxRight - this.boxLeft - padding * 2;
    const areaHeight = this.boxBottom - this.boxTop - padding * 2;

    // 计算每行能放多少个（使用网格但加随机偏移）
    const maxRadius = 55;
    const cellSize = maxRadius * 2 + 10; // 间距
    const cols = Math.floor(areaWidth / cellSize);
    const rows = Math.ceil(types.length / cols);

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const fruitDef = FRUITS[type];
      const radius = fruitDef.radius + (Math.random() - 0.5) * 6;

      const col = i % cols;
      const row = Math.floor(i / cols);

      // 从底部往上排列（row=0是最底行）
      const totalRows = rows;
      const bottomUpRow = totalRows - 1 - row;

      const cellW = areaWidth / cols;
      const baseX = this.boxLeft + padding + col * cellW + cellW / 2;
      const baseY = this.boxBottom - padding - bottomUpRow * cellSize - cellSize / 2;

      // 加随机偏移
      const offsetX = (Math.random() - 0.5) * 16;
      const offsetY = (Math.random() - 0.5) * 10;

      const x = baseX + offsetX;
      const y = baseY + offsetY;

      this.fruits.push({
        x, y, vx: 0, vy: 0,
        type, radius,
        emoji: fruitDef.emoji,
        color: fruitDef.color,
        settled: true,
        released: false,
        area: 'box', // box | funnel | bucket
      });
    }

    // 让水果自然堆叠
    this.settleAllFruits();
  }

  settleAllFruits() {
    for (let iter = 0; iter < 300; iter++) {
      for (const f of this.fruits) {
        if (f.released) continue;

        // 重力
        f.vy += GRAVITY * 0.2;
        f.y += f.vy;
        f.x += f.vx;

        // 碰长方形容器壁
        if (f.area === 'box') {
          if (f.x - f.radius < this.boxLeft + 5) {
            f.x = this.boxLeft + 5 + f.radius;
            f.vx = Math.abs(f.vx) * 0.1;
          }
          if (f.x + f.radius > this.boxRight - 5) {
            f.x = this.boxRight - 5 - f.radius;
            f.vx = -Math.abs(f.vx) * 0.1;
          }
          // 容器底 = 漏斗顶
          if (f.y + f.radius > this.boxBottom) {
            // 进入漏斗区
            f.area = 'funnel';
          }
          // 容器顶
          if (f.y - f.radius < this.boxTop + 5) {
            f.y = this.boxTop + 5 + f.radius;
            f.vy = 0;
          }
        }

        // 碰漏斗壁
        if (f.area === 'funnel') {
          this.collideFunnelWalls(f);
          // 进入桶
          if (f.y + f.radius >= this.bucketTop) {
            f.area = 'bucket';
            f.x = Math.max(this.bucketLeft + f.radius + 3,
                          Math.min(this.bucketRight - f.radius - 3, f.x));
          }
        }

        // 碰桶壁和桶底
        if (f.area === 'bucket') {
          if (f.x - f.radius < this.bucketLeft + 3) {
            f.x = this.bucketLeft + 3 + f.radius;
            f.vx = 0;
          }
          if (f.x + f.radius > this.bucketRight - 3) {
            f.x = this.bucketRight - 3 - f.radius;
            f.vx = 0;
          }
          if (f.y + f.radius >= this.bucketBottom) {
            f.y = this.bucketBottom - f.radius;
            f.vy = 0;
          }
        }

        // 碰其他水果
        for (const other of this.fruits) {
          if (other === f) continue;
          if (other.released && other.area === 'box') continue; // 已释放还在box的不碰
          this.resolveOverlap(f, other);
        }

        // 减速
        f.vy *= 0.9;
        f.vx *= 0.9;
      }
    }

    // 稳定化
    for (const f of this.fruits) {
      f.vx = 0;
      f.vy = 0;
      f.settled = true;
      // 回到正确区域
      if (f.y + f.radius < this.boxBottom) f.area = 'box';
      else if (f.y + f.radius < this.bucketTop) f.area = 'funnel';
      else f.area = 'bucket';
    }
  }

  collideFunnelWalls(f) {
    const y = f.y;
    const r = f.radius;

    // 漏斗左壁在该y位置的x
    const leftWall = this.funnelTopLeft + this.funnelLeftSlope * (y - this.funnelTop);
    const rightWall = this.funnelTopRight + this.funnelRightSlope * (y - this.funnelTop);

    if (f.x - r < leftWall + 3) {
      f.x = leftWall + 3 + r;
      // 漏斗斜坡：推向中心（模拟滚落效果）
      f.vx = Math.abs(f.vx) * 0.3 + 2; // 给一个向中心的推力
    }
    if (f.x + r > rightWall - 3) {
      f.x = rightWall - 3 - r;
      f.vx = -(Math.abs(f.vx) * 0.3 + 2); // 向中心推力
    }
  }

  resolveOverlap(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;

    if (dist < minDist && dist > 0.5) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      // 如果b是稳定的，推a
      if (b.settled && !b.released) {
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        // 碰到已稳定水果时反弹
        if (ny < -0.4) {
          a.vy = -Math.abs(a.vy) * BOUNCE_FACTOR;
        } else {
          a.vx *= 0.5;
          a.vy *= 0.5;
        }
      } else {
        // 各推一半
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
      }
    }
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  clickFruit(fruit) {
    fruit.released = true;
    fruit.settled = false;
    fruit.vy = 3;
    fruit.vx = 0;
    this.combo = 0;
  }

  gameLoop() {
    if (this.gameOver || this.gameWon) {
      this.draw();
      return;
    }

    // 更新运动中的水果
    for (const f of this.fruits) {
      if (f.settled || !f.released) continue;

      f.vy += GRAVITY;
      f.y += f.vy;
      f.x += f.vx;

      // 区域转换
      if (f.area === 'box' && f.y + f.radius >= this.boxBottom) {
        f.area = 'funnel';
      }
      if (f.area === 'funnel' && f.y + f.radius >= this.bucketTop) {
        f.area = 'bucket';
        f.x = Math.max(this.bucketLeft + f.radius + 3,
                      Math.min(this.bucketRight - f.radius - 3, f.x));
      }

      // 碰壁
      if (f.area === 'box') {
        if (f.x - f.radius < this.boxLeft + 5) { f.x = this.boxLeft + 5 + f.radius; f.vx = Math.abs(f.vx) * 0.1; }
        if (f.x + f.radius > this.boxRight - 5) { f.x = this.boxRight - 5 - f.radius; f.vx = -Math.abs(f.vx) * 0.1; }
        if (f.y - f.radius < this.boxTop + 5) { f.y = this.boxTop + 5 + f.radius; f.vy = 0; }
      }
      if (f.area === 'funnel') {
        this.collideFunnelWalls(f);
      }
      if (f.area === 'bucket') {
        if (f.x - f.radius < this.bucketLeft + 3) { f.x = this.bucketLeft + 3 + f.radius; f.vx = 0; }
        if (f.x + f.radius > this.bucketRight - 3) { f.x = this.bucketRight - 3 - f.radius; f.vx = 0; }
      }

      // 碰桶底
      if (f.area === 'bucket' && f.y + f.radius >= this.bucketBottom) {
        f.y = this.bucketBottom - f.radius;
        if (f.vy > 5) {
          f.vy = -f.vy * BOUNCE_FACTOR;
        } else {
          f.vy = 0; f.vx = 0; f.settled = true;
          this.checkBucketElimination();
        }
      }

      // 碰其他水果
      for (const other of this.fruits) {
        if (other === f) continue;
        this.resolveOverlap(f, other);

        // 碰到已稳定水果 → 停下来
        if (other.settled && f.area === 'bucket' && f.vy < 2 && f.vy >= 0) {
          f.settled = true;
          f.vy = 0;
          f.vx = 0;
          this.checkBucketElimination();
        }
      }

      // 漏斗区水果到达桶口附近且速度小 → 入桶
      if (f.area === 'funnel' && f.vy < 2 && f.y >= this.funnelBottom - f.radius - 20) {
        f.area = 'bucket';
        f.x = Math.max(this.bucketLeft + f.radius + 3,
                      Math.min(this.bucketRight - f.radius - 3, f.x));
      }
    }

    // 未释放的水果：检查是否失去支撑需要下滑
    for (const f of this.fruits) {
      if (f.released) continue;
      if (f.area === 'box' && f.settled && !this.hasSupport(f)) {
        f.settled = false;
        f.released = true; // 自然下滑也算释放
        f.vy = 2;
      }
    }

    // 消除动画
    if (this.eliminating) {
      this.removeProgress += 0.06;
      if (this.removeProgress >= 1) {
        this.fruits = this.fruits.filter(f => !this.removing.includes(f));
        this.removing = [];
        this.removeProgress = 0;
        this.eliminating = false;
        this.unsettleAbove();
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

  hasSupport(f) {
    for (const other of this.fruits) {
      if (other === f) continue;
      if (!other.settled || other.released) continue;
      const dx = other.x - f.x;
      const dy = other.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dy > 0 && dist < f.radius + other.radius + 10) return true;
    }
    // 容器底部也算支撑
    if (f.y + f.radius >= this.boxBottom - 5) return true;
    return false;
  }

  unsettleAbove() {
    for (const f of this.fruits) {
      if (f.released) continue;
      if (!this.hasSupport(f)) {
        f.settled = false;
        f.released = true;
        f.vy = 2;
      }
    }
  }

  checkBucketElimination() {
    let found = true;
    while (found) {
      found = false;
      const bucketFruits = this.fruits.filter(f => f.area === 'bucket' && f.settled && !this.removing.includes(f));
      for (let i = 0; i < bucketFruits.length; i++) {
        const a = bucketFruits[i];
        for (let j = i + 1; j < bucketFruits.length; j++) {
          const b = bucketFruits[j];
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
    const remaining = this.fruits.filter(f => !this.removing.includes(f));
    if (remaining.length === 0 && !this.eliminating) {
      this.gameWon = true;
      RankData.save(this.gameId, this.score);
    }
  }

  checkOverflow() {
    for (const f of this.fruits) {
      if (f.area === 'bucket' && f.settled && !this.removing.includes(f)) {
        if (f.y - f.radius < this.bucketTop + 8) {
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

    if (this.eliminating) return;

    // 找最近的可点击水果（未释放的）
    let closest = null;
    let closestDist = Infinity;
    for (const f of this.fruits) {
      if (f.released) continue;
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

    // 绘制容器 + 漏斗 + 桶
    this.drawContainer();

    // 绘制水果
    this.drawFruits();

    // 消除动画
    if (this.eliminating) {
      const p = this.removeProgress;
      for (const f of this.removing) {
        const scale = 1 + p * 0.3 - p * p * 1.3;
        const alpha = 1 - p;
        this.drawSingleFruit(f, Math.max(0, alpha), Math.max(0.2, scale), false);
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
    const wallW = 14;

    // 整体形状：长方形 + 漏斗 + 桶，画成连续的容器
    ctx.fillStyle = '#78350f';

    // 左壁（从长方形顶到漏斗底再到桶底）
    ctx.beginPath();
    // 长方形左壁顶部
    ctx.moveTo(this.boxLeft - wallW, this.boxTop);
    // 长方形左壁底部 = 漏斗顶部
    ctx.lineTo(this.boxLeft - wallW, this.funnelTop);
    // 漏斗左壁斜坡（从宽到窄）
    ctx.lineTo(this.bucketLeft - wallW, this.funnelBottom);
    // 桶左壁
    ctx.lineTo(this.bucketLeft - wallW, this.bucketBottom + wallW);
    ctx.lineTo(this.bucketRight + wallW, this.bucketBottom + wallW);
    // 桶右壁
    ctx.lineTo(this.bucketRight + wallW, this.funnelBottom);
    // 漏斗右壁斜坡
    ctx.lineTo(this.boxRight + wallW, this.funnelTop);
    // 长方形右壁
    ctx.lineTo(this.boxRight + wallW, this.boxTop);
    ctx.closePath();
    ctx.fill();

    // 内部浅色
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(this.boxLeft + 3, this.boxTop + 3);
    ctx.lineTo(this.boxLeft + 3, this.funnelTop);
    // 漏斗内左壁
    ctx.lineTo(this.bucketLeft + 3, this.funnelBottom);
    ctx.lineTo(this.bucketLeft + 3, this.bucketBottom - 3);
    ctx.lineTo(this.bucketRight - 3, this.bucketBottom - 3);
    ctx.lineTo(this.bucketRight - 3, this.funnelBottom);
    // 漏斗内右壁
    ctx.lineTo(this.boxRight - 3, this.funnelTop);
    ctx.lineTo(this.boxRight - 3, this.boxTop + 3);
    ctx.closePath();
    ctx.fill();

    // 漏斗斜坡线（让斜坡更明显）
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.boxLeft + 3, this.funnelTop);
    ctx.lineTo(this.bucketLeft + 3, this.funnelBottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.boxRight - 3, this.funnelTop);
    ctx.lineTo(this.bucketRight - 3, this.funnelBottom);
    ctx.stroke();

    // 溢出警戒线
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(this.bucketLeft + 8, this.bucketTop + 8);
    ctx.lineTo(this.bucketRight - 8, this.bucketTop + 8);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawFruits() {
    for (const f of this.fruits) {
      if (this.removing.includes(f)) continue;
      const clickable = !f.released;
      this.drawSingleFruit(f, 1, 1, clickable);
    }
  }

  drawSingleFruit(f, alpha, scale, clickable) {
    const ctx = this.ctx;
    const r = f.radius * scale;

    ctx.globalAlpha = alpha;
    drawCircle(ctx, f.x, f.y, r, f.color);

    // 可点击高亮边框
    if (clickable) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.font = `${Math.floor(r * 1.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.emoji, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  destroy() {
    this.gameOver = true;
  }
}

export default FruitGame;
