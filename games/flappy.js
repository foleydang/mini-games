/**
 * 飞鸟 - 无限型游戏（里程碑成就系统）
 * - 单局无限游戏，撞到管道/边界为止
 * - 难度渐进：间隙随分数缩小
 * - 里程碑：飞过5个(起飞)、15个(飞行)、30个(翱翔)、50个(云端)、100个(天空之王)
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawCircle, Storage, shareGame
} from '../common/utils.js';
import { Milestones } from '../common/config.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';
import { getBackButton, getShareButton, getSoundButton } from '../common/ui.js';

export default class FlappyGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    const config = Milestones.flappy;
    this.targets = config.targets;
    this.milestoneNames = config.names;
    this.gapStart = config.gapStart;
    this.gapMin = config.gapMin;
    this.gapDecPerScore = config.gapDecPerScore;

    this.bird = { x: 0, y: 0, vy: 0 };
    this.pipes = [];
    this.score = 0;
    this.bestScore = Storage.load('flappy_best') || 0;
    this.gameOver = false;
    this.started = false;
    this.speed = 3.5;
    this.pipeGap = this.gapStart;
    this.pipeWidth = 95;
    this.pipeSpacing = 280;
    this.achievedMilestone = -1;

    this.theme = Colors.themes.flappy;
    this.backButton = getBackButton(designSize); // y在render中动态计算;
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    this.gameAreaTop = safeTop + 180;
    this.gameAreaBottom = height - safeBottom - 55;
    this.gameAreaHeight = this.gameAreaBottom - this.gameAreaTop;

    this.bird = { x: width * 0.22, y: this.gameAreaTop + this.gameAreaHeight / 2, vy: 0, size: 56 };
    this.pipes = [];
    this.score = 0;
    this.gameOver = false;
    this.started = false;
    this.pipeGap = this.gapStart;
    this.achievedMilestone = -1;
    this.addPipe(width);
    this.render();
  }

  addPipe(x) {
    const gapCenter = this.gameAreaTop + this.gameAreaHeight * (0.3 + Math.random() * 0.4);
    const gapHalf = this.pipeGap / 2;
    this.pipes.push({ x, top: gapCenter - gapHalf, bottom: gapCenter + gapHalf, passed: false });
  }

  startLoop() {
    this.timer = setInterval(() => {
      if (this.started && !this.gameOver) this.update();
      this.render();
    }, 30);
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
    this.bird.vy += 0.55;
    this.bird.vy = Math.min(this.bird.vy, 12);
    this.bird.y += this.bird.vy;

    if (this.bird.y < this.gameAreaTop + this.bird.size / 2 || this.bird.y > this.gameAreaBottom - this.bird.size / 2) {
      this.gameOver = true;
      this.handleGameOver();
      return;
    }

    this.pipes.forEach(pipe => {
      pipe.x -= this.speed;
      if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
        pipe.passed = true;
        this.score++;
        playSound(SoundType.SUCCESS);

        const newMilestone = this.getCurrentMilestone();
        if (newMilestone > this.achievedMilestone) {
          this.achievedMilestone = newMilestone;
          playSound(SoundType.LEVEL_UP);
        }

        // 难度渐进：间隙缩小
        const newGap = Math.max(this.gapMin, this.gapStart - Math.floor(this.score / this.gapDecPerScore) * 5);
        if (newGap < this.pipeGap) this.pipeGap = newGap;
      }

      if (this.bird.x + this.bird.size / 2 > pipe.x && this.bird.x - this.bird.size / 2 < pipe.x + this.pipeWidth) {
        if (this.bird.y - this.bird.size / 2 < pipe.top || this.bird.y + this.bird.size / 2 > pipe.bottom) {
          this.gameOver = true;
          playSound(SoundType.FAIL);
          this.handleGameOver();
        }
      }
    });

    if (this.pipes.length > 0 && this.pipes[0].x < -this.pipeWidth) this.pipes.shift();
    const lastPipe = this.pipes[this.pipes.length - 1];
    if (!lastPipe || lastPipe.x < this.designSize.width - this.pipeSpacing) this.addPipe(this.designSize.width);
  }

  handleGameOver() {
    if (this.score > this.bestScore) { this.bestScore = this.score; Storage.save('flappy_best', this.bestScore); }
    const milestone = this.getCurrentMilestone();
    wx.showModal({
      title: milestone >= 0 ? `🎉 ${this.milestoneNames[milestone]}` : '游戏结束',
      content: `飞过: ${this.score}个\n最高: ${this.bestScore}`,
      confirmText: '重试',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) { this.destroy(); this.initGame(); this.startLoop(); }
        else { this.destroy(); this.onEnd(this.score); }
      }
    });
  }

  checkButton(pos, btn) { return pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height; }

  onTouchStart(pos) {
    if (this.checkButton(pos, this.backButton)) { playSound(SoundType.CLICK); this.destroy(); this.onEnd(this.score); return; }
    if (this.checkButton(pos, this.shareButton)) { playSound(SoundType.SUCCESS); shareGame('飞鸟', this.score); return; }
    if (this.checkButton(pos, this.soundButton)) { audioManager.toggle(); this.render(); return; }
    if (!this.gameOver) { this.started = true; this.bird.vy = -8; playSound(SoundType.FLAP); }
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');
    // 底部按钮在后面统一绘制

    drawText(this.ctx, '飞鸟', width / 2, safeTop + 50, { fontSize: 48, color: this.theme.primary, bold: true });
    const milestone = this.getCurrentMilestone();
    if (milestone >= 0) drawText(this.ctx, this.milestoneNames[milestone], width / 2 - 100, safeTop + 50, { fontSize: 22, color: Colors.warning });
    drawText(this.ctx, `${this.score}`, width / 2 + 140, safeTop + 50, { fontSize: 38, color: Colors.textDark, bold: true });
    const next = this.getNextMilestone();
    if (next) drawText(this.ctx, `→${next.target}`, width / 2 + 200, safeTop + 50, { fontSize: 20, color: Colors.textLight });

    // 底部按钮 - 左下角和右下角
    drawButton(this.ctx, this.backButton.x, this.backButton.y, 
               this.backButton.width, this.backButton.height,
               '← 返回', Colors.danger, { fontSize: 56, radius: 28 });
    
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y,
               this.shareButton.width, this.shareButton.height,
               '分享', Colors.success, { fontSize: 56, radius: 28 });
    
    drawButton(this.ctx, this.soundButton.x, this.soundButton.y,
               this.soundButton.width, this.soundButton.height,
               audioManager.enabled ? '🔊' : '🔇', Colors.info, { fontSize: 56, radius: 28 });

    drawRoundRect(this.ctx, 22, this.gameAreaTop, width - 44, this.gameAreaHeight, 26, '#fff', this.theme.primary, 4);
    this.pipes.forEach(pipe => {
      drawRoundRect(this.ctx, pipe.x, this.gameAreaTop, this.pipeWidth, pipe.top - this.gameAreaTop, 16, '#d1d5db');
      drawRoundRect(this.ctx, pipe.x, pipe.bottom, this.pipeWidth, this.gameAreaBottom - pipe.bottom, 16, '#d1d5db');
    });

    drawCircle(this.ctx, this.bird.x, this.bird.y, this.bird.size / 2, this.theme.primary);
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(this.bird.x + 14, this.bird.y - 10, 11, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#333';
    this.ctx.beginPath();
    this.ctx.arc(this.bird.x + 16, this.bird.y - 10, 5.5, 0, Math.PI * 2);
    this.ctx.fill();

    if (!this.started && !this.gameOver) {
      let hint = '点击起飞 ';
      for (let i = 0; i < this.targets.length; i++) {
        hint += '○';
        if (i === 0) break;
      }
      drawText(this.ctx, hint, width / 2, height - safeBottom - 42, { fontSize: 30, color: Colors.textLight });
    }
  }
}
