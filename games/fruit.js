// 水果消消乐 - 现代玻璃质感设计
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

class FruitGame {
  constructor(canvas, ctx, designSize, onEnd, level = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'fruit';
    this.level = level;

    // 关卡配置 - 更多水果，更大尺寸
    const levelConfigs = [
      { maxFruits: 16, gravity: 0.15, maxVy: 6, fruitRadius: 38 },
      { maxFruits: 20, gravity: 0.18, maxVy: 7, fruitRadius: 36 },
      { maxFruits: 24, gravity: 0.20, maxVy: 8, fruitRadius: 34 },
      { maxFruits: 28, gravity: 0.22, maxVy: 9, fruitRadius: 32 },
      { maxFruits: 32, gravity: 0.25, maxVy: 10, fruitRadius: 30 }
    ];
    const cfg = levelConfigs[Math.min(level, levelConfigs.length - 1)];
    this.maxFruits = cfg.maxFruits;
    this.gravity = cfg.gravity;
    this.maxVy = cfg.maxVy;
    this.fruitRadius = cfg.fruitRadius;

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.scoreSaved = false;

    const { width, height, safeTop, safeBottom } = designSize;

    // 布局 - 更大的容器
    this.btnY = safeTop + 160;
    this.containerLeft = 60;
    this.containerRight = width - 60;
    this.containerTop = safeTop + 220;
    this.containerBottom = height - safeBottom - 60;
    this.containerWidth = this.containerRight - this.containerLeft;
    this.containerHeight = this.containerBottom - this.containerTop;

    this.topFruits = [];
    this.bucketFruits = [];
    this.droppingFruits = [];
    this.particles = [];
    this.removing = [];
    this.removeProgress = 0;
    this.eliminating = false;
    this.scorePopups = [];
    this.floatingParticles = [];

    this.backButton = getBackButton(designSize);
    this.buttons = null;

    // 初始化浮动粒子
    this.initFloatingParticles();
    
    this.generateTopFruits();
    audioManager.startBgMusic();
    
    // 使用 requestAnimationFrame 实现流畅动画
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initFloatingParticles() {
    const { width, height } = this.designSize;
    for (let i = 0; i < 20; i++) {
      this.floatingParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 3 + 1,
        opacity: Math.random() * 0.3 + 0.1
      });
    }
  }

  generateTopFruits() {
    this.topFruits = [];
    const { width } = this.designSize;
    
    // 确保每种水果至少2个，便于配对
    const types = [];
    const fruitsPerType = Math.ceil(this.maxFruits / FRUITS.length);
    for (let t = 0; t < FRUITS.length; t++) {
      for (let i = 0; i < fruitsPerType; i++) {
        types.push(t);
      }
    }
    
    // 打乱
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    // 网格布局 - 更整齐
    const cols = Math.floor(this.containerWidth / (this.fruitRadius * 2.5));
    const rows = Math.ceil(this.maxFruits / cols);
    const cellWidth = this.containerWidth / cols;
    const cellHeight = (this.containerBottom - this.containerTop - 100) / rows;

    for (let i = 0; i < Math.min(types.length, this.maxFruits); i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = this.containerLeft + col * cellWidth + cellWidth / 2;
      const y = this.containerTop + 50 + row * cellHeight + cellHeight / 2;
      const type = types[i];
      
      this.topFruits.push({
        x, y, type,
        emoji: FRUITS[type].emoji,
        color: FRUITS[type].color,
        radius: this.fruitRadius,
        removed: false,
        scale: 1,
        opacity: 1
      });
    }
  }

  clickFruit(fruit) {
    if (fruit.removed) return;
    fruit.removed = true;
    playSound(SoundType.DROP);
    
    this.droppingFruits.push({
      x: fruit.x,
      y: fruit.y,
      vx: 0,
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

    const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 2); // 限制最大delta防止卡顿
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();
    requestAnimationFrame(this.animate);
  }

  update(dt) {
    // 更新浮动粒子
    const { width, height } = this.designSize;
    for (const p of this.floatingParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
    }

    // 更新掉落水果
    for (let i = this.droppingFruits.length - 1; i >= 0; i--) {
      const df = this.droppingFruits[i];
      
      // 记录轨迹
      if (df.trail.length < 5) {
        df.trail.push({ x: df.x, y: df.y, opacity: 1 });
      } else {
        df.trail.shift();
        df.trail.push({ x: df.x, y: df.y, opacity: 1 });
      }

      // 物理更新
      df.vy = Math.min(df.vy + this.gravity * dt, this.maxVy);
      df.y += df.vy * dt;
      df.x += (df.vx || 0) * dt;

      // 容器边界
      if (df.x - df.radius < this.containerLeft + 10) {
        df.x = this.containerLeft + 10 + df.radius;
        df.vx = Math.abs(df.vx || 0) * 0.5;
      }
      if (df.x + df.radius > this.containerRight - 10) {
        df.x = this.containerRight - 10 - df.radius;
        df.vx = -Math.abs(df.vx || 0) * 0.5;
      }

      // 底部碰撞
      if (df.y + df.radius >= this.containerBottom - 10) {
        df.y = this.containerBottom - 10 - df.radius;
        if (Math.abs(df.vy) > 2) {
          df.vy = -df.vy * 0.3;
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
            df.vy = -df.vy * 0.3;
            df.vx = nx * Math.abs(df.vy) * 0.3;
          } else {
            this.finishDrop(df, i);
            break;
          }
        }
      }

      // 速度很低时停止
      if (Math.abs(df.vy) < 0.5 && df.y + df.radius >= this.containerBottom - 20) {
        this.finishDrop(df, i);
      }
    }

    // 更新已掉落水果的重力
    for (const bf of this.bucketFruits) {
      if (!bf.settled) {
        bf.vy = Math.min(bf.vy + this.gravity * dt, this.maxVy);
        bf.y += bf.vy * dt;
        bf.x += (bf.vx || 0) * dt;

        if (bf.x - bf.radius < this.containerLeft + 10) {
          bf.x = this.containerLeft + 10 + bf.radius;
          bf.vx = 0;
        }
        if (bf.x + bf.radius > this.containerRight - 10) {
          bf.x = this.containerRight - 10 - bf.radius;
          bf.vx = 0;
        }
        if (bf.y + bf.radius >= this.containerBottom - 10) {
          bf.y = this.containerBottom - 10 - bf.radius;
          if (Math.abs(bf.vy) > 2) {
            bf.vy = -bf.vy * 0.3;
          } else {
            bf.vy = 0;
            bf.vx = 0;
            bf.settled = true;
            bf.settleTime = Date.now();
            this.checkElimination();
          }
        }
      }
    }

    // 消除动画
    if (this.eliminating) {
      this.removeProgress += 0.05 * dt;
      if (this.removeProgress >= 1) {
        this.bucketFruits = this.bucketFruits.filter(f => !this.removing.includes(f));
        this.removing = [];
        this.removeProgress = 0;
        this.eliminating = false;
        this.unsettleFruits();
      }
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2 * dt;
      p.life -= 0.02 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 更新分数弹窗
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      this.scorePopups[i].progress += 0.03 * dt;
      if (this.scorePopups[i].progress >= 1) this.scorePopups.splice(i, 1);
    }

    // 更新轨迹透明度
    for (const df of this.droppingFruits) {
      for (let i = 0; i < df.trail.length; i++) {
        df.trail[i].opacity = (i + 1) / df.trail.length * 0.3;
      }
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
      settled: true,
      settleTime: Date.now()
    });
    this.droppingFruits.splice(index, 1);
    this.checkElimination();
  }

  checkElimination() {
    if (this.eliminating) return;
    
    let found = true;
    while (found) {
      found = false;
      for (let i = 0; i < this.bucketFruits.length; i++) {
        const a = this.bucketFruits[i];
        if (this.removing.includes(a)) continue;
        
        for (let j = i + 1; j < this.bucketFruits.length; j++) {
          const b = this.bucketFruits[j];
          if (this.removing.includes(b) || a.type !== b.type) continue;
          
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < a.radius + b.radius + 10) {
            this.removing.push(a, b);
            this.eliminating = true;
            this.removeProgress = 0;
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            const gain = 10 * this.combo;
            this.score += gain;
            
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
      if (!this.hasSupport(bf) && bf.y + bf.radius < this.containerBottom - 15) {
        bf.settled = false;
        bf.vy = 1;
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
        if (age < 3000) continue; // 3秒宽限期
        if (bf.y - bf.radius < this.containerTop + 50) {
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
      if (!this.scoreSaved) {
        RankData.save(this.gameId, this.score);
        this.scoreSaved = true;
      }
      this.onEnd({ score: this.score, passed: false });
      return;
    }

    if (this.gameOver || this.gameWon) {
      if (!this.scoreSaved) {
        RankData.save(this.gameId, this.score);
        this.scoreSaved = true;
      }
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

  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop } = this.designSize;

    // 渐变背景
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#667eea');
    bgGradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 浮动粒子
    for (const p of this.floatingParticles) {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 标题
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    drawText(ctx, '🍎 水果消消乐', width / 2, safeTop + 50, { 
      fontSize: 42, color: '#fff', bold: true 
    });
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 分数显示
    let scoreText = `分数: ${this.score}`;
    if (this.combo > 1) {
      scoreText += `  🔥 x${this.combo}`;
    }
    drawText(ctx, scoreText, width / 2, safeTop + 100, { 
      fontSize: 28, color: '#fff', bold: this.combo > 1 
    });

    // 返回按钮
    this.buttons = this.drawModernButtons(ctx);

    // 绘制玻璃质感容器
    this.drawGlassContainer(ctx);

    // 绘制顶部水果
    for (const f of this.topFruits) {
      if (f.removed) continue;
      this.drawFruit(f, f.opacity, f.scale);
    }

    // 绘制掉落水果（带轨迹）
    for (const df of this.droppingFruits) {
      // 轨迹
      for (const t of df.trail) {
        ctx.globalAlpha = t.opacity;
        ctx.fillStyle = df.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, df.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      this.drawFruit(df, 1, 1);
    }

    // 绘制已掉落水果
    for (const bf of this.bucketFruits) {
      if (this.removing.includes(bf)) continue;
      this.drawFruit(bf, 1, 1);
    }

    // 消除动画
    if (this.eliminating) {
      const p = this.removeProgress;
      for (const f of this.removing) {
        const scale = 1 + p * 0.5;
        const opacity = 1 - p;
        this.drawFruit(f, opacity, scale);
      }
    }

    // 粒子效果
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
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      drawText(ctx, sp.text, sp.x, sp.y - sp.progress * 40, { 
        fontSize: 40, color: '#fbbf24', bold: true 
      });
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // 游戏结束覆盖层
    if (this.gameWon) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '🎉 通关！', width / 2, height / 2 - 80, { 
        fontSize: 64, color: '#fbbf24', bold: true 
      });
      drawText(ctx, `得分: ${this.score}`, width / 2, height / 2 - 10, { 
        fontSize: 40, color: '#fff' 
      });
      if (this.maxCombo > 2) {
        drawText(ctx, `最高连击: ${this.maxCombo}x 🔥`, width / 2, height / 2 + 50, { 
          fontSize: 32, color: '#fbbf24' 
        });
      }
      drawHint(ctx, this.designSize, '点击返回');
    } else if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '失败了 😢', width / 2, height / 2 - 80, { 
        fontSize: 64, color: '#ef4444', bold: true 
      });
      drawText(ctx, `得分: ${this.score}`, width / 2, height / 2 - 10, { 
        fontSize: 40, color: '#fff' 
      });
      if (this.maxCombo > 1) {
        drawText(ctx, `最高连击: ${this.maxCombo}x`, width / 2, height / 2 + 50, { 
          fontSize: 32, color: '#fbbf24' 
        });
      }
      drawHint(ctx, this.designSize, '点击返回');
    }
  }

  drawModernButtons(ctx) {
    const { width, safeTop } = this.designSize;
    const btnX = width - 120;
    const btnY = safeTop + 30;
    const btnW = 100;
    const btnH = 45;

    // 玻璃质感按钮
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.stroke();

    drawText(ctx, '← 返回', btnX + btnW / 2, btnY + btnH / 2, { 
      fontSize: 22, color: '#fff', bold: true 
    });

    return { backBtn: { x: btnX, y: btnY, width: btnW, height: btnH } };
  }

  drawGlassContainer(ctx) {
    const { containerLeft, containerRight, containerTop, containerBottom } = this;
    const w = containerRight - containerLeft;
    const h = containerBottom - containerTop;

    // 外层阴影
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;

    // 玻璃质感背景
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.roundRect(ctx, containerLeft, containerTop, w, h, 30);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 玻璃边框
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    this.roundRect(ctx, containerLeft, containerTop, w, h, 30);
    ctx.stroke();

    // 内层高光
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, containerLeft + 8, containerTop + 8, w - 16, h - 16, 25);
    ctx.stroke();

    // 危险线
    const dangerY = containerTop + 50;
    ctx.strokeStyle = 'rgba(239,68,68,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(containerLeft + 20, dangerY);
    ctx.lineTo(containerRight - 20, dangerY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawFruit(fruit, alpha, scale) {
    const ctx = this.ctx;
    const r = fruit.radius * scale;

    ctx.globalAlpha = alpha;

    // 阴影
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    // 水果emoji
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
