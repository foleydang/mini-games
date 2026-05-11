/**
 * 弹球 - 无限型游戏（里程碑成就系统）
 * - 单局无限游戏，球掉落为止
 * - 难度渐进：速度加快、平台变窄
 * - 里程碑：50分(铜)、100分(银)、200分(金)、500分(白金)、1000分(钻石)
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, drawCircle, Storage, shareGame
} from '../common/utils.js';
import { Milestones } from '../common/config.js';
import.*audio.js
import { getBackButton, getShareButton, getSoundButton } from "../common/ui.js";';

export default class BounceGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    const config = Milestones.bounce;
    this.targets = config.targets;
    this.milestoneNames = config.names;
    this.speedStart = config.speedStart;
    this.speedMax = config.speedMax;
    this.speedIncPerScore = config.speedIncPerScore;

    this.ball = { x: 0, y: 0, vx: 0, vy: 0 };
    this.platforms = [];
    this.score = 0;
    this.bestScore = Storage.load('bounce_best') || 0;
    this.gameOver = false;
    this.scrollSpeed = this.speedStart;
    this.achievedMilestone = -1;

    this.theme = Colors.themes.bounce;
    this.backButton = { x: 20, y: 0, width: 120, height: 50 }; // y在render中动态计算;
    this.shareButton = { x: 150, y: 1000, width: 120, height: 55 };
    this.soundButton = { x: designSize.width - 135, y: 1000, width: 120, height: 55 };

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    this.gameAreaTop = safeTop + 160;
    this.gameAreaBottom = height - safeBottom - 60;
    this.gameAreaHeight = this.gameAreaBottom - this.gameAreaTop;

    const centerOffset = this.gameAreaHeight * 0.3;
    this.ball = { x: width / 2, y: this.gameAreaTop + centerOffset + 80, vx: 0, vy: 0, size: 30 };
    this.score = 0;
    this.gameOver = false;
    this.scrollSpeed = this.speedStart;
    this.achievedMilestone = -1;

    this.platforms = [];
    const platformColors = [Colors.danger, Colors.warning, Colors.success, Colors.primary, Colors.info];
    for (let i = 0; i < 7; i++) {
      this.addPlatform(this.gameAreaTop + centerOffset + 150 + i * 80, platformColors[i % platformColors.length], i === 0);
    }
    this.render();
  }

  addPlatform(y, color, isFirst = false) {
    const { width } = this.designSize;
    const platformWidth = isFirst ? width * 0.7 : 80 + Math.random() * 60;
    this.platforms.push({ x: Math.random() * (width - platformWidth), y, width: platformWidth, height: 22, color });
  }

  startLoop() {
    this.timer = setInterval(() => {
      if (!this.gameOver) this.update();
      this.render();
    }, 28);
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
    const { width } = this.designSize;
    this.ball.vy += 0.45;
    this.ball.y += this.ball.vy;
    this.ball.x += this.ball.vx;

    if (this.ball.x <= this.ball.size) { this.ball.x = this.ball.size; this.ball.vx *= -0.75; }
    if (this.ball.x >= width - this.ball.size) { this.ball.x = width - this.ball.size; this.ball.vx *= -0.75; }

    this.platforms.forEach(platform => {
      if (this.ball.vy > 0 && this.ball.y + this.ball.size >= platform.y &&
          this.ball.y + this.ball.size <= platform.y + platform.height + 10 &&
          this.ball.x >= platform.x && this.ball.x <= platform.x + platform.width) {
        this.ball.vy = -12;
        this.ball.vx += (Math.random() - 0.5) * 4;
        this.score += 10;
        playSound(SoundType.BOUNCE);

        const newMilestone = this.getCurrentMilestone();
        if (newMilestone > this.achievedMilestone) { this.achievedMilestone = newMilestone; playSound(SoundType.LEVEL_UP); }

        // 难度渐进
        if (this.score % this.speedIncPerScore === 0 && this.score > 0) {
          this.scrollSpeed = Math.min(this.speedMax, this.scrollSpeed + 0.3);
        }
      }
    });

    this.platforms.forEach(p => { p.y -= this.scrollSpeed; });
    if (this.platforms.length > 0 && this.platforms[0].y < this.gameAreaTop) {
      this.platforms.shift();
      const lastY = this.platforms[this.platforms.length - 1]?.y || this.gameAreaTop + this.gameAreaHeight * 0.3 + 150;
      const colors = [Colors.danger, Colors.warning, Colors.success, Colors.primary, Colors.info];
      this.addPlatform(lastY + 80, colors[Math.floor(Math.random() * colors.length)]);
    }

    if (this.ball.y > this.gameAreaTop + this.gameAreaHeight * 0.45) this.ball.y -= this.scrollSpeed;
    if (this.ball.y < this.gameAreaTop + this.ball.size) { this.ball.y = this.gameAreaTop + this.ball.size; this.ball.vy = Math.abs(this.ball.vy) * 0.8; }

    if (this.ball.y > this.gameAreaBottom) {
      this.gameOver = true;
      playSound(SoundType.GAME_OVER);
      if (this.score > this.bestScore) { this.bestScore = this.score; Storage.save('bounce_best', this.bestScore); }
      const milestone = this.getCurrentMilestone();
      wx.showModal({
        title: milestone >= 0 ? `🎉 ${this.milestoneNames[milestone]}` : '游戏结束',
        content: `得分: ${this.score}\n最高: ${this.bestScore}`,
        confirmText: '重试',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) { this.destroy(); this.initGame(); this.startLoop(); }
          else { this.destroy(); this.onEnd(this.score); }
        }
      });
    }
  }

  checkButton(pos, btn) { return pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height; }

  onTouchStart(pos) {
    if (this.checkButton(pos, this.backButton)) { playSound(SoundType.CLICK); this.destroy(); this.onEnd(this.score); return; }
    if (this.checkButton(pos, this.shareButton)) { playSound(SoundType.SUCCESS); shareGame('弹球', this.score); return; }
    if (this.checkButton(pos, this.soundButton)) { audioManager.toggle(); this.render(); return; }
    const { width } = this.designSize;
    playSound(SoundType.MOVE);
    this.ball.vx = pos.x < width / 2 ? -8 : 8;
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    this.backButton.y = height - safeBottom - 65;
    this.shareButton.y = height - safeBottom - 65;
    this.soundButton.y = height - safeBottom - 65;

    
    drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');
    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, "← 返回", Colors.danger, { fontSize: 28, radius: 14 });

    drawText(this.ctx, '弹球', width / 2, safeTop + 55, { fontSize: 52, color: this.theme.primary, bold: true });
    const milestone = this.getCurrentMilestone();
    if (milestone >= 0) drawText(this.ctx, this.milestoneNames[milestone], width / 2 - 100, safeTop + 55, { fontSize: 22, color: Colors.warning });
    drawText(this.ctx, `${this.score}`, width / 2 + 140, safeTop + 55, { fontSize: 42, color: Colors.textDark, bold: true });
    const next = this.getNextMilestone();
    if (next) drawText(this.ctx, `→${next.target}`, width / 2 + 200, safeTop + 55, { fontSize: 20, color: Colors.textLight });

    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享 ↗', Colors.success, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.soundButton.x, this.soundButton.y, this.soundButton.width, this.soundButton.height, audioManager.enabled ? '🔊' : '🔇', Colors.info, { fontSize: 32, radius: 16 });

    drawRoundRect(this.ctx, 22, this.gameAreaTop, width - 44, this.gameAreaHeight, 26, '#fff', this.theme.primary, 4);
    this.platforms.forEach(p => { drawRoundRect(this.ctx, p.x, p.y, p.width, p.height, 10, p.color); });
    drawCircle(this.ctx, this.ball.x, this.ball.y, this.ball.size, this.theme.primary);

    let hint = '点击左/右控制 ';
    for (let i = 0; i < this.targets.length; i++) {
      hint += this.score >= this.targets[i] ? '✓' : ` →${this.targets[i]}`;
      if (this.score < this.targets[i]) break;
    }
    drawText(this.ctx, hint, width / 2, height - safeBottom - 40, { fontSize: 26, color: Colors.textMuted });
  }
}
