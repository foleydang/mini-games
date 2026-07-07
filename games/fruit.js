// 水果消消乐 - 欢乐暖色调 + 弧形底 + 随机布局
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
const MAX_VY = 8;
const BOUNCE = 0.25;
const FRICTION = 0.92;

class FruitGame {
  constructor(canvas, ctx, designSize, onEnd, level = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'fruit';
    this.level = level;

    // 关卡配置
    const levelConfigs = [
      { maxFruits: 16, types: 4, radius: 38 },
      { maxFruits: 20, types: 5, radius: 36 },
      { maxFruits: 24, types: 6, radius: 34 },
      { maxFruits: 28, types: 7, radius: 32 },
      { maxFruits: 32, types: 8, radius: 30 }
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

    // 容器布局 - 全屏宽，弧形底
    this.containerLeft = 50;
    this.containerRight = width - 50;
    this.containerTop = safeTop + 180;
    this.containerBottom = height - safeBottom - 50;
    this.containerWidth = this.containerRight - this.containerLeft;
    this.containerHeight = this.containerBottom - this.containerTop;

    // 弧形底参数 - 中间凹下去
    this.curveDepth = 40;

    this.topFruits = [];
    this.bucketFruits = [];
    this.droppingFruits = [];
    this.particles = [];
    this.removing = [];
    this.removeProgress = 0;
    this.eliminating = false;
    this.scorePopups = [];

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
    
    // 保证每种水果偶数个
    const types = [];
    const fruitsPerType = Math.ceil(this.maxFruits / this.maxTypes);
    // 确保偶数
    const evenPerType = fruitsPerType % 2 === 0 ? fruitsPerType : fruitsPerType + 1;
    
    for (let t = 0; t < this.maxTypes; t++) {
      for (let i = 0; i < evenPerType; i++) {
        types.push(t);
      }
    }
    
    // 截取到 maxFruits（保证偶数）
    const total = Math.min(types.length, this.maxFruits);
    const evenTotal = total % 2 === 0 ? total : total - 1;
    types.length = evenTotal;

    // 打乱
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    // 随机放置（不重叠）
    const padding = 15;
    const minGap = 6;
    
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      let placed = false;
      
      for (let attempt = 0; attempt < 50; attempt++) {
        const x = this.containerLeft + padding + this.fruitRadius + 
                  Math.random() * (this.containerWidth - padding * 2 - this.fruitRadius * 2);
        const y = this.containerTop + padding + this.fruitRadius + 
                  Math.random() * (this.containerHeight * 0.6 - this.fruitRadius * 2);
        
        // 检查重叠
        let overlap = false;
        for (const other of this.topFruits) {
          const dx = other.x - x;
          const dy = other.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < this.fruitRadius * 2 + minGap) {
            overlap = true;
            break;
          }
        }
        
        if (!overlap) {
          this.topFruits.push({
            x, y, type,
            emoji: FRUITS[type].emoji,
            color: FRUITS[type].color,
            radius: this.fruitRadius,
            removed: false
          });
          placed = true;
          break;
        }
      }
      
      // 如果50次都放不下，强行放
      if (!placed) {
        this.topFruits.push({
          x: this.containerLeft + padding + this.fruitRadius + 
              Math.random() * (this.containerWidth - padding * 2 - this.fruitRadius * 2),
          y: this.containerTop + padding + this.fruitRadius + 
              Math.random() * (this.containerHeight * 0.6 - this.fruitRadius * 2),
          type,
          emoji: FRUITS[type].emoji,
          color: FRUITS[type].color,
          radius: this.fruitRadius,
          removed: false
        });
      }
    }
    
