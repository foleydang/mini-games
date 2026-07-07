// 水果消消乐 - 斜坡引导 + 底部格子槽 + 物理碰撞
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

const GRAVITY = 0.22;
const MAX_VY = 10;
const SLOT_COUNT = 7;

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

    const { width, height, safeTop, safeBottom } = this.designSize;

    // 布局
    this.containerLeft = 40;
    this.containerRight = width - 40;
    this.containerTop = safeTop + 170;
    this.containerBottom = height - safeBottom - 30;

    // 斜坡区域
    this.slopeTop = this.containerTop;
    this.slopeBottom = this.containerBottom - 120;
    this.slopeHeight = this.slopeBottom - this.slopeTop;

    // 底部格子槽
    this.slotY = this.containerBottom - 60;
    this.slotSize = this.fruitRadius * 2 + 10;
    const totalWidth = SLOT_COUNT * this.slotSize + (SLOT_COUNT - 1) * 6;
    this.slotStartX = (width - totalWidth) / 2;
    this.slots = new Array(SLOT_COUNT).fill(null);

    this.topFruits = [];
    this.bucketFruits = [];
    this.droppingFruits = [];
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
    
    const types = [];
    const fruitsPerType = Math.ceil(this.maxFruits / this.maxTypes);
    const evenPerType = fruitsPerType % 2 === 0 ? fruitsPerType : fruitsPerType + 1;
    
    for (let t = 0; t < this.maxTypes; t++) {
      for (let i = 0; i < evenPerType; i++) types.push(t);
    }
    
    const total = Math.min(types.length, this.maxFruits);
    const evenTotal = total % 2 === 0 ? total : total - 1;
    types.length = evenTotal;

    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    const padding = 12;
    const minGap = 8;
    
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      let placed = false;
      
      for (let attempt = 0; attempt < 50; attempt++) {
        const x = this.containerLeft + padding + this.fruitRadius + 
                  Math.random() * (this.containerRight - this.containerLeft - padding * 2 - this.fruitRadius * 2);
        const y = this.slopeTop + padding + this.fruitRadius + 
                  Math.random() * (this.slopeHeight - padding * 2 - this.fruitRadius * 2);
        
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
        this.topFruits.push({
          x: this.containerLeft + padding + this.fruitRadius + Math.random() * (this.containerRight - this.containerLeft - padding * 2 - this.fruitRadius * 2),
          y: this.slopeTop + padding + this.fruitRadius + Math.random() * (this.slopeHeight - padding * 2 - this.fruitRadius * 2),
          type, emoji: FRUITS[type].emoji, color: FRUITS[type].color, radius: this.fruitRadius, removed: false
        });
      }
    }
    
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
      this.draw();
      return; // 停止循环，不再调用 RankData.save()
    }

    const dt = Math.min((currentTime - this.lastTime) / 16.67, 2);
    this.lastTime = currentTime;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.animate);
  }

  update(dt) {
    // 掉落水果互相碰撞
    for (let i = 0; i < this.droppingFruits.length; i++) {
      for (let j = i + 1; j < this.droppingFruits.length; j++) {
        this.resolveCollision(this.droppingFruits[i], this.droppingFruits[j]);
      }
    }

    // 更新掉落水果
    for (let i = this.droppingFruits.length - 1; i >= 0; i--) {
      const df = this.droppingFruits[i];
      
      df.trail.push({ x: df.x, y: df.y });
      if (df.trail.length > 5) df.trail.shift();

      df.vy = Math.min(df.vy + GRAVITY * dt, MAX_VY);
      df.y += df.vy * dt;
      df.x += (df.vx || 0) * dt;
      df.vx = (df.vx || 0) * 0.96;

      // 边界
      if (df.x - df.radius < this.containerLeft + 6) {
        df.x = this.containerLeft + 6 + df.radius;
        df.vx = Math.abs(df.vx) * 0.4;
      }
      if (df.x + df.radius > this.containerRight - 6) {
        df.x = this.containerRight - 6 - df.radius;
        df.vx = -Math.abs(df.vx) * 0.4;
      }

      // 斜面碰撞（V型斜坡引导水果进入格子）
      if (df.y + df.radius >= this.slopeBottom) {
        const slotIndex = this.findNearestSlot(df.x);
        const slotCx = this.getSlotX(slotIndex);
        
        // 往目标格子方向推
        const dir = slotCx > df.x ? 1 : -1;
        const dist = Math.abs(slotCx - df.x);
        
        if (dist > this.slotSize / 2) {
          // 还没到格子范围，应用斜坡力
          df.vx += dir * 3 * dt;
          df.vy = Math.min(df.vy, 4);
        } else {
          // 在格子范围内，直接落入
          if (Math.abs(df.vy) < 3) {
            this.finishIntoSlot(df, i, slotIndex);
            continue;
          } else {
            df.vy = -df.vy * 0.15;
            df.vx = dir * 1.5;
          }
        }
        
        // 防止掉出底部
        if (df.y + df.radius > this.slotY + 30) {
          df.y = this.slotY + 30 - df.radius;
        }
      }

      // 与已落格水果碰撞
      for (const sf of this.slots) {
        if (!sf) continue;
        const dx = sf.x - df.x;
        const dy = sf.y - df.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = df.radius + sf.radius;
        
        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          df.x -= nx * (minDist - dist) * 0.5;
          df.y -= ny * (minDist - dist) * 0.5;
          if (Math.abs(df.vy) > 2) {
            df.vy = -df.vy * 0.25;
            df.vx = nx * Math.abs(df.vy) * 0.4;
          } else {
            // 推入相邻格子
            const slotIndex = this.findNearestSlot(df.x);
            this.finishIntoSlot(df, i, slotIndex);
            break;
          }
        }
      }
    }

    // 更新已落格水果（重力下如果有空隙）
    for (let i = 0; i < this.slots.length; i++) {
      const sf = this.slots[i];
      if (!sf) continue;
      // 格子里的水果保持静止
      sf.x = this.getSlotX(i);
      sf.y = this.slotY;
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

  resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius + 4;
    
    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
      
      // 交换部分速度
      const relVx = b.vx - a.vx;
      const relVy = b.vy - a.vy;
      const relV = relVx * nx + relVy * ny;
      if (relV < 0) {
        const impulse = relV * 0.5;
        a.vx += nx * impulse;
        a.vy += ny * impulse;
        b.vx -= nx * impulse;
        b.vy -= ny * impulse;
      }
    }
  }

  getSlotX(index) {
    return this.slotStartX + index * (this.slotSize + 6) + this.slotSize / 2;
  }

  findNearestSlot(x) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const sx = this.getSlotX(i);
      const dist = Math.abs(sx - x);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  finishIntoSlot(df, dropIndex, slotIndex) {
    // 找最近的空格子
    let targetSlot = slotIndex;
    if (this.slots[slotIndex]) {
      // 如果目标格子满了，找相邻空格子
      let found = false;
      for (let offset = 1; offset < SLOT_COUNT; offset++) {
        if (slotIndex - offset >= 0 && !this.slots[slotIndex - offset]) {
          targetSlot = slotIndex - offset;
          found = true;
          break;
        }
        if (slotIndex + offset < SLOT_COUNT && !this.slots[slotIndex + offset]) {
          targetSlot = slotIndex + offset;
          found = true;
          break;
        }
      }
      if (!found) {
        // 所有格子都满了
        this.gameOver = true;
        playSound(SoundType.GAME_OVER);
        return;
      }
    }

    this.slots[targetSlot] = {
      x: this.getSlotX(targetSlot),
      y: this.slotY,
      type: df.type,
      emoji: df.emoji,
      color: df.color,
      radius: df.radius,
      slotIndex: targetSlot
    };
    this.droppingFruits.splice(dropIndex, 1);
    this.checkSlotElimination();
  }

  checkSlotElimination() {
    let found = true;
    while (found) {
      found = false;
      for (let i = 0; i < this.slots.length - 1; i++) {
        const a = this.slots[i];
        const b = this.slots[i + 1];
        if (a && b && a.type === b.type) {
          // 消除相邻相同水果
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
            y: this.slotY - 30,
            progress: 0
          });
          
          this.slots[i] = null;
          this.slots[i + 1] = null;
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
    const hasTopFruits = this.topFruits.some(f => !f.removed);
    const hasSlots = this.slots.some(s => s !== null);
    if (!hasTopFruits && !hasSlots && this.droppingFruits.length === 0) {
      this.gameWon = true;
      playSound(SoundType.LEVEL_UP);
    }
  }

  checkOverflow() {
    // 格子满了且有水果在掉落中
    if (this.slots.every(s => s !== null) && this.droppingFruits.length > 0) {
      this.gameOver = true;
      playSound(SoundType.GAME_OVER);
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
    
    const remaining = this.topFruits.filter(f => !f.removed).length + 
                      this.slots.filter(s => s).length + this.droppingFruits.length;
    drawText(ctx, `剩余: ${remaining}`, width / 2 + 80, safeTop + 85, { fontSize: 24, color: '#bf360c', bold: true });
    
    if (this.combo > 1) {
      drawText(ctx, `🔥 连击 x${this.combo}`, width / 2, safeTop + 115, { fontSize: 22, color: '#d84315', bold: true });
    }

    this.buttons = this.drawBackButton(ctx);

    // 斜坡区域 - 淡淡的参考线
    ctx.strokeStyle = 'rgba(230,81,0,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(this.containerLeft, this.slopeBottom);
    ctx.lineTo((this.containerLeft + this.slotStartX) / 2, this.slopeTop + this.slopeHeight * 0.3);
    ctx.lineTo(this.slotStartX, this.slopeBottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.containerRight, this.slopeBottom);
    ctx.lineTo((this.containerRight + this.slotStartX + SLOT_COUNT * (this.slotSize + 6)) / 2, this.slopeTop + this.slopeHeight * 0.3);
    ctx.lineTo(this.slotStartX + SLOT_COUNT * (this.slotSize + 6), this.slopeBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // 顶部水果区域虚线边框
    ctx.strokeStyle = 'rgba(230,81,0,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.roundRect(ctx, this.containerLeft, this.slopeTop, this.containerRight - this.containerLeft, this.slopeHeight, 16);
    ctx.stroke();

    // 底部格子槽
    this.drawSlotBar(ctx);

    // 顶部水果
    for (const f of this.topFruits) {
      if (f.removed) continue;
      this.drawFruit(f, 1, 1);
    }

    // 掉落水果（带轨迹）
    for (const df of this.droppingFruits) {
      for (let i = 0; i < df.trail.length; i++) {
        const t = df.trail[i];
        ctx.globalAlpha = (i + 1) / df.trail.length * 0.2;
        ctx.font = `${Math.floor(df.radius * 1.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(df.emoji, t.x, t.y);
      }
      ctx.globalAlpha = 1;
      this.drawFruit(df, 1, 1);
    }

    // 格子里的水果
    for (const sf of this.slots) {
      if (!sf) continue;
      this.drawFruit(sf, 1, 1);
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

  drawEndPopup(ctx, width, height, isWin) {
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, width, height);

    // 弹窗卡片
    const cardW = 360;
    const cardH = 340;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    // 卡片阴影
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    // 卡片背景
    const cardGradient = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
    cardGradient.addColorStop(0, '#fff8e1');
    cardGradient.addColorStop(1, '#ffe0b2');
    ctx.fillStyle = cardGradient;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 卡片边框
    ctx.strokeStyle = isWin ? '#f59e0b' : '#ef4444';
    ctx.lineWidth = 3;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.stroke();

    // 标题
    const title = isWin ? '🎉 通关！' : '😢 失败了';
    const titleColor = isWin ? '#f59e0b' : '#ef4444';
    drawText(ctx, title, width / 2, cardY + 60, { fontSize: 48, color: titleColor, bold: true });

    // 得分
    drawText(ctx, `得分: ${this.score}`, width / 2, cardY + 120, { fontSize: 32, color: '#1a1a1a', bold: true });

    // 连击
    if (this.maxCombo > 1) {
      drawText(ctx, `最高连击: ${this.maxCombo}x 🔥`, width / 2, cardY + 160, { fontSize: 26, color: '#d84315' });
    }

    // 确认按钮
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

  drawSlotBar(ctx) {
    const totalWidth = SLOT_COUNT * this.slotSize + (SLOT_COUNT - 1) * 6;
    const barX = this.slotStartX - 10;
    const barY = this.slotY - this.slotSize / 2 - 10;
    const barW = totalWidth + 20;
    const barH = this.slotSize + 20;

    // 槽背景
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#5c2d0a';
    ctx.beginPath();
    this.roundRect(ctx, barX, barY, barW, barH, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 边框
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 3;
    ctx.beginPath();
    this.roundRect(ctx, barX, barY, barW, barH, 16);
    ctx.stroke();

    // 每个格子
    for (let i = 0; i < SLOT_COUNT; i++) {
      const sx = this.slotStartX + i * (this.slotSize + 6);
      const sy = this.slotY - this.slotSize / 2;
      
      ctx.fillStyle = this.slots[i] ? 'rgba(255,255,255,0.15)' : '#3d1f0a';
      ctx.beginPath();
      this.roundRect(ctx, sx, sy, this.slotSize, this.slotSize, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      this.roundRect(ctx, sx, sy, this.slotSize, this.slotSize, 10);
      ctx.stroke();
    }
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