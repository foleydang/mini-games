/**
 * 贪吃蛇 - 鲜明活力风格（优化按钮）
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawCircle,
  Storage, shareGame
} from '../common/utils.js';

export default class SnakeGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

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
    this.speed = 220;

    this.touchStartPos = null;
    this.theme = Colors.themes.snake;

    // 按钮放在标题下方，间距美观
    this.backButton = { x: designSize.width - 140, y: designSize.safeTop + 85, width: 120, height: 55 };
    this.shareButton = { x: 20, y: designSize.safeTop + 85, width: 120, height: 55 };

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
    this.speed = 220;

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

      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        Storage.save('snake_best', this.bestScore);
      }

      wx.showModal({
        title: '游戏结束',
        content: `得分: ${this.score}\n最高: ${this.bestScore}`,
        confirmText: '重试',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) this.initGame();
          else {
            this.destroy();
            this.onEnd(this.score);
          }
        }
      });
      return;
    }

    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.generateFood();

      if (this.score % 50 === 0 && this.speed > 60) {
        this.speed -= 8;
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

  onTouchStart(pos) {
    if (this.checkButton(pos, this.backButton)) {
      this.destroy();
      this.onEnd(this.score);
      return;
    }

    if (this.checkButton(pos, this.shareButton)) {
      shareGame('贪吃蛇', this.score);
      return;
    }

    this.touchStartPos = pos;
  }

  onTouchMove(pos) {
    if (!this.touchStartPos || this.gameOver) return;

    const dx = pos.x - this.touchStartPos.x;
    const dy = pos.y - this.touchStartPos.y;

    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
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

  checkButton(pos, btn) {
    return pos.x >= btn.x && pos.x <= btn.x + btn.width &&
           pos.y >= btn.y && pos.y <= btn.y + btn.height;
  }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');

    // 标题
    drawText(this.ctx, '贪吃蛇', width / 2, safeTop + 50, {
      fontSize: 48,
      color: this.theme.primary,
      bold: true
    });

    // 分数 - 标题旁边
    drawText(this.ctx, `${this.score}`, width / 2 + 100, safeTop + 50, {
      fontSize: 36,
      color: Colors.textDark,
      bold: true
    });

    // 按钮 - 大字体，在标题下方
    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享 ↗', Colors.success, { fontSize: 32, radius: 16 });

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

      // 蛇头眼睛
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

    // 底部提示
    drawText(this.ctx, '滑动控制方向', width / 2, height - safeBottom - 38, {
      fontSize: 24,
      color: Colors.textMuted
    });
  }
}