    // 记录总水果数
    this.totalFruits = this.topFruits.length;
    this.remainingFruits = this.totalFruits;
  }

  clickFruit(fruit) {
    if (fruit.removed) return;
    fruit.removed = true;
    playSound(SoundType.DROP);
    
    this.droppingFruits.push({
      x: fruit.x,
      y: fruit.y,
      vx: (Math.random() - 0.5) * 2,
      vy: 0,
      type: fruit.type,
      emoji: fruit.emoji,
      color: fruit.color,
      radius: fruit.radius,
      trail: []
    });
  }

  animate(currentTime) {
    if (this.gameOver || this.gameWon) {
      audioManager.stopBgMusic();
      if (!this.scoreSaved) {
        RankData.save(this.gameId, this.score);
        this.scoreSaved = true;
      }
      this.draw();
      return;
    }

    const dt = Math.min((currentTime - this.lastTime) / 16.67, 2);
    this.lastTime = currentTime;

    this.update(dt);
    this.draw();
    requestAnimationFrame(this.animate);
  }

  // 获取弧形底的Y坐标（给定x位置）
  getCurveY(x) {
    const centerX = (this.containerLeft + this.containerRight) / 2;
    const halfWidth = this.containerWidth / 2;
    const ratio = (x - centerX) / halfWidth; // -1 到 1
    // 抛物线：中间最低（curveDepth），两边为0
    return this.containerBottom - this.curveDepth * (1 - ratio * ratio);
  }

  update(dt) {
    // 更新掉落水果
    for (let i = this.droppingFruits.length - 1; i >= 0; i--) {
      const df = this.droppingFruits[i];
      
      // 轨迹
      df.trail.push({ x: df.x, y: df.y });
      if (df.trail.length > 6) df.trail.shift();

      // 物理
      df.vy = Math.min(df.vy + GRAVITY * dt, MAX_VY);
      df.y += df.vy * dt;
      df.x += (df.vx || 0) * dt;
      df.vx = (df.vx || 0) * FRICTION;

      // 容器边界
      if (df.x - df.radius < this.containerLeft + 8) {
        df.x = this.containerLeft + 8 + df.radius;
        df.vx = Math.abs(df.vx) * 0.5;
      }
      if (df.x + df.radius > this.containerRight - 8) {
        df.x = this.containerRight - 8 - df.radius;
        df.vx = -Math.abs(df.vx) * 0.5;
      }

      // 弧形底碰撞
      const groundY = this.getCurveY(df.x);
      if (df.y + df.radius >= groundY) {
        df.y = groundY - df.radius;
        if (Math.abs(df.vy) > 2) {
          df.vy = -df.vy * BOUNCE;
          // 弧形让水果往中间滚
          const centerX = (this.containerLeft + this.containerRight) / 2;
          const dir = centerX > df.x ? 1 : -1;
          df.vx += dir * 1.5;
        } else {
          this.finishDrop(df, i);
        }
      }

      // 与已掉落水果碰撞
      for (const bf of this.bucketFruits) {
        if (!bf.settled) continue;
        const dx = bf.x - df.x;
        const dy = bf.y - df.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = df.radius + bf.radius;
        
        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          df.x -= nx * overlap * 0.5;
          df.y -= ny * overlap * 0.5;
          
          if (Math.abs(df.vy) > 2) {
            df.vy = -df.vy * BOUNCE;
            df.vx = nx * Math.abs(df.vy) * 0.3;
          } else {
            this.finishDrop(df, i);
            break;
          }
        }
      }

      // 速度很低时停止
      if (Math.abs(df.vy) < 0.5) {
        const groundY = this.getCurveY(df.x);
        if (df.y + df.radius >= groundY - 5) {
          this.finishDrop(df, i);
        }
      }
    }

    // 更新已掉落水果
    for (const bf of this.bucketFruits) {
      if (bf.settled) {
        // 检查是否还有支撑
        const groundY = this.getCurveY(bf.x);
        const onGround = bf.y + bf.radius >= groundY - 3;
        const hasSupport = this.hasSupport(bf);
        
        if (!onGround && !hasSupport) {
          bf.settled = false;
          bf.vy = 0.5;
        }
      }
      
      if (!bf.settled) {
        bf.vy = Math.min(bf.vy + GRAVITY * dt, MAX_VY);
        bf.y += bf.vy * dt;
        bf.x += (bf.vx || 0) * dt;
        bf.vx = (bf.vx || 0) * FRICTION;

        if (bf.x - bf.radius < this.containerLeft + 8) {
          bf.x = this.containerLeft + 8 + bf.radius;
          bf.vx = Math.abs(bf.vx) * 0.3;
        }
        if (bf.x + bf.radius > this.containerRight - 8) {
          bf.x = this.containerRight - 8 - bf.radius;
          bf.vx = -Math.abs(bf.vx) * 0.3;
        }

        const groundY = this.getCurveY(bf.x);
        if (bf.y + bf.radius >= groundY) {
          bf.y = groundY - bf.radius;
          if (Math.abs(bf.vy) > 2) {
            bf.vy = -bf.vy * BOUNCE;
            // 弧形往中间滚
            const centerX = (this.containerLeft + this.containerRight) / 2;
            const dir = centerX > bf.x ? 1 : -1;
            bf.vx += dir * 1.2;
          } else {
            bf.vy = 0;
            bf.vx *= 0.5;
            if (Math.abs(bf.vx) < 0.3) {
              bf.settled = true;
              bf.settleTime = Date.now();
              this.checkElimination();
            }
          }
        }

        // 与其他水果碰撞
        for (const other of this.bucketFruits) {
          if (other === bf || !other.settled) continue;
          const dx = other.x - bf.x;
          const dy = other.y - bf.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = bf.radius + other.radius;
          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;
            bf.x -= nx * overlap * 0.5;
            bf.y -= ny * overlap * 0.5;
            if (ny < -0.3) {
              bf.vy = -Math.abs(bf.vy) * BOUNCE;
            }
          }
        }
      }
    }

    // 消除动画
    if (this.eliminating) {
      this.removeProgress += 0.06 * dt;
      if (this.removeProgress >= 1) {
        this.bucketFruits = this.bucketFruits.filter(f => !this.removing.includes(f));
        this.removing = [];
        this.removeProgress = 0;
        this.eliminating = false;
        this.unsettleFruits();
      }
    }

    // 粒子
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

  finishDrop(df, index) {
    this.bucketFruits.push({
      x: df.x,
      y: df.y,
      vx: 0,
      vy: 0,
      type: df.type,
      emoji: df.emoji,
      color: df.color,
      radius: df.radius,
      settled: false,
      settleTime: 0
    });
    this.droppingFruits.splice(index, 1);
  }

  checkElimination() {
    if (this.eliminating) return;
    
    let found = true;
    while (found) {
      found = false;
      for (let i = 0; i < this.bucketFruits.length; i++) {
        const a = this.bucketFruits[i];
        if (this.removing.includes(a) || !a.settled) continue;
        
        for (let j = i + 1; j < this.bucketFruits.length; j++) {
          const b = this.bucketFruits[j];
          if (this.removing.includes(b) || !b.settled || a.type !== b.type) continue;
          
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < a.radius + b.radius + 12) {
            this.removing.push(a, b);
            this.eliminating = true;
            this.removeProgress = 0;
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
              x: (a.x + b.x) / 2,
              y: Math.min(a.y, b.y) - 30,
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

  createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color,
        life: 1,
        size: 4 + Math.random() * 4
      });
    }
  }

  unsettleFruits() {
    for (const bf of this.bucketFruits) {
      if (!bf.settled) continue;
      const groundY = this.getCurveY(bf.x);
      const onGround = bf.y + bf.radius >= groundY - 3;
      if (!onGround && !this.hasSupport(bf)) {
        bf.settled = false;
        bf.vy = 0.5;
      }
    }
  }

  hasSupport(fruit) {
    for (const other of this.bucketFruits) {
      if (other === fruit || !other.settled) continue;
      const dx = other.x - fruit.x;
      const dy = other.y - fruit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dy > 0 && dist < fruit.radius + other.radius + 8) return true;
    }
    return false;
  }

  checkWin() {
    if (this.topFruits.every(f => f.removed) && 
        this.bucketFruits.length === 0 && 
        this.droppingFruits.length === 0 && 
        !this.eliminating) {
      this.gameWon = true;
      playSound(SoundType.LEVEL_UP);
    }
  }

  checkOverflow() {
    const now = Date.now();
    for (const bf of this.bucketFruits) {
      if (bf.settled && !this.removing.includes(bf)) {
        const age = now - (bf.settleTime || 0);
        if (age < 3000) continue;
        if (bf.y - bf.radius < this.containerTop + 40) {
          this.gameOver = true;
          playSound(SoundType.GAME_OVER);
          return;
        }
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

    if (this.gameOver || this.gameWon) {
      if (!this.scoreSaved) { RankData.save(this.gameId, this.score); this.scoreSaved = true; }
      this.onEnd({ score: this.score, passed: this.gameWon });
      return;
    }

    if (this.eliminating) return;

    // 点击顶部水果
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

  // ===== 渲染 =====
  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop } = this.designSize;

    // 暖色渐变背景
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#fff8e1');
    bgGradient.addColorStop(0.5, '#ffe0b2');
    bgGradient.addColorStop(1, '#ffcc80');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 标题
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    drawText(ctx, '🍎 水果消消乐', width / 2, safeTop + 45, {
      fontSize: 42, color: '#e65100', bold: true
    });
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 分数 + 剩余水果计数器
    let scoreText = `分数: ${this.score}`;
    drawText(ctx, scoreText, width / 2 - 80, safeTop + 95, {
      fontSize: 26, color: '#bf360c', bold: true
    });
    
    // 水果计数器
    const remaining = this.topFruits.filter(f => !f.removed).length + 
                      this.bucketFruits.length + 
                      this.droppingFruits.length;
    drawText(ctx, `剩余: ${remaining}`, width / 2 + 80, safeTop + 95, {
      fontSize: 26, color: '#bf360c', bold: true
    });

    if (this.combo > 1) {
      drawText(ctx, `🔥 连击 x${this.combo}`, width / 2, safeTop + 130, {
        fontSize: 24, color: '#d84315', bold: true
      });
    }

    // 返回按钮
    this.buttons = this.drawBackButton(ctx);

    // 1. 先画容器（背景层）
    this.drawContainer(ctx);

    // 2. 再画水果（顶层）
    for (const f of this.topFruits) {
      if (f.removed) continue;
      this.drawFruit(f, 1, 1);
    }

    for (const df of this.droppingFruits) {
      // 轨迹
      for (let i = 0; i < df.trail.length; i++) {
        const t = df.trail[i];
        ctx.globalAlpha = (i + 1) / df.trail.length * 0.25;
        ctx.font = `${Math.floor(df.radius * 1.2)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(df.emoji, t.x, t.y);
      }
      ctx.globalAlpha = 1;
      this.drawFruit(df, 1, 1);
    }

    for (const bf of this.bucketFruits) {
      if (this.removing.includes(bf)) continue;
      this.drawFruit(bf, 1, 1);
    }

    // 消除动画
    if (this.eliminating) {
      const p = this.removeProgress;
      for (const f of this.removing) {
        const scale = 1 + p * 0.6;
        const opacity = 1 - p;
        this.drawFruit(f, opacity, scale);
      }
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
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      drawText(ctx, sp.text, sp.x, sp.y - sp.progress * 40, {
        fontSize: 38, color: '#e65100', bold: true
      });
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // 游戏结束
    if (this.gameWon) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '🎉 通关！', width / 2, height / 2 - 80, {
        fontSize: 60, color: '#fbbf24', bold: true
      });
      drawText(ctx, `得分: ${this.score}`, width / 2, height / 2 - 10, {
        fontSize: 38, color: '#fff'
      });
      if (this.maxCombo > 2) {
        drawText(ctx, `最高连击: ${this.maxCombo}x 🔥`, width / 2, height / 2 + 50, {
          fontSize: 30, color: '#fbbf24'
        });
      }
      drawHint(ctx, this.designSize, '点击返回');
    } else if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '失败了 😢', width / 2, height / 2 - 80, {
        fontSize: 60, color: '#ef4444', bold: true
      });
      drawText(ctx, `得分: ${this.score}`, width / 2, height / 2 - 10, {
        fontSize: 38, color: '#fff'
      });
      if (this.maxCombo > 1) {
        drawText(ctx, `最高连击: ${this.maxCombo}x`, width / 2, height / 2 + 50, {
          fontSize: 30, color: '#fbbf24'
        });
      }
      drawHint(ctx, this.designSize, '点击返回');
    }
  }

  drawBackButton(ctx) {
    const { width, safeTop } = this.designSize;
    const btnX = width - 120;
    const btnY = safeTop + 25;
    const btnW = 100;
    const btnH = 42;

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.strokeStyle = 'rgba(230,81,0,0.4)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.stroke();

    drawText(ctx, '← 返回', btnX + btnW / 2, btnY + btnH / 2, {
      fontSize: 20, color: '#e65100', bold: true
    });

    return { backBtn: { x: btnX, y: btnY, width: btnW, height: btnH } };
  }

  drawContainer(ctx) {
    const { containerLeft, containerRight, containerTop, containerBottom, containerWidth, curveDepth } = this;
    const centerX = (containerLeft + containerRight) / 2;

    // 容器阴影
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;

    // 容器背景 - 暖色半透明
    ctx.fillStyle = 'rgba(255,248,225,0.5)';
    ctx.beginPath();
    ctx.moveTo(containerLeft, containerTop);
    ctx.lineTo(containerLeft, containerBottom - curveDepth);
    // 弧形底 - 二次贝塞尔曲线
    ctx.quadraticCurveTo(centerX, containerBottom + curveDepth * 0.5, containerRight, containerBottom - curveDepth);
    ctx.lineTo(containerRight, containerTop);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 容器边框
    ctx.strokeStyle = 'rgba(230,81,0,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(containerLeft, containerTop);
    ctx.lineTo(containerLeft, containerBottom - curveDepth);
    ctx.quadraticCurveTo(centerX, containerBottom + curveDepth * 0.5, containerRight, containerBottom - curveDepth);
    ctx.lineTo(containerRight, containerTop);
    ctx.stroke();

    // 危险线
    ctx.strokeStyle = 'rgba(239,68,68,0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(containerLeft + 15, containerTop + 40);
    ctx.lineTo(containerRight - 15, containerTop + 40);
    ctx.stroke();
    ctx.setLineDash([]);

    // 顶部开口标记
    ctx.strokeStyle = 'rgba(230,81,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(containerLeft, containerTop);
    ctx.lineTo(containerRight, containerTop);
    ctx.stroke();
  }

  drawFruit(fruit, alpha, scale) {
    const ctx = this.ctx;
    const r = fruit.radius * scale;

    ctx.globalAlpha = alpha;

    // 阴影
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;

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
