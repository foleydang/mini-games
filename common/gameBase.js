/**
 * 游戏基类 - 提供公共功能
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton, drawText,
  Storage, shareGame
} from './utils.js';
import { playSound, SoundType, audioManager } from './audio.js';

export class GameBase {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    // 公共属性
    this.score = 0;
    this.bestScore = 0;
    this.gameOver = false;
    this.loading = false;
    this.theme = null;
    this.gameName = '';
    this.gameId = '';

    // 标准按钮位置
    this.backButton = this.createBackButton();
    this.shareButton = this.createShareButton();
    this.soundButton = this.createSoundButton();
    
    // 触摸起始位置
    this.touchStartPos = null;
    
    // 游戏循环定时器
    this.timer = null;
  }

  // 创建标准按钮
  createBackButton() {
    const { safeTop } = this.designSize;
    return { 
      x: this.designSize.width - 140, 
      y: safeTop + 85, 
      width: 120, 
      height: 55, 
      label: '← 返回',
      action: SoundType.CLICK
    };
  }

  createShareButton() {
    const { safeTop } = this.designSize;
    return { 
      x: 20, 
      y: safeTop + 85, 
      width: 120, 
      height: 55, 
      label: '分享 ↗',
      action: SoundType.SUCCESS
    };
  }

  createSoundButton() {
    const { safeTop } = this.designSize;
    return {
      x: this.designSize.width / 2 - 60,
      y: safeTop + 85,
      width: 120,
      height: 55,
      label: audioManager.enabled ? '🔊 音效' : '🔇 静音',
      action: SoundType.CLICK
    };
  }

  // 检测按钮点击
  checkButton(pos, btn) {
    return pos.x >= btn.x && pos.x <= btn.x + btn.width &&
           pos.y >= btn.y && pos.y <= btn.y + btn.height;
  }

  // 处理公共按钮点击
  handleCommonButtons(pos) {
    // 返回按钮
    if (this.checkButton(pos, this.backButton)) {
      playSound(SoundType.CLICK);
      this.destroy();
      this.onEnd(this.score);
      return true;
    }

    // 分享按钮
    if (this.checkButton(pos, this.shareButton)) {
      playSound(SoundType.SUCCESS);
      shareGame(this.gameName, this.score);
      return true;
    }

    // 音效开关按钮
    if (this.checkButton(pos, this.soundButton)) {
      toggleSound();
      this.soundButton.label = audioManager.enabled ? '🔊 音效' : '🔇 静音';
      return true;
    }

    return false;
  }

  // 绘制公共UI（标题、按钮）
  drawCommonUI(title = null) {
    const { width, safeTop } = this.designSize;

    // 标题
    if (title) {
      drawText(this.ctx, title, width / 2, safeTop + 50, {
        fontSize: 48,
        color: this.theme?.primary || Colors.primary,
        bold: true
      });
    }

    // 分数显示
    drawText(this.ctx, `${this.score}`, width / 2 + 140, safeTop + 50, {
      fontSize: 36,
      color: Colors.textDark,
      bold: true
    });

    // 按钮
    drawButton(this.ctx, this.backButton.x, this.backButton.y, 
               this.backButton.width, this.backButton.height,
               this.backButton.label, Colors.danger, { fontSize: 32, radius: 16 });
    
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y,
               this.shareButton.width, this.shareButton.height,
               this.shareButton.label, Colors.success, { fontSize: 32, radius: 16 });
    
    drawButton(this.ctx, this.soundButton.x, this.soundButton.y,
               this.soundButton.width, this.soundButton.height,
               this.soundButton.label, Colors.info, { fontSize: 32, radius: 16 });
  }

  // 绘制游戏区域背景
  drawGameArea(top, height) {
    const { width } = this.designSize;
    drawRoundRect(this.ctx, 22, top, width - 44, height, 26, '#fff', 
                  this.theme?.primary || Colors.primary, 4);
  }

  // 绘制底部提示
  drawHint(text) {
    const { height, safeBottom } = this.designSize;
    drawText(this.ctx, text, this.designSize.width / 2, height - safeBottom - 38, {
      fontSize: 24,
      color: Colors.textMuted
    });
  }

  // 游戏结束弹窗
  showGameOverModal(customContent = '') {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      Storage.save(`${this.gameId}_best`, this.bestScore);
    }

    playSound(SoundType.GAME_OVER);

    const content = customContent || `得分: ${this.score}\n最高: ${this.bestScore}`;

    wx.showModal({
      title: '游戏结束',
      content: content,
      confirmText: '重试',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) this.restart();
        else {
          this.destroy();
          this.onEnd(this.score);
        }
      }
    });
  }

  // 过关弹窗
  showWinModal(customContent = '') {
    playSound(SoundType.LEVEL_UP);

    wx.showModal({
      title: '🎉 恭喜过关！',
      content: customContent,
      confirmText: '继续',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) this.nextLevel?.();
        else {
          this.destroy();
          this.onEnd(this.score);
        }
      }
    });
  }

  // 基类方法（子类需实现）
  restart() {
    // 子类实现
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  onTouchStart(pos) {
    if (this.gameOver) return;
    this.handleCommonButtons(pos);
    this.touchStartPos = pos;
  }

  onTouchMove(pos) {
    // 子类实现具体移动逻辑
  }

  onTouchEnd(pos) {
    this.touchStartPos = null;
  }

  render() {
    // 子类实现具体渲染逻辑
  }
}

// 随机整数
export const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// 随机选择数组元素
export const randomChoice = (arr) => arr[randomInt(0, arr.length - 1)];

// 洗牌算法
export const shuffleArray = (arr) => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
