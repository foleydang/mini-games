/**
 * 贪吃蛇 - 无限型游戏（里程碑成就系统）
 * - 单局无限游戏，吃到撞墙/自己为止
 * - 速度随分数自动递增
 * - 平滑插值移动 + 连体蛇身 + 点击/滑动双控制 + 转向缓冲
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawCircle, Storage, shareGame
} from '../common/utils.js';
import { Milestones } from '../common/config.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';
import { getBackButton, getShareButton, getSoundButton } from '../common/ui.js';
import LevelResult from '../common/level-result.js';

export default class SnakeGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    const config = Milestones.snake;
    this.targets = config.targets;
    this.milestoneNames = config.names;
    this.speedStart = config.speedStart;
    this.speedMin = config.speedMin;
    this.speedDecPerScore = config.speedDecPerScore;

    this.gridWidth = 10;
    this.gridHeight = 14;
    this.cellSize = 32;
    this.snake = [];
    this.prevSnake = [];
    this.direction = { x: 0, y: 1 };
    this.dirQueue = [];
    this.food = { x: 0, y: 0 };
    this.score = 0;
    this.bestScore = Storage.load('snake_best') || 0;
    this.gameOver = false;
    this.result = null;
    this.speed = this.speedStart;
    this.stepDur = this.speedStart;
    this.acc = 0;
    this.moveProgress = 0;
    this.lastT = null;
    this.achievedMilestone = -1;

    // 触摸控制
    this.pointerStart = null;
    this.pointerMoved = false;

    // 渲染循环控制
    this.ended = false;
    this.rafId = null;
    this.animTime = 0;

    this.theme = Colors.themes.snake;
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.animate = this.animate.bind(this);
    this.initGame();
    this.startLoop();
  }

  initGame() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    const headerHeight = 80;
    const footerHeight = 60;
    const availableHeight = height - safeTop - safeBottom - headerHeight - footerHeight;
    const availableWidth = width - 50;
    this.cellSize = Math.min(availableWidth / this.gridWidth, availableHeight / this.gridHeight, 65);
    this.gridStartX = (width - this.gridWidth * this.cellSize) / 2;
    this.gridStartY = safeTop + 320;

    const centerX = Math.floor(this.gridWidth / 2);
    const centerY = Math.floor(this.gridHeight / 2);
    this.snake = [
      { x: centerX, y: centerY },
      { x: centerX, y: centerY - 1 },
      { x: centerX, y: centerY - 2 }
    ];
    this.prevSnake = this.snake.map(s => ({ x: s.x, y: s.y }));

    this.direction = { x: 0, y: 1 };
    this.dirQueue = [];
    this.score = 0;
    this.gameOver = false;
    this.result = null;
    this.speed = this.speedStart;
    this.stepDur = this.speedStart;
    this.acc = 0;
    this.moveProgress = 0;
    this.lastT = null;
    this.achievedMilestone = -1;

    this.generateFood();
  }

  startLoop() {
    this.ended = false;
    this.lastT = null;
    this.rafId = requestAnimationFrame(this.animate);
  }

  animate(t) {
    if (this.ended) return;
    if (this.lastT == null) this.lastT = t;
    const dt = Math.min(t - this.lastT, 100);
    this.lastT = t;
    this.animTime += dt;

    if (!this.gameOver) {
      this.acc += dt;
      let guard = 0;
      while (this.acc >= this.stepDur && !this.gameOver && guard++ < 5) {
        this.acc -= this.stepDur;
        this.step();
      }
      this.moveProgress = this.gameOver ? 1 : Math.min(1, this.acc / this.stepDur);
    }

    this.render();
    this.rafId = requestAnimationFrame(this.animate);
  }

  destroy() {
    this.ended = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  getCurrentMilestone() {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      if (this.score >= this.targets[i]) return i;
    }
    return -1;
  }

  getNextMilestone() {
    const current = this.getCurrentMilestone();
    if (current < this.targets.length - 1) {
      return { target: this.targets[current + 1], name: this.milestoneNames[current + 1] };
    }
    return null;
  }

  // 一个逻辑步:应用缓冲转向并前进一格
  step() {
    if (this.dirQueue.length) this.direction = this.dirQueue.shift();

    this.prevSnake = this.snake.map(s => ({ x: s.x, y: s.y }));
    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y
    };

    if (head.x < 0 || head.x >= this.gridWidth ||
        head.y < 0 || head.y >= this.gridHeight ||
        this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.finish();
      return;
    }

    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      playSound(SoundType.SUCCESS);
      this.generateFood();

      const newMilestone = this.getCurrentMilestone();
      if (newMilestone > this.achievedMilestone) {
        this.achievedMilestone = newMilestone;
        playSound(SoundType.LEVEL_UP);
      }

      // 速度递增(步长缩短)
      this.stepDur = Math.max(this.speedMin, this.speedStart - Math.floor(this.score / this.speedDecPerScore) * 10);
    } else {
      this.snake.pop();
    }
  }

  finish() {
    this.gameOver = true;
    playSound(SoundType.GAME_OVER);
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      Storage.save('snake_best', this.bestScore);
    }
    const milestone = this.getCurrentMilestone();
    const levelName = milestone >= 0
      ? `${this.milestoneNames[milestone]} · 最高 ${this.bestScore}`
      : `最高分 ${this.bestScore}`;
    this.result = new LevelResult(this.designSize, {
      win: false,
      score: this.score,
      scoreLabel: '得分',
      levelName,
      hasNext: false,
      primaryColor: this.theme.primary
    });
  }

  generateFood() {
    do {
      this.food = {
        x: Math.floor(Math.random() * this.gridWidth),
        y: Math.floor(Math.random() * this.gridHeight)
      };
    } while (this.snake.some(s => s.x === this.food.x && s.y === this.food.y));
  }

  // 缓冲一个转向(拒绝反向与重复,队列上限 2)
  queueTurn(nx, ny) {
    const last = this.dirQueue.length ? this.dirQueue[this.dirQueue.length - 1] : this.direction;
    if (nx === -last.x && ny === -last.y) return false; // 不能反向
    if (nx === last.x && ny === last.y) return false;    // 与当前相同
    if (this.dirQueue.length >= 2) return false;
    this.dirQueue.push({ x: nx, y: ny });
    playSound(SoundType.MOVE);
    return true;
  }

  // 朝目标偏移转向:优先主轴,主轴无效(反向/相同)则尝试次轴
  turnToward(dx, dy) {
    const horiz = [Math.sign(dx), 0];
    const vert = [0, Math.sign(dy)];
    const first = Math.abs(dx) >= Math.abs(dy) ? horiz : vert;
    const second = first === horiz ? vert : horiz;
    if (first[0] === 0 && first[1] === 0) return;
    if (this.queueTurn(first[0], first[1])) return;
    if (second[0] !== 0 || second[1] !== 0) this.queueTurn(second[0], second[1]);
  }

  checkButton(pos, btn) { return pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height; }

  onTouchStart(pos) {
    // 结算遮罩优先
    if (this.gameOver && this.result) {
      const action = this.result.onTouchStart(pos);
      if (action === 'retry' || action === 'replay') { this.initGame(); this.startLoop(); }
      else if (action === 'back') { this.destroy(); this.onEnd(this.score); }
      return;
    }
    // 按钮
    if (this.checkButton(pos, this.backButton)) { playSound(SoundType.CLICK); this.destroy(); this.onEnd(this.score); return; }
    if (this.checkButton(pos, this.shareButton)) { playSound(SoundType.SUCCESS); shareGame('贪吃蛇', this.score); return; }
    if (this.checkButton(pos, this.soundButton)) { audioManager.toggle(); return; }

    this.pointerStart = pos;
    this.pointerMoved = false;
  }

  onTouchMove(pos) {
    if (!this.pointerStart || this.gameOver) return;
    const dx = pos.x - this.pointerStart.x;
    const dy = pos.y - this.pointerStart.y;
    // 滑动阈值:达到即按滑动方向转向(一次滑动一次转向)
    if (Math.abs(dx) > 26 || Math.abs(dy) > 26) {
      if (Math.abs(dx) > Math.abs(dy)) this.queueTurn(Math.sign(dx), 0);
      else this.queueTurn(0, Math.sign(dy));
      this.pointerMoved = true;
      this.pointerStart = null;
    }
  }

  onTouchEnd(pos) {
    if (this.gameOver) { this.pointerStart = null; return; }
    // 未构成滑动 → 视为点击:朝点击点相对蛇头方向转向
    if (this.pointerStart && !this.pointerMoved) {
      // 忽略网格区域外的点击(顶部标题/按钮区、底部提示区)
      const gridBottom = this.gridStartY + this.gridHeight * this.cellSize;
      if (pos.y >= this.gridStartY - 20 && pos.y <= gridBottom + 20) {
        const headCx = this.gridStartX + this.snake[0].x * this.cellSize + this.cellSize / 2;
        const headCy = this.gridStartY + this.snake[0].y * this.cellSize + this.cellSize / 2;
        this.turnToward(pos.x - headCx, pos.y - headCy);
      }
    }
    this.pointerStart = null;
    this.pointerMoved = false;
  }

  // 取第 i 段插值后的格坐标中心(平滑移动)
  segCenter(i) {
    const cur = this.snake[i];
    const prev = (this.prevSnake && this.prevSnake[i]) ? this.prevSnake[i] : cur;
    const p = this.moveProgress;
    const gx = prev.x + (cur.x - prev.x) * p;
    const gy = prev.y + (cur.y - prev.y) * p;
    return {
      x: this.gridStartX + gx * this.cellSize + this.cellSize / 2,
      y: this.gridStartY + gy * this.cellSize + this.cellSize / 2
    };
  }

  render() {
    const ctx = this.ctx;
    const { width, height, safeTop, safeBottom } = this.designSize;
    drawGradientBg(ctx, width, height, this.theme.gradient[0], this.theme.gradient[1], this.theme.primary + '11');

    drawText(ctx, '贪吃蛇', width / 2, safeTop + 50, { fontSize: 48, color: this.theme.primary, bold: true });
    const milestone = this.getCurrentMilestone();
    if (milestone >= 0) drawText(ctx, this.milestoneNames[milestone], width / 2 - 100, safeTop + 50, { fontSize: 22, color: Colors.warning });
    drawText(ctx, `${this.score}`, width / 2 + 140, safeTop + 50, { fontSize: 36, color: Colors.textDark, bold: true });
    const next = this.getNextMilestone();
    if (next) drawText(ctx, `→${next.target}`, width / 2 + 210, safeTop + 50, { fontSize: 20, color: Colors.textLight });

    drawButton(ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享', Colors.success, { fontSize: 32, radius: 16 });
    drawButton(ctx, this.soundButton.x, this.soundButton.y, this.soundButton.width, this.soundButton.height, audioManager.enabled ? '🔊' : '🔇', Colors.info, { fontSize: 32, radius: 16 });

    const gridW = this.gridWidth * this.cellSize;
    const gridH = this.gridHeight * this.cellSize;
    drawRoundRect(ctx, this.gridStartX - 12, this.gridStartY - 12, gridW + 24, gridH + 24, 22, '#fff', this.theme.primary, 4);

    // 网格背景线(裁剪到棋盘内)
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.gridStartX, this.gridStartY, gridW, gridH);
    ctx.clip();
    ctx.strokeStyle = this.theme.pattern;
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridWidth; i++) {
      const x = this.gridStartX + i * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, this.gridStartY);
      ctx.lineTo(x, this.gridStartY + gridH);
      ctx.stroke();
    }
    for (let i = 0; i <= this.gridHeight; i++) {
      const y = this.gridStartY + i * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.gridStartX, y);
      ctx.lineTo(this.gridStartX + gridW, y);
      ctx.stroke();
    }
    ctx.restore();

    // 食物(带光晕 + 轻微脉动)
    const foodCx = this.gridStartX + this.food.x * this.cellSize + this.cellSize / 2;
    const foodCy = this.gridStartY + this.food.y * this.cellSize + this.cellSize / 2;
    const pulse = 1 + 0.08 * Math.sin(this.animTime / 220);
    const foodRadius = (this.cellSize / 2 - 10) * pulse;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.beginPath();
    ctx.arc(foodCx, foodCy, foodRadius + 6, 0, Math.PI * 2);
    ctx.fill();
    drawCircle(ctx, foodCx, foodCy, foodRadius, Colors.food);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(foodCx - 3, foodCy - 3, foodRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // 蛇身:连体圆角线条
    this.drawSnake(ctx);

    // 底部提示
    drawText(ctx, '点击或滑动改变方向', width / 2, height - safeBottom - 38, { fontSize: 22, color: Colors.textMuted });

    // 结算遮罩
    if (this.gameOver && this.result) this.result.draw(ctx);
  }

  drawSnake(ctx) {
    const pts = this.snake.map((_, i) => this.segCenter(i));
    if (pts.length === 0) return;

    const bodyW = this.cellSize * 0.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (pts.length > 1) {
      // 外描边
      ctx.strokeStyle = this.theme.primary;
      ctx.lineWidth = bodyW + 6;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();

      // 内体
      ctx.strokeStyle = this.theme.secondary;
      ctx.lineWidth = bodyW;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }

    // 蛇头
    const head = pts[0];
    const headR = bodyW / 2 + 2;
    drawCircle(ctx, head.x, head.y, headR, this.theme.primary);

    // 眼睛(朝当前前进方向偏移)
    const dir = this.dirQueue.length ? this.dirQueue[0] : this.direction;
    const perpX = -dir.y, perpY = dir.x;
    const eyeFwd = headR * 0.35;
    const eyeSide = headR * 0.42;
    const eyeR = Math.max(3, headR * 0.26);
    for (const s of [1, -1]) {
      const ex = head.x + dir.x * eyeFwd + perpX * eyeSide * s;
      const ey = head.y + dir.y * eyeFwd + perpY * eyeSide * s;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(ex + dir.x * eyeR * 0.35, ey + dir.y * eyeR * 0.35, eyeR * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
