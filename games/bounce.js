/**
 * 弹球 - 鲜明活力风格（大尺寸优化版）
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawCircle,
  Storage, shareGame
} from '../common/utils.js';

export default class BounceGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    this.ball = { x: 0, y: 0, vx: 0, vy: 0 };
    this.platforms = [];
    this.score = 0;
    this.bestScore = Storage.load('bounce_best') || 0;
    this.gameOver = false;
    this.scrollSpeed = 3; // 加快速度

    this.theme = Colors.themes.bounce;

    // 按钮放在标题下方，间距美观
    this.backButton = { x: designSize.width - 140, y: designSize.safeTop + 85, width: 120, height: 55 };
    this.shareButton = { x: 20, y: designSize.safeTop + 85, width: 120, height: 55 };

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    this.gameAreaTop = safeTop + 160;
    this.gameAreaBottom = height - safeBottom - 60;
    this.gameAreaHeight = this.gameAreaBottom - this.gameAreaTop;

    // 小球和平台在游戏区域中间
    const centerOffset = this.gameAreaHeight * 0.3;

    this.ball = {
      x: width / 2,
      y: this.gameAreaTop + centerOffset + 80,
      vx: 0,
      vy: 0,
      size: 30  // 增大球
    };

    this.score = 0;
    this.gameOver = false;
    this.scrollSpeed = 3;

    this.platforms = [];
    const platformColors = [Colors.danger, Colors.warning, Colors.success, Colors.primary, Colors.info];

    // 平台从中间往下分布，间距更密
    const platformSpacing = 80;
    for (let i = 0; i < 7; i++) {
      this.addPlatform(this.gameAreaTop + centerOffset + 150 + i * platformSpacing, platformColors[i % platformColors.length], i === 0);
    }

    this.render();
  }

  addPlatform(y, color, isFirst = false) {
    const { width } = this.designSize;
    const platformWidth = isFirst ? width * 0.7 : 110 + Math.random() * 80;

    this.platforms.push({
      x: Math.random() * (width - platformWidth),
      y: y,
      width: platformWidth,
      height: 22,  // 更厚的平台
      color: color
    });
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
    const { width } = this.designSize;

    this.ball.vy += 0.45;
    this.ball.y += this.ball.vy;
    this.ball.x += this.ball.vx;

    if (this.ball.x <= this.ball.size) {
      this.ball.x = this.ball.size;
      this.ball.vx *= -0.75;
    }
    if (this.ball.x >= width - this.ball.size) {
      this.ball.x = width - this.ball.size;
      this.ball.vx *= -0.75;
    }

    this.platforms.forEach(platform => {
      if (this.ball.vy > 0 &&
          this.ball.y + this.ball.size >= platform.y &&
          this.ball.y + this.ball.size <= platform.y + platform.height + 10 &&
          this.ball.x >= platform.x &&
          this.ball.x <= platform.x + platform.width) {
        this.ball.vy = -12;
        this.ball.vx += (Math.random() - 0.5) * 4;
        this.score += 10;
      }
    });

    this.platforms.forEach(platform => {
      platform.y -= this.scrollSpeed;
    });

    if (this.platforms.length > 0 && this.platforms[0].y < this.gameAreaTop) {
      this.platforms.shift();
      const lastY = this.platforms[this.platforms.length - 1]?.y || this.gameAreaTop + this.gameAreaHeight * 0.3 + 150;
      const colors = [Colors.danger, Colors.warning, Colors.success, Colors.primary, Colors.info];
      this.addPlatform(lastY + 80, colors[Math.floor(Math.random() * colors.length)]);
    }

    if (this.ball.y > this.gameAreaTop + this.gameAreaHeight * 0.45) {
      this.ball.y -= this.scrollSpeed;
    }

    // 最上面碰到不死，反弹回去
    if (this.ball.y < this.gameAreaTop + this.ball.size) {
      this.ball.y = this.gameAreaTop + this.ball.size;
      this.ball.vy = Math.abs(this.ball.vy) * 0.8;
    }

    // 最下面碰到才死
    if (this.ball.y > this.gameAreaBottom) {
      this.gameOver = true;
      this.handleGameOver();
    }

    // 加速更快
    if (this.score % 100 === 0 && this.score > 0) {
      this.scrollSpeed = Math.min(5.5, this.scrollSpeed + 0.35);
    }
  }

  handleGameOver() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      Storage.save('bounce_best', this.bestScore);
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
      shareGame('弹球', this.score);
      return;
    }

    const { width } = this.designSize;
    if (pos.x < width / 2) {
      this.ball.vx = -8;
    } else {
      this.ball.vx = 8;
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

    // 标题区域 - 大字体
    drawText(this.ctx, '🌟 弹球', width / 2, safeTop + 55, {
      fontSize: 52,
      color: this.theme.primary,
      bold: true
    });

    drawText(this.ctx, `${this.score}`, width - 130, safeTop + 55, {
      fontSize: 42,
      color: Colors.textDark,
      bold: true,
      align: 'right'
    });

    // 按钮 - 大字体，在标题下方
    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享 ↗', Colors.success, { fontSize: 32, radius: 16 });

    // 游戏区域
    drawRoundRect(this.ctx, 22, this.gameAreaTop, width - 44, this.gameAreaHeight, 26, '#fff', this.theme.primary, 4);

    // 平台 - 更大更醒目
    this.platforms.forEach(platform => {
      drawRoundRect(this.ctx, platform.x, platform.y, platform.width, platform.height, 10, platform.color);
    });

    // 球 - 更大
    drawCircle(this.ctx, this.ball.x, this.ball.y, this.ball.size, this.theme.primary);

    // 提示 - 底部
    drawText(this.ctx, '点击左/右控制弹跳', width / 2, height - safeBottom - 40, {
      fontSize: 26,
      color: Colors.textMuted
    });
  }
}