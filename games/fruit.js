// 水果消消乐 - 窄桶 + 双斜坡 + 物理碰撞
import { drawText, Storage, RankData } from '../common/utils.js';
import { getBackButton, checkBottomButtons, drawHint } from '../common/ui.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';

const FRUITS = [
  { emoji: '🍎', color: '#ff4757' },
  { emoji: '🍊', color: '#ff9f43' },
  { emoji: '🍇', color: '#a55eea' },
  { emoji: '🍓', color: '#ee5a6f' },
  { emoji: '🍋', color: '#feca57' },
  { emoji: '🍑', color: '#ffb8b8' },
  { emoji: '🥝', color: '#78e08f' },
  { emoji: '🫐', color: '#48dbfb' },
];

const GRAVITY = 0.18;
const MAX_VY = 10;
const BOUNCE = 0.25;
const FRICTION = 0.97;
const SLOPE_FRICTION = 0.92;

class FruitGame {
  constructor(canvas, ctx, designSize, onEnd, level = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'fruit';
    this.level = level;

    const levelConfigs = [
      { maxFruits: 16, types: 4, radius: 36 },
      { maxFruits: 20, types: 5, radius: 34 },
      { maxFruits: 24, types: 6, radius: 32 },
      { maxFruits: 28, types: 7, radius: 30 },
      { maxFruits: 32, types: 8, radius: 28 }
    ];
    const cfg = levelConfigs[Math.min(level, levelConfigs.length - 1)];
    this.maxFruits = cfg.maxFruits;
    this.maxTypes = cfg.types;
    this.fruitRadius = cfg.radius;

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.scoreSaved = false;

    const { width, height, safeTop, safeBottom } = designSize;

    // 窄桶 - 只有一列水果宽
    this.bucketCenterX = width / 2;
    this.bucketHalfWidth = this.fruitRadius + 6;
    this.bucketLeft = this.bucketCenterX - this.bucketHalfWidth;
    this.bucketRight = this.bucketCenterX + this.bucketHalfWidth;
    this.bucketTop = safeTop + 320;
    this.bucketBottom = height - safeBottom - 40;
    this.bucketHeight = this.bucketBottom - this.bucketTop;

    // 斜坡 - 从两侧顶部到桶口
    this.slopeTopY = safeTop + 180;
    this.slopeLeftStartX = 30;
    this.slopeRightStartX = width - 30;

    this.fruits = []; // 所有水果统一在一个数组
    this.topFruits = []; // 待点击的水果
    this.particles = [];
    this.scorePopups = [];
    this.confirmBtn = null;

    this.backButton = getBackButton(designSize);
    this.buttons = null;

    this.generateTopFruits();
    audioManager.startBgMusic();

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  generateTopFruits() {
    this.topFruits = [];
    
    // 保证每种偶数个
    const types = [];
    const perType = Math.ceil(this.maxFruits / this.maxTypes);
    const evenPer = perType % 2 === 0 ? perType : perType + 1;
    
    for (let t = 0; t < this.maxTypes; t++) {
      for (let i = 0; i < evenPer; i++) types.push(t);
    }
    
    const total = Math.min(types.length, this.maxFruits);
    types.length = total % 2 === 0 ? total : total - 1;

    // 打乱
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    // 随机放置在斜坡区域（左斜坡 + 右斜坡）
    const { width } = this.designSize;
    const padding = 15;
    const minGap = 8;
    
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const isLeft = i % 2 === 0;
      let placed = false;
      
      for (let attempt = 0; attempt < 50; attempt++) {
        let x, y;
        if (isLeft) {
          // 左斜坡区域
          x = this.slopeLeftStartX + padding + this.fruitRadius + 
              Math.random() * (this.bucketLeft - this.slopeLeftStartX - padding * 2 - this.fruitRadius * 2);
          y = this.slopeTopY + padding + this.fruitRadius + 
              Math.random() * (this.bucketTop - this.slopeTopY - padding * 2 - this.fruitRadius * 2);
        } else {
          // 右斜坡区域
          x = this.bucketRight + padding + this.fruitRadius + 
              Math.random() * (this.slopeRightStartX - this.bucketRight - padding * 2 - this.fruitRadius * 2);
          y = this.slopeTopY + padding + this.fruitRadius + 
              Math.random() * (this.bucketTop - this.slopeTopY - padding * 2 - this.fruitRadius * 2);
        }
        
        let overlap = false;
        for (const other of this.topFruits) {
          const dx = other.x - x;
          const dy = other.y - y;
          if (Math.sqrt(dx * dx + dy * dy) < this.fruitRadius * 2 + minGap) {
            overlap = true; break;
          }
        }
        
        if (!overlap) {
          this.topFruits.push({ x, y, type, emoji: FRUITS[type].emoji, color: FRUITS[type].color, radius: this.fruitRadius, removed: false });
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        const x = isLeft ? 
          this.slopeLeftStartX + padding + this.fruitRadius + Math.random() * (this.bucketLeft - this.slopeLeftStartX - this.fruitRadius * 2) :
          this.bucketRight + padding + this.fruitRadius + Math.random() * (this.slopeRightStartX - this.bucketRight - this.fruitRadius * 2);
        const y = this.slopeTopY + padding + this.fruitRadius + Math.random() * (this.bucketTop - this.slopeTopY - this.fruitRadius * 2);
        this.topFruits.push({ x, y, type, emoji: FRUITS[type].emoji, color: FRUITS[type].color, radius: this.fruitRadius, removed: false });
      }
    }
    
    this.totalFruits = this.topFruits.length;
    this.remainingFruits = this.totalFruits;
  }

  clickFruit(fruit) {
    if (fruit.removed) return;
    fruit.removed = true;
    playSound(SoundType.DROP);
    
    this.fruits.push({
      x: fruit.x,
      y: fruit.y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 0,
      type: fruit.type,
      emoji: fruit.emoji,
      color: fruit.color,
      radius: fruit.radius,
      settled: false,
      inBucket: false,
      trail: []
    });
  }

  animate(currentTime) {
    if (this.gameOver || this.gameWon) {
      audioManager.stopBgMusic();
      this.draw();
      return;
    }

    const dt = Math.min((currentTime - this.lastTime) / 16.67, 2);
    this.lastTime = currentTime;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.animate);
  }

