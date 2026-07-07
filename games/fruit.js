// 水果消消乐 - 掉落消除游戏
import { drawRoundRect, drawText, drawGradientBg, Storage, RankData } from '../common/utils.js';
import { getBackButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';
import { Levels } from '../common/config.js';

// 水果类型（从小到大）
const FRUITS = [
  { emoji: '🍒', radius: 20, color: '#dc2626' },
  { emoji: '🍓', radius: 22, color: '#e11d48' },
  { emoji: '🍇', radius: 24, color: '#7c3aed' },
  { emoji: '🍊', radius: 26, color: '#f97316' },
  { emoji: '🍎', radius: 28, color: '#ef4444' },
  { emoji: '🍑', radius: 30, color: '#fb7185' },
  { emoji: '🍋', radius: 32, color: '#facc15' },
  { emoji: '🍉', radius: 36, color: '#16a34a' }
];

const GRAVITY = 0.5;
const MAX_VELOCITY = 12;
const BOUNCE = 0.3;
const FRICTION = 0.95;

class FruitGame {
  constructor(canvas, ctx, designSize, onEnd, level = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'fruit';
    this.level = Math.min(level, Levels.fruit.length - 1);

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.scoreSaved = false;

    // 关卡配置
    const config = Levels.fruit[this.level];
    this.targetScore = config.target || 500;
    this.maxFruitTypes = config.types || 5;

    // 布局
    const { width, height, safeTop, safeBottom } = designSize;
    this.containerLeft = 40;
    this.containerRight = width - 40;
    this.containerBottom = height - safeBottom - 80;
    this.containerTop = safeTop + 320;
    this.containerWidth = this.containerRight - this.containerLeft;
    this.containerHeight = this.containerBottom - this.containerTop;

    // 当前准备掉落的水果
    this.currentFruit = null;
    this.dropX = width / 2;
    this.dropLine = { y1: safeTop + 120, y2: safeTop + 280 };

    // 容器中的水果
    this.fruits = [];
    
    // 动画状态
    this.eliminating = false;
    this.eliminateFruits = [];
    this.eliminateProgress = 0;
    this.particles = [];

    this.backButton = getBackButton(designSize);
    this.soundEnabled = true;
    this.loopTimer = null;

    this.init();
  }

  init() {
    this.spawnFruit();
    audioManager.startBgMusic();
    this.gameLoop();
  }

  spawnFruit() {
    // 只使用前几种水果（根据关卡难度）
    const type = Math.floor(Math.random() * this.maxFruitTypes);
    const fruit = FRUITS[type];
    this.currentFruit = {
      type: type,
      emoji: fruit.emoji,
      radius: fruit.radius,
      color: fruit.color
    };
  }

  dropFruit() {
    if (!this.currentFruit || this.eliminating || this.gameOver || this.gameWon) return;

    const fruit = this.currentFruit;
    const { safeTop } = this.designSize;

    this.fruits.push({
      x: this.dropX,
      y: this.dropLine.y2,
      vx: 0,
      vy: 0,
      type: fruit.type,
      emoji: fruit.emoji,
      radius: fruit.radius,
      color: fruit.color,
      settled: false
    });

    playSound(SoundType.DROP);
    this.currentFruit = null;
    this.combo = 0;
  }

  gameLoop() {
    if (this.gameOver || this.gameWon) {
      audioManager.stopBgMusic();
      if (!this.scoreSaved) {
        RankData.save(this.gameId, this.score);
        this.scoreSaved = true;
      }
      this.draw();
      return;
    }

    this.update();
    this.draw();
    this.loopTimer = setTimeout(() => this.gameLoop(), 33);
  }

  update() {
    // 更新掉落中的水果
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      if (f.settled) continue;

      // 重力
      f.vy = Math.min(f.vy + GRAVITY, MAX_VELOCITY);
      f.y += f.vy;
      f.x += f.vx;
      f.vx *= FRICTION;

      // 容器边界
      if (f.x - f.radius < this.containerLeft) {
        f.x = this.containerLeft + f.radius;
        f.vx = Math.abs(f.vx) * BOUNCE;
      }
      if (f.x + f.radius > this.containerRight) {
        f.x = this.containerRight - f.radius;
        f.vx = -Math.abs(f.vx) * BOUNCE;
      }

      // 底部碰撞
      if (f.y + f.radius >= this.containerBottom) {
        f.y = this.containerBottom - f.radius;
        if (Math.abs(f.vy) < 2) {
          f.vy = 0;
          f.vx = 0;
          f.settled = true;
          this.checkElimination();
        } else {
          f.vy = -f.vy * BOUNCE;
        }
      }

      // 与其他水果碰撞
      for (const other of this.fruits) {
        if (other === f || !other.settled) continue;
        this.resolveCollision(f, other);
      }
    }

    // 消除动画
    if (this.eliminating) {
      this.eliminateProgress += 0.1;
      if (this.eliminateProgress >= 1) {
        this.fruits = this.fruits.filter(f => !this.eliminateFruits.includes(f));
        this.eliminateFruits = [];
        this.eliminating = false;
        this.eliminateProgress = 0;
        
        // 让上方的水果继续下落
        for (const f of this.fruits) {
          if (f.settled && !this.hasSupport(f)) {
            f.settled = false;
            f.vy = 0;
          }
        }
      }
    }

    // 粒子效果
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= 0.05;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 检查游戏状态
    this.checkGameState();

    // 生成新水果
    if (!this.currentFruit && !this.eliminating && this.fruits.every(f => f.settled)) {
      this.spawnFruit();
    }
  }

  resolveCollision(f1, f2) {
    const dx = f2.x - f1.x;
    const dy = f2.y - f1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = f1.radius + f2.radius;

    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      // 分离
      f1.x -= nx * overlap * 0.5;
      f1.y -= ny * overlap * 0.5;

      // 反弹
      const relVy = f1.vy;
      f1.vy = -relVy * BOUNCE;
      f1.vx += nx * 2;
    }
  }

  hasSupport(fruit) {
    // 检查下方是否有支撑
    if (fruit.y + fruit.radius >= this.containerBottom - 2) return true;
    
    for (const other of this.fruits) {
      if (other === fruit || !other.settled || this.eliminateFruits.includes(other)) continue;
      const dy = other.y - fruit.y;
      const dx = Math.abs(other.x - fruit.x);
      if (dy > 0 && dy < fruit.radius + other.radius && dx < fruit.radius + other.radius) {
        return true;
      }
    }
    return false;
  }

  checkElimination() {
    if (this.eliminating) return;

    // 找两个相同且接触的水果
    for (let i = 0; i < this.fruits.length; i++) {
      const f1 = this.fruits[i];
      if (!f1.settled) continue;

      for (let j = i + 1; j < this.fruits.length; j++) {
        const f2 = this.fruits[j];
        if (!f2.settled || f1.type !== f2.type) continue;

        const dx = f2.x - f1.x;
        const dy = f2.y - f1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = f1.radius + f2.radius + 5; // 接触判定

        if (dist < minDist) {
          // 消除这两个水果
          this.eliminating = true;
          this.eliminateFruits = [f1, f2];
          this.eliminateProgress = 0;

          // 加分
          this.combo++;
          const points = 10 * this.combo;
          this.score += points;
          this.maxCombo = Math.max(this.maxCombo, this.combo);

          // 特效
          this.createEliminationEffect(f1);
          this.createEliminationEffect(f2);
          playSound(SoundType.CLEAR);

          return;
        }
      }
    }
  }

  createEliminationEffect(fruit) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 3 + Math.random() * 3;
      this.particles.push({
        x: fruit.x,
        y: fruit.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: fruit.color,
        life: 1
      });
    }
  }

  checkGameState() {
    // 胜利条件
    if (this.score >= this.targetScore) {
      this.gameWon = true;
      playSound(SoundType.LEVEL_UP);
      return;
    }

    // 失败条件：容器满了
    for (const f of this.fruits) {
      if (f.settled && f.y - f.radius < this.containerTop) {
        this.gameOver = true;
        playSound(SoundType.GAME_OVER);
        return;
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop } = this.designSize;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawGradientBg(ctx, width, height, '#fef3c7', '#fde68a');

    // 标题和分数
    drawText(ctx, '水果消消乐', width / 2, safeTop + 40, { fontSize: 40, color: '#d97706', bold: true });
    
    let scoreText = `分数: ${this.score} / ${this.targetScore}`;
    if (this.combo > 1) {
      scoreText += `  🔥 x${this.combo}`;
    }
    drawText(ctx, scoreText, width / 2, safeTop + 80, { fontSize: 24, color: '#92400e', bold: this.combo > 1 });

    // 底部按钮
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);

    // 掉落引导线
    if (this.currentFruit) {
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.dropX, this.dropLine.y1);
      ctx.lineTo(this.dropX, this.containerTop);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 当前准备掉落的水果
    if (this.currentFruit) {
      this.drawFruit(this.currentFruit, this.dropX, this.dropLine.y2, 1, 1);
    }

    // 容器
    this.drawContainer();

    // 容器中的水果
    for (const f of this.fruits) {
      if (this.eliminateFruits.includes(f)) {
        const alpha = 1 - this.eliminateProgress;
        const scale = 1 + this.eliminateProgress * 0.3;
        this.drawFruit(f, f.x, f.y, alpha, scale);
      } else {
        this.drawFruit(f, f.x, f.y, 1, 1);
      }
    }

    // 粒子效果
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 游戏结束
    if (this.gameWon) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '🎉 通关！', width / 2, height / 2 - 70, { fontSize: 56, color: '#fbbf24', bold: true });
      drawText(ctx, `得分: ${this.score}`, width / 2, height / 2 - 10, { fontSize: 36, color: '#fff' });
      if (this.maxCombo > 2) {
        drawText(ctx, `最高连击: ${this.maxCombo}x 🔥`, width / 2, height / 2 + 40, { fontSize: 28, color: '#fbbf24' });
      }
      drawHint(ctx, this.designSize, '点击返回');
    } else if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '失败了 😢', width / 2, height / 2 - 70, { fontSize: 56, color: '#ef4444', bold: true });
      drawText(ctx, `得分: ${this.score}`, width / 2, height / 2 - 10, { fontSize: 36, color: '#fff' });
      if (this.maxCombo > 1) {
        drawText(ctx, `最高连击: ${this.maxCombo}x`, width / 2, height / 2 + 40, { fontSize: 28, color: '#fbbf24' });
      }
      drawHint(ctx, this.designSize, '点击返回');
    }
  }

  drawFruit(fruit, x, y, alpha, scale) {
    const ctx = this.ctx;
    const r = fruit.radius * scale;

    ctx.globalAlpha = alpha;

    // 阴影
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // Emoji
    ctx.font = `${Math.floor(r * 2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fruit.emoji, x, y);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
  }

  drawContainer() {
    const ctx = this.ctx;
    const wallWidth = 8;

    // 容器外壁（深色）
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(this.containerLeft - wallWidth, this.containerTop - 20);
    ctx.lineTo(this.containerLeft - wallWidth, this.containerBottom + wallWidth);
    ctx.lineTo(this.containerRight + wallWidth, this.containerBottom + wallWidth);
    ctx.lineTo(this.containerRight + wallWidth, this.containerTop - 20);
    ctx.closePath();
    ctx.fill();

    // 容器内部（浅色）
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(this.containerLeft, this.containerTop, this.containerWidth, this.containerHeight);

    // 危险线
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(this.containerLeft + 10, this.containerTop + 20);
    ctx.lineTo(this.containerRight - 10, this.containerTop + 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  onTouchStart(pos) {
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') {
      this.onEnd({ score: this.score, passed: false });
      return;
    }
    if (btn === 'soundBtn') {
      this.soundEnabled = !this.soundEnabled;
      audioManager.toggle();
      this.draw();
      return;
    }

    if (this.gameOver || this.gameWon) {
      this.onEnd({ score: this.score, passed: this.gameWon });
      return;
    }

    if (this.eliminating || !this.currentFruit) return;

    // 点击屏幕掉落
    if (pos.y > this.dropLine.y2) {
      this.dropFruit();
    }
  }

  onTouchMove(pos) {
    if (this.gameOver || this.gameWon || !this.currentFruit || this.eliminating) return;

    // 左右移动瞄准
    this.dropX = Math.max(this.containerLeft + this.currentFruit.radius,
                          Math.min(this.containerRight - this.currentFruit.radius, pos.x));
  }

  onTouchEnd(pos) {}

  destroy() {
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    audioManager.stopBgMusic();
  }
}

export default FruitGame;
