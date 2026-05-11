/**
 * 飞鸟游戏 - 鲜明活力风格（优化按钮）
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawCircle,
  Storage, shareGame
} from '../common/utils.js';

export default class FlappyGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    this.bird = { x: 0, y: 0, vy: 0 };
    this.pipes = [];
    this.score = 0;
    this.bestScore = Storage.load('flappy_best') || 0;
    this.gameOver = false;
    this.started = false;
    this.speed = 3.5;

    this.theme = Colors.themes.flappy;

    // 按钮放在标题下方，间距美观
    this.backButton = { x: designSize.width - 140, y: designSize.safeTop + 85, width: 120, height: 55 };
    this.shareButton = { x: 20, y: designSize.safeTop + 85, width: 120, height: 55 };

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    this.gameAreaTop = safeTop + 160;
    this.gameAreaBottom = height - safeBottom - 55;
    this.gameAreaHeight = this.gameAreaBottom - this.gameAreaTop;

    this.bird = {
      x: width * 0.22,
      y: this.gameAreaTop + this.gameAreaHeight / 2,
      vy: 0,
      size: 56
    };

    this.pipes = [];
    this.score = 0;
    this.gameOver = false;
    this.started = false;
    this.speed = 3.5;
    this.pipeGap = 200;
    this.pipeWidth = 95;
    this.pipeSpacing = 280;

    this.addPipe(width);
    this.render();
  }

  addPipe(x) {
    const gapCenter = this.gameAreaTop + this.gameAreaHeight * (0.3 + Math.random() * 0.4);
    const gapHalf = this.pipeGap / 2;

    this.pipes.push({
      x: x,
      top: gapCenter - gapHalf,
      bottom: gapCenter + gapHalf,
      passed: false
    });
  }

  startLoop() {
    this.timer = setInterval(() => {
      if (this.started && !this.gameOver) this.update();
      this.render();
    }, 30);
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }

  update() {
    this.bird.vy += 0.55;
    this.bird.vy = Math.min(this.bird.vy, 12);
    this.bird.y += this.bird.vy;

    if (this.bird.y < this.gameAreaTop + this.bird.size / 2 ||
        this.bird.y > this.gameAreaBottom - this.bird.size / 2) {
      this.gameOver = true;
      this.handleGameOver();
      return;
    }

    this.pipes.forEach(pipe => {
      pipe.x -= this.speed;

      if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
        pipe.passed = true;
        this.score++;
      }

      if (this.bird.x + this.bird.size / 2 > pipe.x &&
          this.bird.x - this.bird.size / 2 < pipe.x + this.pipeWidth) {
        if (this.bird.y - this.bird.size / 2 < pipe.top ||
            this.bird.y + this.bird.size / 2 > pipe.bottom) {
          this.gameOver = true;
          this.handleGameOver();
        }
      }
    });

    if (this.pipes.length > 0 && this.pipes[0].x < -this.pipeWidth) {
      this.pipes.shift();
    }

    const lastPipe = this.pipes[this.pipes.length - 1];
    if (!lastPipe || lastPipe.x < this.designSize.width - this.pipeSpacing) {
      this.addPipe(this.designSize.width);
    }
  }

  handleGameOver() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      Storage.save('flappy_best', this.bestScore);
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
  }

  onTouchStart(pos) {
    if (this.checkButton(pos, this.backButton)) {
      this.destroy();
      this.onEnd(this.score);
      return;
    }

    if (this.checkButton(pos, this.shareButton)) {
      shareGame('飞鸟', this.score);
      return;
    }

    if (!this.gameOver) {
      this.started = true;
      this.bird.vy = -8;
    }
  }

  onTouchMove(pos) {}

  onTouchEnd(pos) {}

  checkButton(pos, btn) {
    return pos.x >= btn.x && pos.x <= btn.x + btn.width &&
           pos.y >= btn.y && pos.y <= btn.y + btn.height;
  }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');

    // 标题
    drawText(this.ctx, '飞鸟', width / 2, safeTop + 50, {
      fontSize: 48,
      color: this.theme.primary,
      bold: true
    });

    // 分数
    drawText(this.ctx, `${this.score}`, width / 2 + 140, safeTop + 50, {
      fontSize: 38,
      color: Colors.textDark,
      bold: true
    });

    // 按钮 - 大字体，在标题下方
    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享 ↗', Colors.success, { fontSize: 32, radius: 16 });

    // 游戏区域
    drawRoundRect(this.ctx, 22, this.gameAreaTop, width - 44, this.gameAreaHeight, 26, '#fff', this.theme.primary, 4);

    // 管道
    this.pipes.forEach(pipe => {
      drawRoundRect(this.ctx, pipe.x, this.gameAreaTop, this.pipeWidth, pipe.top - this.gameAreaTop, 16, '#d1d5db');
      drawRoundRect(this.ctx, pipe.x, pipe.bottom, this.pipeWidth, this.gameAreaBottom - pipe.bottom, 16, '#d1d5db');
    });

    // 小鸟
    drawCircle(this.ctx, this.bird.x, this.bird.y, this.bird.size / 2, this.theme.primary);

    // 眼睛
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(this.bird.x + 14, this.bird.y - 10, 11, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#333';
    this.ctx.beginPath();
    this.ctx.arc(this.bird.x + 16, this.bird.y - 10, 5.5, 0, Math.PI * 2);
    this.ctx.fill();

    // 提示
    if (!this.started && !this.gameOver) {
      drawText(this.ctx, '点击起飞', width / 2, height - safeBottom - 42, {
        fontSize: 30,
        color: Colors.textLight
      });
    }
  }
}