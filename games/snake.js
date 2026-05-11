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

    // 无限游戏配置
    const config = Milestones.snake;
    this.targets = config.targets;       // [50, 100, 200, 500, 1000]
    this.milestoneNames = config.names;  // ['铜牌', '银牌', '金牌', '白金', '钻石']
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
    this.achievedMilestone = -1;  // 已达成的里程碑索引
    this.touchStartPos = null;

    this.theme = Colors.themes.snake;
    this.backButton = { x: 20, y: 120, width: 100, height: 42 }; // y在render中动态计算;
    this.shareButton = { x: 130, y: 120, width: 100, height: 42 };
    this.soundButton = { x: designSize.width - 120, y: 120, width: 100, height: 42 };

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
    this.gridStartY = safeTop + 160;

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

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // 获取当前里程碑
  getCurrentMilestone() {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      if (this.score >= this.targets[i]) return i;
    }
    return -1;
  }

  // 获取下一个里程碑目标
  getNextMilestone() {
    const current = this.getCurrentMilestone();
    if (current < this.targets.length - 1) {
      return { target: this.targets[current + 1], name: this.milestoneNames[current + 1] };
    }
    return null;  // 已达最高
  }

  update() {
    this.direction = this.nextDirection;
    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y
    };

    // 碰撞检测
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
      const milestoneText = milestone >= 0 ? `\n成就: ${this.milestoneNames[milestone]}` : '';

      wx.showModal({
        title: milestone >= 0 ? `🎉 ${this.milestoneNames[milestone]}` : '游戏结束',
        content: `得分: ${this.score}${milestoneText}\n最高: ${this.bestScore}`,
        confirmText: '重试',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            this.destroy();
            this.initGame();
            this.startLoop();
          } else {
            this.destroy();
            this.onEnd(this.score);
          }
        }
      });
      return;
    }

    this.snake.unshift(head);

    // 吃食物
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      playSound(SoundType.SUCCESS);
      this.generateFood();

      // 检查里程碑达成
      const newMilestone = this.getCurrentMilestone();
      if (newMilestone > this.achievedMilestone) {
        this.achievedMilestone = newMilestone;
        playSound(SoundType.LEVEL_UP);
      }

      // 自动加速
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

  checkButton(pos, btn) {
    return pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height;
  }

  onTouchStart(pos) {
    if (this.checkButton(pos, this.backButton)) {
      playSound(SoundType.CLICK);
      this.destroy();
      this.onEnd(this.score);
      return;
    }
    if (this.checkButton(pos, this.shareButton)) {
      playSound(SoundType.SUCCESS);
      shareGame('贪吃蛇', this.score);
      return;
    }
    if (this.checkButton(pos, this.soundButton)) {
      audioManager.toggle();
      this.render();
      return;
    }
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

  onTouchEnd(pos) {
    this.touchStartPos = null;
  }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');
    // 底部按钮在后面统一绘制

    // 标题
    drawText(this.ctx, '贪吃蛇', width / 2, safeTop + 50, { fontSize: 48, color: this.theme.primary, bold: true });

    // 当前成就显示
    const milestone = this.getCurrentMilestone();
    if (milestone >= 0) {
      drawText(this.ctx, this.milestoneNames[milestone], width / 2 - 100, safeTop + 50, { fontSize: 22, color: Colors.warning });
    }

    // 分数 + 下一个目标
    drawText(this.ctx, `${this.score}`, width / 2 + 140, safeTop + 50, { fontSize: 36, color: Colors.textDark, bold: true });
    const next = this.getNextMilestone();
    if (next) {
      drawText(this.ctx, `→${next.target}`, width / 2 + 210, safeTop + 50, { fontSize: 20, color: Colors.textLight });
    }

    // 按钮
    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享 ↗', Colors.success, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.soundButton.x, this.soundButton.y, this.soundButton.width, this.soundButton.height, audioManager.enabled ? '🔊' : '🔇', Colors.info, { fontSize: 32, radius: 16 });

    // 游戏区域
    const gridW = this.gridWidth * this.cellSize;
    const gridH = this.gridHeight * this.cellSize;
    drawRoundRect(this.ctx, this.gridStartX - 12, this.gridStartY - 12, gridW + 24, gridH + 24, 22, '#fff', this.theme.primary, 4);

    // 蛇身
    this.snake.forEach((segment, i) => {
      const cx = this.gridStartX + segment.x * this.cellSize + this.cellSize / 2;
      const cy = this.gridStartY + segment.y * this.cellSize + this.cellSize / 2;
      const radius = this.cellSize / 2 - 6;
      const color = i === 0 ? this.theme.primary : this.theme.secondary;
      drawCircle(this.ctx, cx, cy, radius, color);
      if (i === 0) {
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

    // 食物
    const foodCx = this.gridStartX + this.food.x * this.cellSize + this.cellSize / 2;
    const foodCy = this.gridStartY + this.food.y * this.cellSize + this.cellSize / 2;
    drawCircle(this.ctx, foodCx, foodCy, this.cellSize / 2 - 10, Colors.food);

    // 底部里程碑进度提示
    let milestoneText = '滑动控制方向 ';
    for (let i = 0; i < this.targets.length; i++) {
      if (this.score >= this.targets[i]) {
        milestoneText += '✓';
      } else {
        milestoneText += ` →${this.targets[i]}`;
        break;
      }
    }
    drawText(this.ctx, milestoneText, width / 2, height - safeBottom - 38, { fontSize: 22, color: Colors.textMuted });
  }
}
