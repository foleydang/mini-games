/**
 * 打砖块 - 鲜明活力风格（优化按钮）
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawCircle,
  Storage, shareGame
} from '../common/utils.js';

export default class BreakoutGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    this.ball = { x: 0, y: 0, vx: 0, vy: 0 };
    this.paddle = { x: 0, width: 130, height: 18 };
    this.bricks = [];
    this.score = 0;
    this.bestScore = Storage.load('breakout_best') || 0;
    this.gameOver = false;

    this.theme = Colors.themes.breakout;

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

    this.ball = {
      x: width / 2,
      y: this.gameAreaBottom - 80,
      vx: 5,
      vy: -6.5,
      size: 20
    };

    this.paddle = {
      x: width / 2 - 65,
      y: this.gameAreaBottom - 45,
      width: 130,
      height: 18
    };

    const brickRows = 5;
    const brickCols = 6;
    const brickWidth = (width - 65) / brickCols;
    const brickHeight = 45;
    const brickStartY = this.gameAreaTop + 35;

    this.bricks = [];
    const brickColors = [Colors.danger, Colors.warning, Colors.success, Colors.primary, Colors.info];

    for (let row = 0; row < brickRows; row++) {
      for (let col = 0; col < brickCols; col++) {
        this.bricks.push({
          x: 32 + col * brickWidth,
          y: brickStartY + row * (brickHeight + 12),
          width: brickWidth - 8,
          height: brickHeight,
          color: brickColors[row % brickColors.length],
          alive: true
        });
      }
    }

    this.score = 0;
    this.gameOver = false;
    this.render();
  }

  startLoop() {
    this.timer = setInterval(() => {
      if (!this.gameOver) this.update();
      this.render();
    }, 28);
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }

  update() {
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    const { width } = this.designSize;

    if (this.ball.x <= this.ball.size || this.ball.x >= width - this.ball.size) {
      this.ball.vx *= -1;
    }
    if (this.ball.y <= this.gameAreaTop + this.ball.size) {
      this.ball.vy *= -1;
    }

    if (this.ball.y + this.ball.size >= this.paddle.y &&
        this.ball.x >= this.paddle.x &&
        this.ball.x <= this.paddle.x + this.paddle.width) {
      this.ball.vy *= -1;
      const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
      this.ball.vx = (hitPos - 0.5) * 10;
    }

    this.bricks.forEach(brick => {
      if (!brick.alive) return;

      if (this.ball.x >= brick.x && this.ball.x <= brick.x + brick.width &&
          this.ball.y >= brick.y && this.ball.y <= brick.y + brick.height) {
        brick.alive = false;
        this.ball.vy *= -1;
        this.score += 10;
      }
    });

    if (this.ball.y > this.gameAreaBottom) {
      this.gameOver = true;
      this.handleGameOver(false);
    }

    if (this.bricks.every(b => !b.alive)) {
      this.gameOver = true;
      this.handleGameOver(true);
    }
  }

  handleGameOver(won) {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      Storage.save('breakout_best', this.bestScore);
    }

    wx.showModal({
      title: won ? '🎉 恭喜通关' : '游戏结束',
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
      shareGame('打砖块', this.score);
      return;
    }

    this.movePaddle(pos);
  }

  onTouchMove(pos) {
    if (!this.gameOver) {
      this.movePaddle(pos);
    }
  }

  onTouchEnd(pos) {}

  movePaddle(pos) {
    const { width } = this.designSize;
    this.paddle.x = Math.max(0, Math.min(width - this.paddle.width, pos.x - this.paddle.width / 2));
  }

  checkButton(pos, btn) {
    return pos.x >= btn.x && pos.x <= btn.x + btn.width &&
           pos.y >= btn.y && pos.y <= btn.y + btn.height;
  }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');

    // 标题
    drawText(this.ctx, '打砖块', width / 2, safeTop + 50, {
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

    // 砖块
    this.bricks.forEach(brick => {
      if (brick.alive) {
        drawRoundRect(this.ctx, brick.x, brick.y, brick.width, brick.height, 12, brick.color);
      }
    });

    // 挡板
    drawRoundRect(this.ctx, this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 9, this.theme.primary);

    // 球
    drawCircle(this.ctx, this.ball.x, this.ball.y, this.ball.size, Colors.textDark);

    // 底部提示
    drawText(this.ctx, '滑动移动挡板', width / 2, height - safeBottom - 38, {
      fontSize: 24,
      color: Colors.textMuted
    });
  }
}