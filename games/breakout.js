/**
 * 打砖块 - 关卡型游戏（清完砖块过关）
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawCircle, Storage, shareGame, completeLevel, saveLevelStars
} from '../common/utils.js';
import { Levels, BrickColors } from '../common/config.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';
import { getBackButton, getShareButton, getSoundButton } from '../common/ui.js';
import LevelResult from '../common/level-result.js';

export default class BreakoutGame {
  constructor(canvas, ctx, designSize, onEnd, level = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    this.levels = Levels.breakout;
    this.level = Math.max(0, Math.min(level, this.levels.length - 1));
    this.levelName = '';

    this.ball = { x: 0, y: 0, vx: 0, vy: 0 };
    this.paddle = { x: 0, width: 130, height: 18 };
    this.bricks = [];
    this.score = 0;
    this.bestScore = Storage.load('breakout_best') || 0;
    this.gameOver = false;
    this.result = null;
    this.ballSpeed = 15;
    this.brickRows = 3;
    this.brickCols = 5;
    this.brickMaxHp = 1;
    this.theme = Colors.themes.breakout;

    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const levelConfig = this.levels[this.level] || this.levels[0];
    this.brickRows = levelConfig.rows;
    this.brickCols = levelConfig.cols;
    this.ballSpeed = levelConfig.speed;
    this.brickMaxHp = levelConfig.hp || 1;
    this.levelName = levelConfig.name || `第${this.level + 1}关`;

    const { width, height, safeTop, safeBottom } = this.designSize;
    this.gameAreaTop = safeTop + 270;
    this.gameAreaBottom = height - safeBottom - 55;
    this.gameAreaHeight = this.gameAreaBottom - this.gameAreaTop;

    this.ball = { x: width / 2, y: this.gameAreaBottom - 80, vx: this.ballSpeed * 0.8, vy: -this.ballSpeed, size: 20 };
    this.paddle = { x: width / 2 - 65, y: this.gameAreaBottom - 45, width: 130, height: 18 };

    const brickWidth = (width - 65) / this.brickCols;
    const brickHeight = 45;
    const brickStartY = this.gameAreaTop + 35;

    this.bricks = [];
    const brickColors = BrickColors;
    for (let row = 0; row < this.brickRows; row++) {
      // 顶部行更硬(hp 更高)
      const t = this.brickRows <= 1 ? 0 : (this.brickRows - 1 - row) / (this.brickRows - 1);
      const hp = 1 + Math.round(t * (this.brickMaxHp - 1));
      for (let col = 0; col < this.brickCols; col++) {
        this.bricks.push({
          x: 32 + col * brickWidth,
          y: brickStartY + row * (brickHeight + 12),
          width: brickWidth - 8,
          height: brickHeight,
          color: brickColors[row % brickColors.length],
          hp,
          maxHp: hp,
          alive: true
        });
      }
    }

    this.score = 0;
    this.gameOver = false;
    this.result = null;
    this.elapsedMs = 0;
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
    this.elapsedMs += 28;
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
    const { width } = this.designSize;

    if (this.ball.x <= this.ball.size || this.ball.x >= width - this.ball.size) { this.ball.vx *= -1; playSound(SoundType.BOUNCE); }
    if (this.ball.y <= this.gameAreaTop + this.ball.size) { this.ball.vy *= -1; playSound(SoundType.BOUNCE); }

    if (this.ball.y + this.ball.size >= this.paddle.y && this.ball.x >= this.paddle.x && this.ball.x <= this.paddle.x + this.paddle.width) {
      this.ball.vy *= -1;
      const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
      this.ball.vx = (hitPos - 0.5) * this.ballSpeed * 1.5;
      playSound(SoundType.BOUNCE);
    }

    this.bricks.forEach(brick => {
      if (!brick.alive) return;
      if (this.ball.x >= brick.x && this.ball.x <= brick.x + brick.width && this.ball.y >= brick.y && this.ball.y <= brick.y + brick.height) {
        brick.hp--;
        this.ball.vy *= -1;
        if (brick.hp <= 0) {
          brick.alive = false;
          this.score += 10;
        } else {
          this.score += 5;
        }
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
    if (won) completeLevel('breakout', this.level, { timeMs: this.elapsedMs, stars });

    const hasNext = won && this.level + 1 < this.levels.length;
    // 星级:通关用时(每块砖约 1.1s 预算,越快越高)
    const budget = Math.max(1, this.bricks.length) * 1100;
    const stars = this.elapsedMs <= budget * 1.6 ? 3 : this.elapsedMs <= budget * 2.6 ? 2 : 1;
    if (won) saveLevelStars('breakout', this.level, stars);
    this.result = new LevelResult(this.designSize, {
      win: won,
      score: this.score,
      scoreLabel: '得分',
      levelName: `第${this.level + 1}关 ${this.levelName}`,
      hasNext,
      stars,
      primaryColor: this.theme.primary
    });
  }

  nextLevel() {
    this.level = Math.min(this.level + 1, this.levels.length - 1);
    this.initGame();
  }

  retry() {
    this.initGame();
  }

  checkButton(pos, btn) { return pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height; }

  onTouchStart(pos) {
    if (this.gameOver && this.result) {
      const action = this.result.onTouchStart(pos);
      if (action === 'next') this.nextLevel();
      else if (action === 'replay' || action === 'retry') this.retry();
      else if (action === 'back') { this.destroy(); this.onEnd({ score: this.score, passed: false }); }
      return;
    }
    if (this.checkButton(pos, this.backButton)) { playSound(SoundType.CLICK); this.destroy(); this.onEnd({ score: this.score, passed: false }); return; }
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
    drawGradientBg(this.ctx, width, height, this.theme.gradient[0], this.theme.gradient[1], this.theme.primary + '11');
    // 底部按钮在后面统一绘制

    drawText(this.ctx, '打砖块', width / 2, safeTop + 50, { fontSize: 48, color: this.theme.primary, bold: true });
    drawText(this.ctx, `第${this.level + 1}关 ${this.levelName}`, width / 2, safeTop + 90, { fontSize: 22, color: Colors.textLight });
    drawText(this.ctx, `${this.score}`, width / 2, safeTop + 130, { fontSize: 38, color: Colors.textDark, bold: true });

    // 底部按钮 - 左下角和右下角
    drawButton(this.ctx, this.backButton.x, this.backButton.y, 
               this.backButton.width, this.backButton.height,
               '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y,
               this.shareButton.width, this.shareButton.height,
               '分享', Colors.success, { fontSize: 32, radius: 16 });
    
    drawButton(this.ctx, this.soundButton.x, this.soundButton.y,
               this.soundButton.width, this.soundButton.height,
               audioManager.enabled ? '🔊' : '🔇', Colors.info, { fontSize: 32, radius: 16 });

    drawRoundRect(this.ctx, 22, this.gameAreaTop, width - 44, this.gameAreaHeight, 26, '#fff', this.theme.primary, 4);
    this.bricks.forEach(brick => {
      if (!brick.alive) return;
      // 血量越高越不透明,受击后变淡提示
      this.ctx.save();
      this.ctx.globalAlpha = brick.maxHp > 1 ? (0.45 + 0.55 * (brick.hp / brick.maxHp)) : 1;
      drawRoundRect(this.ctx, brick.x, brick.y, brick.width, brick.height, 12, brick.color);
      this.ctx.restore();
    });
    drawRoundRect(this.ctx, this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 9, this.theme.primary);
    drawCircle(this.ctx, this.ball.x, this.ball.y, this.ball.size, Colors.textDark);
    drawText(this.ctx, '滑动移动挡板', width / 2, height - safeBottom - 38, { fontSize: 24, color: Colors.textMuted });

    if (this.gameOver && this.result) this.result.draw(this.ctx);
  }
}
