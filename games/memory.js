/**
 * 翻牌配对 - 关卡型游戏（配对完成过关）
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText, Storage, shareGame
} from '../common/utils.js';
import { Levels, MemorySymbols } from '../common/config.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';
import { getBackButton, getShareButton, getSoundButton } from '../common/ui.js';

function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default class MemoryGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    this.level = Storage.load('memory_level') || 0;
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = 6;
    this.moves = 0;
    this.bestMoves = Storage.load('memory_best') || 999;
    this.gameOver = false;
    this.checkingMatch = false;
    this.levelName = '入门';
    this.cols = 4;
    this.rows = 3;

    this.theme = Colors.themes.memory;
    // 按钮在左下角和右下角（远离胶囊按钮）
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const levelConfig = Levels.memory[this.level] || Levels.memory[0];
    this.cols = levelConfig.cols;
    this.rows = levelConfig.rows;
    this.totalPairs = levelConfig.pairs;
    this.levelName = levelConfig.name;

    const symbols = MemorySymbols.slice(0, this.totalPairs);

    const { width, height, safeTop, safeBottom } = this.designSize;
    this.gameAreaTop = safeTop + 220;
    this.gameAreaBottom = height - safeBottom - 60;
    this.gameAreaHeight = this.gameAreaBottom - this.gameAreaTop;

    const padding = 28;
    const gap = 22;
    const cardWidth = (width - padding * 2 - gap * (this.cols - 1)) / this.cols;
    const cardHeight = (this.gameAreaHeight - 40 - gap * (this.rows - 1)) / this.rows;

    const pairs = shuffleArray([...symbols, ...symbols]);

    this.cards = [];
    for (let i = 0; i < this.rows * this.cols; i++) {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      this.cards.push({
        x: padding + col * (cardWidth + gap),
        y: this.gameAreaTop + 22 + row * (cardHeight + gap),
        width: cardWidth,
        height: cardHeight,
        symbol: pairs[i],
        flipped: false,
        matched: false
      });
    }

    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.gameOver = false;
    this.checkingMatch = false;
    this.render();
  }

  startLoop() { this.timer = setInterval(() => { this.render(); }, 50); }
  destroy() { if (this.timer) clearInterval(this.timer); }

  checkMatch() {
    if (this.flippedCards.length !== 2) return;
    const [card1, card2] = this.flippedCards;

    if (card1.symbol === card2.symbol) {
      card1.matched = true;
      card2.matched = true;
      this.matchedPairs++;
      this.flippedCards = [];
      this.checkingMatch = false;  // 重置状态，允许继续点击
      playSound(SoundType.MATCH_PAIR);

      if (this.matchedPairs === this.totalPairs) {
        this.gameOver = true;
        if (this.moves < this.bestMoves) { this.bestMoves = this.moves; Storage.save('memory_best', this.bestMoves); }
        playSound(SoundType.LEVEL_UP);

        const hasNext = this.level + 1 < Levels.memory.length;
        wx.showModal({
          title: '🎉 过关！',
          content: `关卡: ${this.levelName}\n用了 ${this.moves} 步\n最佳: ${this.bestMoves} 步`,
          confirmText: hasNext ? '下一关' : '重玩',
          cancelText: '返回',
          success: (res) => {
            if (res.confirm) {
              if (hasNext) { this.level++; Storage.save('memory_level', this.level); }
              this.destroy(); this.initGame(); this.startLoop();
            } else { this.destroy(); this.onEnd(this.moves); }
          }
        });
      }
    } else {
      playSound(SoundType.FAIL);
      setTimeout(() => {
        card1.flipped = false;
        card2.flipped = false;
        this.flippedCards = [];
        this.checkingMatch = false;
      }, 700);
    }
  }

  checkButton(pos, btn) { return pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height; }

  onTouchStart(pos) {
    if (this.checkingMatch) return;
    if (this.checkButton(pos, this.backButton)) { playSound(SoundType.CLICK); this.destroy(); this.onEnd(this.moves); return; }
    if (this.checkButton(pos, this.shareButton)) { playSound(SoundType.SUCCESS); shareGame('翻牌', this.moves); return; }
    if (this.checkButton(pos, this.soundButton)) { audioManager.toggle(); this.render(); return; }
    if (this.gameOver) return;

    for (const card of this.cards) {
      if (!card.flipped && !card.matched && pos.x >= card.x && pos.x <= card.x + card.width && pos.y >= card.y && pos.y <= card.y + card.height) {
        card.flipped = true;
        this.flippedCards.push(card);
        this.moves++;
        playSound(SoundType.CARD);
        if (this.flippedCards.length === 2) { this.checkingMatch = true; this.checkMatch(); }
        break;
      }
    }
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;drawGradientBg(this.ctx, width, height, this.theme.bg, '#ffffff');
    // 底部按钮在后面统一绘制

    drawText(this.ctx, '翻牌配对', width / 2, safeTop + 55, { fontSize: 52, color: this.theme.primary, bold: true });
    drawText(this.ctx, `第${this.level + 1}关 ${this.levelName}`, width / 2, safeTop + 100, { fontSize: 32, color: Colors.textLight });
    drawText(this.ctx, `${this.matchedPairs}/${this.totalPairs} 步:${this.moves}`, width / 2, safeTop + 145, { fontSize: 34, color: Colors.textDark, bold: true });

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

    this.cards.forEach(card => {
      if (card.matched) {
        drawRoundRect(this.ctx, card.x, card.y, card.width, card.height, 20, Colors.success);
        drawText(this.ctx, card.symbol, card.x + card.width / 2, card.y + card.height / 2, { fontSize: 32 });
      } else if (card.flipped) {
        drawRoundRect(this.ctx, card.x, card.y, card.width, card.height, 20, this.theme.primary);
        drawText(this.ctx, card.symbol, card.x + card.width / 2, card.y + card.height / 2, { fontSize: 32 });
      } else {
        drawRoundRect(this.ctx, card.x, card.y, card.width, card.height, 20, '#d1d5db');
        drawText(this.ctx, '?', card.x + card.width / 2, card.y + card.height / 2, { fontSize: 48, color: Colors.textLight });
      }
    });

    drawText(this.ctx, '点击翻开找配对', width / 2, height - safeBottom - 40, { fontSize: 26, color: Colors.textMuted });
  }
}
