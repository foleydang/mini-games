/**
 * 打砖块 - 关卡型游戏（清完砖块过关）
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawCircle, Storage, shareGame
} from '../common/utils.js';
import { Levels, BrickColors } from '../common/config.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';
import { getBackButton, getShareButton, getSoundButton } from '../common/ui.js';

export default class BreakoutGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    this.level = Storage.load('breakout_level') || 0;
    this.ball = { x: 0, y: 0, vx: 0, vy: 0 };
    this.paddle = { x: 0, width: 130, height: 18 };
    this.bricks = [];
    this.score = 0;
    this.bestScore = Storage.load('breakout_best') || 0;
    this.gameOver = false;
    this.ballSpeed = 8;
    this.brickRows = 3;
    this.brickCols = 5;
    this.levelName = '入门';
    this.theme = Colors.themes.breakout;

    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const levelConfig = Levels.breakout[this.level] || Levels.breakout[0];
    this.brickRows = levelConfig.rows;
    this.brickCols = levelConfig.cols;
    this.ballSpeed = 8 + this.level * 0.8;
    this.levelName = levelConfig.name;

    const { width, height, safeTop, safeBottom } = this.designSize;
    this.gameAreaTop = safeTop + 270;
    this.gameAreaBottom = height - safeBottom - 55;
    this.gameAreaHeight = this.gameAreaBottom - this.gameAreaTop;

    this.ball = { x: width / 2, y: this.gameAreaBottom - 80, vx: this.ballSpeed * 0.6, vy: -this.ballSpeed, size: 18 };
    this.paddle = { x: width / 2 - 65, y: this.gameAreaBottom - 45, width: 130, height: 18 };

    const brickWidth = (width - 65) / this.brickCols;
    const brickHeight = 42;
    const brickStartY = this.gameAreaTop + 35;

    this.bricks = [];
    const brickColors = BrickColors;
    for (let row = 0; row < this.brickRows; row++) {
      for (let col = 0; col < this.brickCols; col++) {
        this.bricks.push({
          x: 32 + col * brickWidth,
          y: brickStartY + row * (brickHeight + 10),
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

  destroy() { if (this.timer) clearInterval(this.timer); }

  update() {
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
    const { width } = this.designSize;

    if (this.ball.x <= this.ball.size || this.ball.x >= width - this.ball.size) { this.ball.vx *= -1; playSound(SoundType.BOUNCE); }
    if (this.ball.y <= this.gameAreaTop + this.ball.size) { this.ball.vy *= -1; playSound(SoundType.BOUNCE); }

    if (this.ball.y + this.ball.size >= this.paddle.y && this.ball.y + this.ball.size <= this.paddle.y + this.paddle.height + 8 &&
        this.ball.x >= this.paddle.x && this.ball.x <= this.paddle.x + this.paddle.width) {
      this.ball.vy *= -1;
      const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
      this.ball.vx = (hitPos - 0.5) * this.ballSpeed * 1.8;
      playSound(SoundType.BOUNCE);
    }

    this.bricks.forEach(brick => {
      if (!brick.alive) return;
      if (this.ball.x >= brick.x && this.ball.x <= brick.x + brick.width && this.ball.y >= brick.y && this.ball.y <= brick.y + brick.height) {
        brick.alive = false;
        this.ball.vy *= -1;
        this.score += 10;
        playSound(SoundType.BRICK);
      }
    });

    if (this.ball.y > this.gameAreaBottom) { this.gameOver = true; this.handleGameOver(false); }
    if (this.bricks.every(b => !b.alive)) { this.gameOver = true; this.handleGameOver(true); }
  }

  handleGameOver(won) {
    if (won) playSound(SoundType.LEVEL_UP);
    else playSound(SoundType.GAME_OVER);
    if (this.score > this.bestScore) { this.bestScore = this.score; Storage.save('breakout_best', this.bestScore); }

    const hasNext = this.level + 1 < Levels.breakout.length;
    wx.showModal({
      title: won ? '🎉 过关！' : '游戏结束',
      content: `关卡: ${this.levelName}\n得分: ${this.score}\n最高: ${this.bestScore}`,
      confirmText: won && hasNext ? '下一关' : '重试',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          if (won && hasNext) { this.level++; Storage.save('breakout_level', this.level); }
          this.destroy(); this.initGame(); this.startLoop();
        } else { this.destroy(); this.onEnd(this.score); }
      }
    });
  }

  checkButton(pos, btn) { return pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height; }

  onTouchStart(pos) {
    if (this.checkButton(pos, this.backButton)) { playSound(SoundType.CLICK); this.destroy(); this.onEnd(this.score); return; }
    if (this.checkButton(pos, this.shareButton)) { playSound(SoundType.SUCCESS); shareGame('打砖块', this.score); return; }
    if (this.checkButton(pos, this.soundButton)) { audioManager.toggle(); this.render(); return; }
    this.movePaddle(pos);
  }

  onTouchMove(pos) { if (!this.gameOver) this.movePaddle(pos); }
  onTouchEnd(pos) {}

  movePaddle(pos) {
    const { width } = this.designSize;
    this.paddle.x = Math.max(0, Math.min(width - this.paddle.width, pos.x - this.paddle.width / 2));
  }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');

    drawText(this.ctx, '打砖块', width / 2, safeTop + 50, { fontSize: 48, color: this.theme.primary, bold: true });
    drawText(this.ctx, `第${this.level + 1}关 ${this.levelName}`, width / 2, safeTop + 95, { fontSize: 22, color: Colors.textLight });
    drawText(this.ctx, `${this.score}`, width / 2, safeTop + 135, { fontSize: 38, color: Colors.textDark, bold: true });

    // 关卡进度指示器
    const maxLevel = Levels.breakout.length;
    const progressWidth = width - 80;
    const progressX = 40;
    const progressY = safeTop + 170;
    drawRoundRect(this.ctx, progressX, progressY, progressWidth, 16, 8, '#e5e7eb');
    const fillWidth = Math.max(progressWidth * ((this.level + 1) / maxLevel), 16);
    drawRoundRect(this.ctx, progressX, progressY, fillWidth, 16, 8, this.theme.primary);
    drawText(this.ctx, `${this.level + 1}/${maxLevel}`, width / 2, progressY + 8, { fontSize: 12, color: Colors.white, bold: true });

    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享', Colors.success, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.soundButton.x, this.soundButton.y, this.soundButton.width, this.soundButton.height, audioManager.enabled ? '🔊' : '🔇', Colors.info, { fontSize: 32, radius: 16 });

    drawRoundRect(this.ctx, 22, this.gameAreaTop, width - 44, this.gameAreaHeight, 26, '#fff', this.theme.primary, 4);

    // 砖块 - 带光泽效果
    this.bricks.forEach(brick => {
      if (brick.alive) {
        drawRoundRect(this.ctx, brick.x, brick.y, brick.width, brick.height, 12, brick.color);
        // 高光
        this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
        this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height * 0.35);
      }
    });

    // 挡板 - 带圆角和光泽
    drawRoundRect(this.ctx, this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 9, this.theme.primary);
    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height * 0.4);

    // 球 - 带光晕
    const bx = this.ball.x, by = this.ball.y, bs = this.ball.size;
    this.ctx.fillStyle = 'rgba(26, 26, 26, 0.1)';
    this.ctx.beginPath();
    this.ctx.arc(bx, by, bs + 4, 0, Math.PI * 2);
    this.ctx.fill();
    drawCircle(this.ctx, bx, by, bs, Colors.textDark);
    this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
    this.ctx.beginPath();
    this.ctx.arc(bx - 3, by - 3, bs * 0.35, 0, Math.PI * 2);
    this.ctx.fill();

    drawText(this.ctx, '滑动移动挡板', width / 2, height - safeBottom - 38, { fontSize: 24, color: Colors.textMuted });
  }
}
