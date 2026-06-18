// 水果消消乐 - 漏斗物理掉落 + 窄桶碰撞消除
import { drawRoundRect, drawButton, drawText, drawGradientBg, drawCircle, RankData, Storage } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';

// 水果定义（半径大一倍）
const FRUITS = [
  { emoji: '🍎', radius: 55, color: '#ff4757' },
  { emoji: '🍊', radius: 58, color: '#f97316' },
  { emoji: '🍇', radius: 50, color: '#8b5cf6' },
  { emoji: '🍓', radius: 48, color: '#ec4899' },
  { emoji: '🍋', radius: 52, color: '#fde047' },
  { emoji: '🍑', radius: 56, color: '#f9a8d4' },
];

const GRAVITY = 0.4;
const BOUNCE_FACTOR = 0.15;
const FUNNEL_SLOPE = 0.6; // 漏斗斜面角度系数

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

    // 桶：只有一列宽（刚好放一个水果）
    this.bucketWidth = 130;
    this.bucketLeft = (width - this.bucketWidth) / 2;
    this.bucketRight = this.bucketLeft + this.bucketWidth;
    this.bucketTop = height - safeBottom - 140;
    this.bucketBottom = height - safeBottom - 30;

    // 漏斗区域：从桶口往上扩展
    this.funnelTop = safeTop + 140;
    this.funnelTopLeft = 30;
    this.funnelTopRight = width - 30;

    // 漏斗底 = 桶口
    this.funnelBottomLeft = this.bucketLeft;
    this.funnelBottomRight = this.bucketRight;

    // 漏斗左壁线和右壁线（线性从宽到窄）
    this.funnelLeftSlope = (this.funnelBottomLeft - this.funnelTopLeft) / (this.bucketTop - this.funnelTop);
    this.funnelRightSlope = (this.funnelTopRight - this.funnelBottomRight) / (this.bucketTop - this.funnelTop);

    // 所有水果物理对象（上方漏斗区 + 桶内）
    this.fruits = []; // { x, y, vx, vy, type, radius, emoji, color, area:'funnel'|'bucket'|'falling', settled, released }

    // 正在掉落/滑入桶的水果
    this.fallingFruits = [];

    // 消除动画
    this.removing = [];
    this.removeProgress = 0;
    this.eliminating = false;

    // 分数弹窗
    this.scorePopups = []; // { text, x, y, progress }

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

  // 生成水果（在漏斗区上方，确保每种偶数个）
  generateFruits() {
    this.fruits = [];

    // 确保每种水果出现偶数个（2、4、6等）
    const types = [];
    for (let t = 0; t < FRUITS.length; t++) {
      for (let i = 0; i < 6; i++) { // 每种6个 = 36个水果
        types.push(t);
      }
    }
    this.shuffleArray(types);

    // 从上往下、从左往右放置水果，碰撞检测保证不重叠
    const { width } = this.designSize;
    const placeAreaTop = this.funnelTop + 10;
    const placeAreaBottom = this.bucketTop - 20;

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const fruitDef = FRUITS[type];
      const radius = fruitDef.radius + (Math.random() - 0.5) * 6;

      // 尝试在漏斗区找一个不重叠的位置
      let placed = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        // 随机位置在漏斗区内
        const y = placeAreaTop + (placeAreaBottom - placeAreaTop) * (0.1 + Math.random() * 0.85);
        // x 需要在该 y 对应的漏斗宽度内
        const leftX = this.funnelTopLeft + this.funnelLeftSlope * (y - this.funnelTop) + radius + 5;
        const rightX = this.funnelTopRight + this.funnelRightSlope * (y - this.funnelTop) - radius - 5;
        if (rightX <= leftX) continue; // 这行太窄了

        const x = leftX + Math.random() * (rightX - leftX);

        // 检查是否和已有水果重叠
        let overlap = false;
        for (const f of this.fruits) {
          const dx = f.x - x;
          const dy = f.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < f.radius + radius - 4) {
            overlap = true;
            break;
          }
        }

        if (!overlap) {
          this.fruits.push({
            x, y, vx: 0, vy: 0,
            type, radius,
            emoji: fruitDef.emoji,
            color: fruitDef.color,
            area: 'funnel',
            settled: true, // 初始放置就稳定
            released: false, // 还没被点击释放
          });
          placed = true;
          break;
        }
      }

      if (!placed) {
        // 实在放不下就跳过（水果太多）
        continue;
      }
    }

    // 让所有水果根据重力自然堆叠一下
    this.settleAllFruits();
  }

  // 让所有漏斗区水果根据重力自然堆叠
  settleAllFruits() {
    // 多次迭代让水果落到合理位置
    for (let iter = 0; iter < 200; iter++) {
      for (const f of this.fruits) {
        if (f.released || f.area !== 'funnel') continue;

        // 重力往下拉
        f.vy += GRAVITY * 0.3;
        f.y += f.vy;

        // 碰漏斗壁
        this.collideFunnelWalls(f);

        // 碰其他水果
        for (const other of this.fruits) {
          if (other === f) continue;
          this.resolveOverlap(f, other);
        }

        // 减速
        f.vy *= 0.85;
        f.vx *= 0.85;
      }
    }

    // 最终稳定化
    for (const f of this.fruits) {
      f.vx = 0;
      f.vy = 0;
      f.settled = true;
    }
  }

  // 碰撞漏斗壁
  collideFunnelWalls(f) {
    const y = f.y;
    const r = f.radius;

    // 该 y 位置的漏斗边界
    const leftWall = this.funnelTopLeft + this.funnelLeftSlope * (y - this.funnelTop);
    const rightWall = this.funnelTopRight + this.funnelRightSlope * (y - this.funnelTop);

    if (f.x - r < leftWall) {
      f.x = leftWall + r;
      f.vx = Math.abs(f.vx) * 0.3;
    }
    if (f.x + r > rightWall) {
      f.x = rightWall - r;
      f.vx = -Math.abs(f.vx) * 0.3;
    }
  }

  // 解决两个水果重叠
  resolveOverlap(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;

    if (dist < minDist && dist > 0.1) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      // 各推一半
      const pushA = b.settled && !a.settled ? 1 : (a.settled && !b.settled ? 0 : 0.5);
      a.x -= nx * overlap * pushA;
      a.y -= ny * overlap * pushA;
      b.x += nx * overlap * (1 - pushA);
      b.y += ny * overlap * (1 - pushA);

      // 速度影响
      if (ny < -0.5) {
        // 从上方落下碰到
        a.vy = -Math.abs(a.vy) * BOUNCE_FACTOR;
      }
    }
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ===== 点击水果 → 释放让它掉进桶 =====
  clickFruit(fruit) {
    fruit.released = true;
    fruit.settled = false;
    fruit.area = 'falling';
    fruit.vy = 2; // 开始下落
    fruit.vx = 0;
    this.combo = 0;
  }

  // ===== 游戏循环 =====
  gameLoop() {
    if (this.gameOver || this.gameWon) {
      this.draw();
      return;
    }

    // 更新所有运动中的水果
    for (const f of this.fruits) {
      if (f.settled) continue;

      // 重力
      f.vy += GRAVITY;
      f.y += f.vy;
      f.x += f.vx;

      if (f.area === 'falling' || f.area === 'funnel') {
        // 碰漏斗壁
        this.collideFunnelWalls(f);

        // 检查是否进入桶区域
        if (f.y + f.radius >= this.bucketTop && f.area !== 'bucket') {
          f.area = 'bucket';
          // 进入桶后限制x范围
          f.x = Math.max(this.bucketLeft + f.radius + 3,
                        Math.min(this.bucketRight - f.radius - 3, f.x));
        }

        // 碰其他水果
        for (const other of this.fruits) {
          if (other === f) continue;
          this.resolveOverlap(f, other);
        }

        // 碰桶底
        if (f.area === 'bucket' && f.y + f.radius >= this.bucketBottom) {
          f.y = this.bucketBottom - f.radius;
          if (f.vy > 5) {
            f.vy = -f.vy * BOUNCE_FACTOR;
          } else {
            f.vy = 0;
            f.vx = 0;
            f.settled = true;
            this.checkBucketElimination();
          }
        }

        // 漏斗区水果碰到支撑物停下
        if (f.area === 'funnel' && f.vy < 1 && f.vy >= 0) {
          if (this.hasFunnelSupport(f)) {
            f.settled = true;
            f.vy = 0;
            f.vx = 0;
          }
        }

        // 桶内水果碰支撑物停下
        if (f.area === 'bucket' && f.vy < 1 && f.vy >= 0 && !f.settled) {
          if (f.y + f.radius >= this.bucketBottom - 3 || this.hasBucketSupport(f)) {
            f.settled = true;
            f.vy = 0;
            f.vx = 0;
            this.checkBucketElimination();
          }
        }
      }
    }

    // 未释放的漏斗水果：检查是否有支撑，没有就下滑
    for (const f of this.fruits) {
      if (f.released || f.area !== 'funnel' || !f.settled) continue;
      if (!this.hasFunnelSupport(f) && f.y + f.radius < this.bucketBottom - 30) {
        f.settled = false;
        f.vy = 1;
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
        // 上方水果可能需要下滑
        this.unsettleAbove();
      }
    }

    // 分数弹窗
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      this.scorePopups[i].progress += 0.04;
      if (this.scorePopups[i].progress >= 1) {
        this.scorePopups.splice(i, 1);
      }
    }

    this.checkWin();
    this.checkOverflow();

    this.draw();
    setTimeout(() => this.gameLoop(), 33);
  }

  hasFunnelSupport(f) {
    for (const other of this.fruits) {
      if (other === f) continue;
      const dx = other.x - f.x;
      const dy = other.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dy > 0 && dist < f.radius + other.radius + 8) return true;
    }
    // 靠漏斗壁支撑也算
    const leftWall = this.funnelTopLeft + this.funnelLeftSlope * (f.y - this.funnelTop);
    const rightWall = this.funnelTopRight + this.funnelRightSlope * (f.y - this.funnelTop);
    const funnelWidth = rightWall - leftWall;
    if (funnelWidth < f.radius * 2 + 15) return true; // 漏斗窄到卡住了
    return false;
  }

  hasBucketSupport(f) {
    for (const other of this.fruits) {
      if (other === f || !other.settled) continue;
      if (other.area !== 'bucket') continue;
      const dx = other.x - f.x;
      const dy = other.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dy > 0 && dist < f.radius + other.radius + 6) return true;
    }
    return false;
  }

  unsettleAbove() {
    for (const f of this.fruits) {
      if (f.released) continue;
      if (f.area === 'funnel' && f.settled) {
        if (!this.hasFunnelSupport(f)) {
          f.settled = false;
          f.vy = 1;
        }
      }
      if (f.area === 'bucket' && f.settled) {
        if (!this.hasBucketSupport(f) && f.y + f.radius < this.bucketBottom - 5) {
          f.settled = false;
          f.vy = 1;
        }
      }
    }
  }

  // 桶内消除检查
  checkBucketElimination() {
    let found = true;
    while (found) {
      found = false;
      for (let i = 0; i < this.fruits.length; i++) {
        const a = this.fruits[i];
        if (a.area !== 'bucket' || !a.settled || this.removing.includes(a)) continue;
        for (let j = i + 1; j < this.fruits.length; j++) {
          const b = this.fruits[j];
          if (b.area !== 'bucket' || !b.settled || this.removing.includes(b)) continue;
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

    if (this.eliminating) return;

    // 点击漏斗区水果（从下往上找最近的）
    const clickable = this.fruits.filter(f => !f.released && f.area === 'funnel' && f.settled);
    // 找离触摸点最近的可点击水果
    let closest = null;
    let closestDist = Infinity;
    for (const f of clickable) {
      const dx = pos.x - f.x;
      const dy = pos.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= f.radius + 10 && dist < closestDist) {
        closest = f;
        closestDist = dist;
      }
    }
    if (closest) {
      this.clickFruit(closest);
    }
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  // ===== 绘制 =====
  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop, safeBottom } = this.designSize;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawGradientBg(ctx, width, height, '#fef9c3', '#fde68a');

    // 标题和分数
    drawText(ctx, '水果消消乐', width / 2, safeTop + 70, { fontSize: 48, color: '#d97706', bold: true });
    drawText(ctx, `分数: ${this.score}`, width / 2, safeTop + 120, { fontSize: 26, color: '#92400e' });

    // 底部按钮
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);

    // 绘制漏斗和桶
    this.drawFunnel();

    // 绘制水果
    this.drawFruits();

    // 消除动画
    if (this.eliminating) {
      const p = this.removeProgress;
      for (const f of this.removing) {
        const scale = 1 + p * 0.4 - p * p * 1.4;
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

  drawFunnel() {
    const ctx = this.ctx;

    // 漏斗形状：梯形从宽到窄
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    // 左壁
    ctx.moveTo(this.funnelTopLeft - 10, this.funnelTop);
    ctx.lineTo(this.funnelBottomLeft - 10, this.bucketTop);
    // 桶左壁延伸
    ctx.lineTo(this.bucketLeft - 14, this.bucketTop);
    ctx.lineTo(this.bucketLeft - 14, this.bucketBottom + 14);
    // 桶底
    ctx.lineTo(this.bucketRight + 14, this.bucketBottom + 14);
    // 桶右壁
    ctx.lineTo(this.bucketRight + 14, this.bucketTop);
    // 漏斗右壁
    ctx.lineTo(this.funnelTopRight + 10, this.funnelTop);
    ctx.closePath();
    ctx.fill();

    // 内部浅色区域（漏斗内部）
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(this.funnelTopLeft + 5, this.funnelTop + 5);
    ctx.lineTo(this.funnelBottomLeft + 5, this.bucketTop);
    ctx.lineTo(this.bucketLeft + 3, this.bucketTop);
    ctx.lineTo(this.bucketLeft + 3, this.bucketBottom);
    ctx.lineTo(this.bucketRight - 3, this.bucketBottom);
    ctx.lineTo(this.bucketRight - 3, this.bucketTop);
    ctx.lineTo(this.funnelBottomRight - 5, this.bucketTop);
    ctx.lineTo(this.funnelTopRight - 5, this.funnelTop + 5);
    ctx.closePath();
    ctx.fill();

    // 溢出警戒线
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(this.bucketLeft + 5, this.bucketTop + 8);
    ctx.lineTo(this.bucketRight - 5, this.bucketTop + 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // 漏斗壁纹理线（让漏斗更明显）
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    // 左壁
    ctx.beginPath();
    ctx.moveTo(this.funnelTopLeft, this.funnelTop);
    ctx.lineTo(this.funnelBottomLeft, this.bucketTop);
    ctx.stroke();
    // 右壁
    ctx.beginPath();
    ctx.moveTo(this.funnelTopRight, this.funnelTop);
    ctx.lineTo(this.funnelBottomRight, this.bucketTop);
    ctx.stroke();
  }

  drawFruits() {
    for (const f of this.fruits) {
      if (this.removing.includes(f)) continue;
      const isReleased = f.released;
      const isFunnelUnreleased = !f.released && f.area === 'funnel';
      // 未释放的水果显示稍亮，可点击
      const alpha = isFunnelUnreleased ? 1 : (isReleased ? 1 : 1);
      const scale = 1;
      this.drawSingleFruit(f, alpha, scale, isFunnelUnreleased);
    }
  }

  drawSingleFruit(f, alpha, scale, clickable = false) {
    const ctx = this.ctx;
    const r = f.radius * scale;

    ctx.globalAlpha = alpha;

    // 水果圆形背景
    drawCircle(ctx, f.x, f.y, r, f.color);

    // 可点击水果的高亮边框
    if (clickable) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // emoji
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
