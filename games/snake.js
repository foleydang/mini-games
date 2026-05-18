/**
 * 贪吃蛇 - 无限型游戏（里程碑成就系统）
 * - 单局无限游戏，吃到撞墙/自己为止
 * - 速度随分数自动递增
 * - 里程碑成就：50分(铜)、100分(银)、200分(金)、500分(白金)、1000分(钻石)
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawCircle, Storage, shareGame
} from '../common/utils.js';
import { Milestones } from '../common/config.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';
import { getBackButton, getShareButton, getSoundButton } from '../common/ui.js';

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
    this.direction = { x: 0, y: 1 };
    this.nextDirection = { x: 0, y: 1 };
    this.food = { x: 0, y: 0 };
    this.score = 0;
    this.bestScore = Storage.load('snake_best') || 0;
    this.gameOver = false;
    this.speed = this.speedStart;
    this.achievedMilestone = -1;
    this.touchStartPos = null;

    this.theme = Colors.themes.snake;
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

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

    this.direction = { x: 0, y: 1 };
    this.nextDirection = { x: 0, y: 1 };
    this.score = 0;
    this.gameOver = false;
    this.speed = this.speedStart;
    this.achievedMilestone = -1;

    this.generateFood();
    this.render();
  }

  startLoop() {
    this.timer = setInterval(() => {
      if (!this.gameOver) this.update();
      this.render();
    }, this.speed);
  }

  destroy() { if (this.timer) clearInterval(this.timer); }

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

  update() {
    this.direction = this.nextDirection;
    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y
    };

    if (head.x < 0 || head.x >= this.gridWidth ||
        head.y < 0 || head.y >= this.gridHeight ||
        this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.gameOver = true;
      playSound(SoundType.GAME_OVER);

      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        Storage.save('snake_best', this.bestScore);
      }

      const milestone = this.getCurrentMilestone();
      wx.showModal({
        title: milestone >= 0 ? `🎉 ${this.milestoneNames[milestone]}` : '游戏结束',
        content: `得分: ${this.score}${milestone >= 0 ? '\n成就: ' + this.milestoneNames[milestone] : ''}\n最高: ${this.bestScore}`,
        confirmText: '重试',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) { this.destroy(); this.initGame(); this.startLoop(); }
          else { this.destroy(); this.onEnd(this.score); }
        }
      });
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

      const targetSpeed = Math.max(this.speedMin, this.speedStart - Math.floor(this.score / this.speedDecPerScore) * 10);
      if (targetSpeed < this.speed) {
        this.speed = targetSpeed;
        clearInterval(this.timer);
        this.startLoop();
      }
    } else {
      this.snake.pop();
    }
  }

  generateFood() {
    do {
      this.food = {
        x: Math.floor(Math.random() * this.gridWidth),
        y: Math.floor(Math.random() * this.gridHeight)
      };
    } while (this.snake.some(s => s.x === this.food.x && s.y === this.food.y));
  }

  checkButton(pos, btn) { return pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height; }

  onTouchStart(pos) {
    // 先检查按钮，避免按钮点击也改变方向
    if (this.checkButton(pos, this.backButton)) { playSound(SoundType.CLICK); this.destroy(); this.onEnd(this.score); return; }
    if (this.checkButton(pos, this.shareButton)) { playSound(SoundType.SUCCESS); shareGame('贪吃蛇', this.score); return; }
    if (this.checkButton(pos, this.soundButton)) { audioManager.toggle(); this.render(); return; }
    this.touchStartPos = pos;
  }

  onTouchMove(pos) {
    if (!this.touchStartPos || this.gameOver) return;
    const dx = pos.x - this.touchStartPos.x;
    const dy = pos.y - this.touchStartPos.y;
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
      playSound(SoundType.MOVE);
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && this.direction.x !== -1) this.nextDirection = { x: 1, y: 0 };
        else if (dx < 0 && this.direction.x !== 1) this.nextDirection = { x: -1, y: 0 };
      } else {
        if (dy > 0 && this.direction.y !== -1) this.nextDirection = { x: 0, y: 1 };
        else if (dy < 0 && this.direction.y !== 1) this.nextDirection = { x: 0, y: -1 };
      }
      this.touchStartPos = null;
    }
  }

  onTouchEnd(pos) { this.touchStartPos = null; }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');

    drawText(this.ctx, '贪吃蛇', width / 2, safeTop + 50, { fontSize: 48, color: this.theme.primary, bold: true });
    const milestone = this.getCurrentMilestone();
    if (milestone >= 0) drawText(this.ctx, this.milestoneNames[milestone], width / 2 - 100, safeTop + 50, { fontSize: 22, color: Colors.warning });
    drawText(this.ctx, `${this.score}`, width / 2 + 140, safeTop + 50, { fontSize: 36, color: Colors.textDark, bold: true });
    const next = this.getNextMilestone();
    if (next) drawText(this.ctx, `→${next.target}`, width / 2 + 210, safeTop + 50, { fontSize: 20, color: Colors.textLight });

    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享', Colors.success, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.soundButton.x, this.soundButton.y, this.soundButton.width, this.soundButton.height, audioManager.enabled ? '🔊' : '🔇', Colors.info, { fontSize: 32, radius: 16 });

    const gridW = this.gridWidth * this.cellSize;
    const gridH = this.gridHeight * this.cellSize;
    drawRoundRect(this.ctx, this.gridStartX - 12, this.gridStartY - 12, gridW + 24, gridH + 24, 22, '#fff', this.theme.primary, 4);

    // 网格背景线
    this.ctx.strokeStyle = this.theme.pattern;
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridWidth; i++) {
      const x = this.gridStartX + i * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.gridStartY);
      this.ctx.lineTo(x, this.gridStartY + gridH);
      this.ctx.stroke();
    }
    for (let i = 0; i <= this.gridHeight; i++) {
      const y = this.gridStartY + i * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.gridStartX, y);
      this.ctx.moveTo(this.gridStartX + gridW, y);
      this.ctx.stroke();
    }

    // 蛇身 - 渐变色彩效果
    this.snake.forEach((segment, i) => {
      const cx = this.gridStartX + segment.x * this.cellSize + this.cellSize / 2;
      const cy = this.gridStartY + segment.y * this.cellSize + this.cellSize / 2;
      const radius = this.cellSize / 2 - 6;
      // 从头到尾颜色渐变
      const ratio = i / Math.max(this.snake.length - 1, 1);
      const color = i === 0 ? this.theme.primary : this.theme.secondary;
      drawCircle(this.ctx, cx, cy, radius, color);
      if (i === 0) {
        // 蛇头眼睛
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(cx - 8, cy - 6, 7, 0, Math.PI * 2);
        this.ctx.arc(cx + 8, cy - 6, 7, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(cx - 8, cy - 6, 3.5, 0, Math.PI * 2);
        this.ctx.arc(cx + 8, cy - 6, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    // 食物 - 带光晕
    const foodCx = this.gridStartX + this.food.x * this.cellSize + this.cellSize / 2;
    const foodCy = this.gridStartY + this.food.y * this.cellSize + this.cellSize / 2;
    const foodRadius = this.cellSize / 2 - 10;
    // 光晕
    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    this.ctx.beginPath();
    this.ctx.arc(foodCx, foodCy, foodRadius + 6, 0, Math.PI * 2);
    this.ctx.fill();
    drawCircle(this.ctx, foodCx, foodCy, foodRadius, Colors.food);
    // 高光
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.beginPath();
    this.ctx.arc(foodCx - 3, foodCy - 3, foodRadius * 0.35, 0, Math.PI * 2);
    this.ctx.fill();

    let hint = '滑动控制方向 ';
    for (let i = 0; i < this.targets.length; i++) {
      hint += this.score >= this.targets[i] ? '✓' : ` →${this.targets[i]}`;
      if (this.score < this.targets[i]) break;
    }
    drawText(this.ctx, hint, width / 2, height - safeBottom - 38, { fontSize: 22, color: Colors.textMuted });
  }
}
