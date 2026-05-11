/**
 * 弹球 - 音效 + 多难度关卡
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawCircle, Storage, shareGame
} from '../common/utils.js';
import { Levels } from '../common/config.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';

export default class BounceGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    this.level = Storage.load('bounce_level') || 0;
    this.ball = { x: 0, y: 0, vx: 0, vy: 0 };
    this.platforms = [];
    this.score = 0;
    this.bestScore = Storage.load('bounce_best') || 0;
    this.gameOver = false;
    this.scrollSpeed = 3;
    this.platformWidth = 110;
    this.levelName = '';

    this.theme = Colors.themes.bounce;

    this.backButton = { x: designSize.width - 140, y: designSize.safeTop + 85, width: 120, height: 55 };
    this.shareButton = { x: 20, y: designSize.safeTop + 85, width: 120, height: 55 };
    this.soundButton = { x: designSize.width / 2 - 60, y: designSize.safeTop + 85, width: 120, height: 55 };

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const levelConfig = Levels.bounce[this.level] || Levels.bounce[1];
    this.scrollSpeed = levelConfig.speed;
    this.platformWidth = levelConfig.platformWidth;
    this.levelName = levelConfig.name;

    const { width, height, safeTop, safeBottom } = this.designSize;

    this.gameAreaTop = safeTop + 160;
    this.gameAreaBottom = height - safeBottom - 60;
    this.gameAreaHeight = this.gameAreaBottom - this.gameAreaTop;

    const centerOffset = this.gameAreaHeight * 0.3;

    this.ball = {
      x: width / 2,
      y: this.gameAreaTop + centerOffset + 80,
      vx: 0,
      vy: 0,
      size: 30
    };

    this.score = 0;
    this.gameOver = false;

    this.platforms = [];
    const platformColors = [Colors.danger, Colors.warning, Colors.success, Colors.primary, Colors.info];

    const platformSpacing = 80;
    for (let i = 0; i < 7; i++) {
      this.addPlatform(this.gameAreaTop + centerOffset + 150 + i * platformSpacing, platformColors[i % platformColors.length], i === 0);
    }

    this.render();
  }

  addPlatform(y, color, isFirst = false) {
    const { width } = this.designSize;
    const platformWidth = isFirst ? width * 0.7 : this.platformWidth + Math.random() * 40;

    this.platforms.push({
      x: Math.random() * (width - platformWidth),
      y: y,
      width: platformWidth,
      height: 22,
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
        playSound(SoundType.BOUNCE);
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

    if (this.ball.y < this.gameAreaTop + this.ball.size) {
      this.ball.y = this.gameAreaTop + this.ball.size;
      this.ball.vy = Math.abs(this.ball.vy) * 0.8;
    }

    if (this.ball.y > this.gameAreaBottom) {
      this.gameOver = true;
      playSound(SoundType.GAME_OVER);
      this.handleGameOver();
    }

    if (this.score % 100 === 0 && this.score > 0) {
      this.scrollSpeed = Math.min(5.5, this.scrollSpeed + 0.25);
    }
  }

  handleGameOver() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      Storage.save('bounce_best', this.bestScore);
    }

    const hasNext = this.level + 1 < Levels.bounce.length;
    const target = 50 + this.level * 50;
    const reached = this.score >= target;

    wx.showModal({
      title: reached ? '🎉 达成目标！' : '游戏结束',
      content: `关卡: ${this.levelName}\n得分: ${this.score}\n目标: ${target}\n最高: ${this.bestScore}`,
      confirmText: hasNext && reached ? '下一关' : '重试',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          if (hasNext && reached) {
            this.level++;
            Storage.save('bounce_level', this.level);
          }
          this.destroy();
          this.initGame();
          this.startLoop();
        } else {
          this.destroy();
          this.onEnd(this.score);
        }
      }
    });
  }

  checkButton(pos, btn) {
    return pos.x >= btn.x && pos.x <= btn.x + btn.width &&
           pos.y >= btn.y && pos.y <= btn.y + btn.height;
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
      shareGame('弹球', this.score);
      return;
    }

    if (this.checkButton(pos, this.soundButton)) {
      audioManager.toggle();
      this.render();
      return;
    }

    const { width } = this.designSize;
    playSound(SoundType.MOVE);
    if (pos.x < width / 2) {
      this.ball.vx = -8;
    } else {
      this.ball.vx = 8;
    }
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');

    // 标题
    drawText(this.ctx, '弹球', width / 2, safeTop + 55, {
      fontSize: 52,
      color: this.theme.primary,
      bold: true
    });

    // 关卡名
    drawText(this.ctx, this.levelName, width / 2 - 100, safeTop + 55, { fontSize: 22, color: Colors.textLight });

    // 分数
    drawText(this.ctx, `${this.score}`, width / 2 + 140, safeTop + 55, {
      fontSize: 42,
      color: Colors.textDark,
      bold: true
    });

    // 按钮
    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享 ↗', Colors.success, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.soundButton.x, this.soundButton.y, this.soundButton.width, this.soundButton.height, audioManager.enabled ? '🔊' : '🔇', Colors.info, { fontSize: 32, radius: 16 });

    // 游戏区域
    drawRoundRect(this.ctx, 22, this.gameAreaTop, width - 44, this.gameAreaHeight, 26, '#fff', this.theme.primary, 4);

    // 平台
    this.platforms.forEach(platform => {
      drawRoundRect(this.ctx, platform.x, platform.y, platform.width, platform.height, 10, platform.color);
    });

    // 球
    drawCircle(this.ctx, this.ball.x, this.ball.y, this.ball.size, this.theme.primary);

    // 底部提示
    drawText(this.ctx, '点击左/右控制弹跳', width / 2, height - safeBottom - 40, {
      fontSize: 26,
      color: Colors.textMuted
    });
  }
}