  update(dt) {
    // 水果互相碰撞
    for (let i = 0; i < this.fruits.length; i++) {
      for (let j = i + 1; j < this.fruits.length; j++) {
        this.resolveCollision(this.fruits[i], this.fruits[j]);
      }
    }

    // 更新每个水果
    for (const f of this.fruits) {
      if (f.settled) continue;
      
      // 轨迹
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > 4) f.trail.shift();

      // 重力
      f.vy = Math.min(f.vy + GRAVITY * dt, MAX_VY);
      f.y += f.vy * dt;
      f.x += (f.vx || 0) * dt;
      
      // 判断是否在桶内
      const inBucketX = f.x > this.bucketLeft && f.x < this.bucketRight && f.y > this.bucketTop;
      
      if (inBucketX) {
        // 桶内 - 水平约束，只允许垂直运动
        f.inBucket = true;
        f.vx *= 0.5; // 快速减速水平速度
        f.x = Math.max(this.bucketLeft + f.radius, Math.min(this.bucketRight - f.radius, f.x));
        
        // 桶底
        if (f.y + f.radius >= this.bucketBottom) {
          f.y = this.bucketBottom - f.radius;
          if (Math.abs(f.vy) > 2) {
            f.vy = -f.vy * BOUNCE;
          } else {
            f.vy = 0;
            f.vx = 0;
            f.settled = true;
            this.checkElimination();
          }
        }
        
        // 检查是否停在其他水果上
        for (const other of this.fruits) {
          if (other === f || !other.settled) continue;
          const dy = other.y - f.y;
          const dist = Math.abs(f.y - other.y);
          if (dist < f.radius + other.radius + 4 && dy > 0 && Math.abs(f.x - other.x) < f.radius + other.radius) {
            f.y = other.y - f.radius - other.radius;
            if (Math.abs(f.vy) > 2) {
              f.vy = -f.vy * BOUNCE;
            } else {
              f.vy = 0;
              f.vx = 0;
              f.settled = true;
              this.checkElimination();
            }
          }
        }
      } else {
        // 斜坡区域
        f.vx *= SLOPE_FRICTION;
        
        // 左斜坡碰撞
        this.collideSlope(f, 
          this.slopeLeftStartX, this.slopeTopY, 
          this.bucketLeft, this.bucketTop, 1);
        
        // 右斜坡碰撞
        this.collideSlope(f, 
          this.slopeRightStartX, this.slopeTopY, 
          this.bucketRight, this.bucketTop, -1);
        
        // 边界
        if (f.x - f.radius < 10) {
          f.x = 10 + f.radius;
          f.vx = Math.abs(f.vx) * 0.5;
        }
        if (f.x + f.radius > this.designSize.width - 10) {
          f.x = this.designSize.width - 10 - f.radius;
          f.vx = -Math.abs(f.vx) * 0.5;
        }
        
        // 掉出底部（不应该发生）
        if (f.y > this.bucketBottom + 50) {
          f.y = this.bucketBottom;
          f.settled = true;
        }
      }
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2 * dt;
      p.life -= 0.025 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 分数弹窗
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      this.scorePopups[i].progress += 0.03 * dt;
      if (this.scorePopups[i].progress >= 1) this.scorePopups.splice(i, 1);
    }

    this.checkWin();
    this.checkOverflow();
  }

  collideSlope(fruit, x1, y1, x2, y2, normalDir) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return;
    
    let t = ((fruit.x - x1) * dx + (fruit.y - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    const distX = fruit.x - closestX;
    const distY = fruit.y - closestY;
    const dist = Math.sqrt(distX * distX + distY * distY);
    
    if (dist < fruit.radius && dist > 0) {
      const nx = distX / dist;
      const ny = distY / dist;
      const overlap = fruit.radius - dist;
      
      fruit.x += nx * overlap;
      fruit.y += ny * overlap;
      
      // 反弹
      const vn = fruit.vx * nx + fruit.vy * ny;
      if (vn < 0) {
        fruit.vx -= (1 + BOUNCE) * vn * nx;
        fruit.vy -= (1 + BOUNCE) * vn * ny;
      }
    }
  }

  resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;
    
    if (dist < minDist && dist > 0.1) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      
      // 分离
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
      
      // 速度交换
      const dvx = b.vx - a.vx;
      const dvy = b.vy - a.vy;
      const dvDotN = dvx * nx + dvy * ny;
      
      if (dvDotN < 0) {
        const impulse = dvDotN * 0.5;
        a.vx += impulse * nx;
        a.vy += impulse * ny;
        b.vx -= impulse * nx;
        b.vy -= impulse * ny;
      }
      
      // 如果一个已稳定，让另一个弹开
      if (a.settled && !b.settled) {
        b.vy = -Math.abs(b.vy) * 0.3;
      } else if (b.settled && !a.settled) {
        a.vy = -Math.abs(a.vy) * 0.3;
      }
    }
  }

  checkElimination() {
    let found = true;
    while (found) {
      found = false;
      // 从底部往上检查相邻水果
      const bucketFruits = this.fruits
        .filter(f => f.settled && f.inBucket)
        .sort((a, b) => b.y - a.y); // 按Y从大到小（底部在上）
      
      for (let i = 0; i < bucketFruits.length - 1; i++) {
        const a = bucketFruits[i];
        const b = bucketFruits[i + 1];
        
        if (a.type === b.type) {
          // 消除
          this.combo++;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          const gain = 10 * this.combo;
          this.score += gain;
          this.remainingFruits -= 2;
          
          playSound(SoundType.CLEAR);
          this.createParticles(a.x, a.y, a.color);
          this.createParticles(b.x, b.y, b.color);
          this.scorePopups.push({
            text: `+${gain}`,
            x: this.bucketCenterX,
            y: Math.min(a.y, b.y) - 30,
            progress: 0
          });
          
          // 移除
          this.fruits = this.fruits.filter(f => f !== a && f !== b);
          
          // 让上方的水果落下
          for (const f of this.fruits) {
            if (f.settled && f.inBucket && f.y < Math.max(a.y, b.y)) {
              f.settled = false;
              f.vy = 1;
            }
          }
          
          found = true;
          break;
        }
      }
    }
  }

  createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color, life: 1, size: 4 + Math.random() * 4
      });
    }
  }

  checkWin() {
    const hasTop = this.topFruits.some(f => !f.removed);
    const hasFalling = this.fruits.some(f => !f.settled);
    const hasBucket = this.fruits.some(f => f.settled);
    if (!hasTop && !hasFalling && !hasBucket) {
      this.gameWon = true;
      playSound(SoundType.LEVEL_UP);
    }
  }

  checkOverflow() {
    for (const f of this.fruits) {
      if (f.settled && f.y - f.radius < this.bucketTop + 20) {
        this.gameOver = true;
        playSound(SoundType.GAME_OVER);
        return;
      }
    }
  }

  onTouchStart(pos) {
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') {
      this.gameOver = true;
      if (!this.scoreSaved) { RankData.save(this.gameId, this.score); this.scoreSaved = true; }
      this.onEnd({ score: this.score, passed: false });
      return;
    }

    // 已结束只处理按钮点击
    if (this.gameOver || this.gameWon) {
      if (btn === 'backBtn') {
        if (!this.scoreSaved) { RankData.save(this.gameId, this.score); this.scoreSaved = true; }
        this.onEnd({ score: this.score, passed: this.gameWon });
        return;
      }
      // 点击确认按钮
      if (this.confirmBtn && pos.x >= this.confirmBtn.x && pos.x <= this.confirmBtn.x + this.confirmBtn.w &&
          pos.y >= this.confirmBtn.y && pos.y <= this.confirmBtn.y + this.confirmBtn.h) {
        if (!this.scoreSaved) { RankData.save(this.gameId, this.score); this.scoreSaved = true; }
        this.onEnd({ score: this.score, passed: this.gameWon });
        return;
      }
      return;
    }

    // 点击水果
    let closest = null;
    let closestDist = Infinity;
    for (const f of this.topFruits) {
      if (f.removed) continue;
      const dx = pos.x - f.x;
      const dy = pos.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= f.radius + 15 && dist < closestDist) {
        closest = f;
        closestDist = dist;
      }
    }
    if (closest) this.clickFruit(closest);
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop } = this.designSize;

    // 暖色背景
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#fff5e6');
    bgGradient.addColorStop(0.5, '#ffe8cc');
    bgGradient.addColorStop(1, '#ffd699');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 标题
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    drawText(ctx, '🍎 水果消消乐', width / 2, safeTop + 40, { fontSize: 40, color: '#e65100', bold: true });
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 信息行
    drawText(ctx, `分数: ${this.score}`, width / 2 - 80, safeTop + 85, { fontSize: 24, color: '#bf360c', bold: true });
    
    const remaining = this.topFruits.filter(f => !f.removed).length + this.fruits.length;
    drawText(ctx, `剩余: ${remaining}`, width / 2 + 80, safeTop + 85, { fontSize: 24, color: '#bf360c', bold: true });
    
    if (this.combo > 1) {
      drawText(ctx, `🔥 连击 x${this.combo}`, width / 2, safeTop + 115, { fontSize: 22, color: '#d84315', bold: true });
    }

    this.buttons = this.drawBackButton(ctx);

    // 绘制场景
    this.drawSlopes(ctx);
    this.drawBucket(ctx);

    // 顶部水果
    for (const f of this.topFruits) {
      if (f.removed) continue;
      this.drawFruit(f, 1, 1);
    }

    // 掉落水果（带轨迹）
    for (const f of this.fruits) {
      // 轨迹
      for (let i = 0; i < f.trail.length; i++) {
        const t = f.trail[i];
        ctx.globalAlpha = (i + 1) / f.trail.length * 0.2;
        ctx.font = `${Math.floor(f.radius * 1.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.emoji, t.x, t.y);
      }
      ctx.globalAlpha = 1;
      this.drawFruit(f, 1, 1);
    }

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 分数弹窗
    for (const sp of this.scorePopups) {
      ctx.globalAlpha = 1 - sp.progress;
      drawText(ctx, sp.text, sp.x, sp.y - sp.progress * 35, { fontSize: 36, color: '#e65100', bold: true });
    }
    ctx.globalAlpha = 1;

    // 游戏结束弹窗
    if (this.gameWon || this.gameOver) {
      this.drawEndPopup(ctx, width, height, this.gameWon);
    }
  }

  drawSlopes(ctx) {
    // 左斜坡
    const leftGradient = ctx.createLinearGradient(this.slopeLeftStartX, this.slopeTopY, this.bucketLeft, this.bucketTop);
    leftGradient.addColorStop(0, '#d4a574');
    leftGradient.addColorStop(1, '#8b5a2b');
    
    ctx.fillStyle = leftGradient;
    ctx.beginPath();
    ctx.moveTo(this.slopeLeftStartX, this.slopeTopY);
    ctx.lineTo(this.slopeLeftStartX + 40, this.slopeTopY);
    ctx.lineTo(this.bucketLeft + 8, this.bucketTop);
    ctx.lineTo(this.bucketLeft, this.bucketTop);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.slopeLeftStartX, this.slopeTopY);
    ctx.lineTo(this.bucketLeft, this.bucketTop);
    ctx.stroke();

    // 右斜坡
    const rightGradient = ctx.createLinearGradient(this.slopeRightStartX, this.slopeTopY, this.bucketRight, this.bucketTop);
    rightGradient.addColorStop(0, '#d4a574');
    rightGradient.addColorStop(1, '#8b5a2b');
    
    ctx.fillStyle = rightGradient;
    ctx.beginPath();
    ctx.moveTo(this.slopeRightStartX, this.slopeTopY);
    ctx.lineTo(this.slopeRightStartX - 40, this.slopeTopY);
    ctx.lineTo(this.bucketRight - 8, this.bucketTop);
    ctx.lineTo(this.bucketRight, this.bucketTop);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.slopeRightStartX, this.slopeTopY);
    ctx.lineTo(this.bucketRight, this.bucketTop);
    ctx.stroke();
  }

  drawBucket(ctx) {
    // 桶壁阴影
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    
    // 左桶壁
    ctx.fillStyle = '#5c2d0a';
    ctx.fillRect(this.bucketLeft - 8, this.bucketTop, 8, this.bucketHeight);
    
    // 右桶壁
    ctx.fillRect(this.bucketRight, this.bucketTop, 8, this.bucketHeight);
    
    // 桶底
    ctx.fillRect(this.bucketLeft - 8, this.bucketBottom, this.bucketHalfWidth * 2 + 16, 8);
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 桶内壁高光
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.bucketLeft, this.bucketTop);
    ctx.lineTo(this.bucketLeft, this.bucketBottom);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(this.bucketRight, this.bucketTop);
    ctx.lineTo(this.bucketRight, this.bucketBottom);
    ctx.stroke();

    // 桶口标记
    ctx.strokeStyle = 'rgba(230,81,0,0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(this.bucketLeft - 8, this.bucketTop);
    ctx.lineTo(this.bucketRight + 8, this.bucketTop);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawBackButton(ctx) {
    const { width, safeTop } = this.designSize;
    const btnX = width - 110;
    const btnY = safeTop + 18;
    const btnW = 90;
    const btnH = 38;

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeStyle = 'rgba(230,81,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.stroke();

    drawText(ctx, '← 返回', btnX + btnW / 2, btnY + btnH / 2, { fontSize: 18, color: '#e65100', bold: true });
    return { backBtn: { x: btnX, y: btnY, width: btnW, height: btnH } };
  }

  drawEndPopup(ctx, width, height, isWin) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, width, height);

    const cardW = 360;
    const cardH = 340;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    const cardGradient = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
    cardGradient.addColorStop(0, '#fff8e1');
    cardGradient.addColorStop(1, '#ffe0b2');
    ctx.fillStyle = cardGradient;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = isWin ? '#f59e0b' : '#ef4444';
    ctx.lineWidth = 3;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.stroke();

    const title = isWin ? '🎉 通关！' : '😢 失败了';
    const titleColor = isWin ? '#f59e0b' : '#ef4444';
    drawText(ctx, title, width / 2, cardY + 60, { fontSize: 48, color: titleColor, bold: true });
    drawText(ctx, `得分: ${this.score}`, width / 2, cardY + 120, { fontSize: 32, color: '#1a1a1a', bold: true });
    
    if (this.maxCombo > 1) {
      drawText(ctx, `最高连击: ${this.maxCombo}x 🔥`, width / 2, cardY + 160, { fontSize: 26, color: '#d84315' });
    }

    const btnW = 200;
    const btnH = 50;
    const btnX = (width - btnW) / 2;
    const btnY = cardY + cardH - 80;

    const btnGradient = ctx.createLinearGradient(0, btnY, 0, btnY + btnH);
    btnGradient.addColorStop(0, isWin ? '#f59e0b' : '#ef4444');
    btnGradient.addColorStop(1, isWin ? '#d97706' : '#dc2626');
    ctx.fillStyle = btnGradient;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 14);
    ctx.fill();

    drawText(ctx, '确 定', width / 2, btnY + btnH / 2, { fontSize: 24, color: '#fff', bold: true });
    this.confirmBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  drawFruit(fruit, alpha, scale) {
    const ctx = this.ctx;
    const r = fruit.radius * scale;

    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.font = `${Math.floor(r * 2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fruit.emoji, fruit.x, fruit.y);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  destroy() {
    this.gameOver = true;
    audioManager.stopBgMusic();
  }
}

export default FruitGame;
