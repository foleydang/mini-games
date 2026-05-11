/**
 * 翻牌配对 - 鲜明活力风格（大尺寸优化版）
 */
import {
  Colors, drawGradientBg, drawRoundRect, drawButton,
  drawText,
  Storage, shareGame
} from '../common/utils.js';

export default class MemoryGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;

    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.bestMoves = Storage.load('memory_best') || 999;
    this.gameOver = false;
    this.checkingMatch = false;

    this.theme = Colors.themes.memory;

    // 按钮放在标题下方，间距美观
    this.backButton = { x: designSize.width - 140, y: designSize.safeTop + 85, width: 120, height: 55 };
    this.shareButton = { x: 20, y: designSize.safeTop + 85, width: 120, height: 55 };

    this.symbols = ['🌟', '💎', '🔥', '⚡', '💜', '🎯', '🍀', '🌈'];

    this.initGame();
    this.startLoop();
  }

  initGame() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    this.gameAreaTop = safeTop + 160;
    this.gameAreaBottom = height - safeBottom - 60;
    this.gameAreaHeight = this.gameAreaBottom - this.gameAreaTop;

    const cols = 4;
    const rows = 4;
    const padding = 28;
    const gap = 22;
    const cardWidth = (width - padding * 2 - gap * (cols - 1)) / cols;
    const cardHeight = (this.gameAreaHeight - 40 - gap * (rows - 1)) / rows;

    const pairs = [...this.symbols, ...this.symbols];
    this.shuffleArray(pairs);

    this.cards = [];
    for (let i = 0; i < rows * cols; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
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

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  startLoop() {
    this.timer = setInterval(() => {
      this.render();
    }, 50);
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }

  checkMatch() {
    if (this.flippedCards.length !== 2) return;

    const [card1, card2] = this.flippedCards;

    if (card1.symbol === card2.symbol) {
      card1.matched = true;
      card2.matched = true;
      this.matchedPairs++;
      this.flippedCards = [];

      if (this.matchedPairs === 8) {
        this.gameOver = true;
        if (this.moves < this.bestMoves) {
          this.bestMoves = this.moves;
          Storage.save('memory_best', this.bestMoves);
        }

        wx.showModal({
          title: '🎉 恭喜!',
          content: `用了 ${this.moves} 步完成\n最佳: ${this.bestMoves} 步`,
          confirmText: '重试',
          cancelText: '返回',
          success: (res) => {
            if (res.confirm) this.initGame();
            else {
              this.destroy();
              this.onEnd(this.moves);
            }
          }
        });
      }
    } else {
      setTimeout(() => {
        card1.flipped = false;
        card2.flipped = false;
        this.flippedCards = [];
        this.checkingMatch = false;
      }, 700);
    }
  }

  onTouchStart(pos) {
    if (this.checkingMatch) return;

    if (this.checkButton(pos, this.backButton)) {
      this.destroy();
      this.onEnd(this.moves);
      return;
    }

    if (this.checkButton(pos, this.shareButton)) {
      shareGame('翻牌', this.moves);
      return;
    }

    if (this.gameOver) return;

    for (const card of this.cards) {
      if (!card.flipped && !card.matched &&
          pos.x >= card.x && pos.x <= card.x + card.width &&
          pos.y >= card.y && pos.y <= card.y + card.height) {
        card.flipped = true;
        this.flippedCards.push(card);
        this.moves++;

        if (this.flippedCards.length === 2) {
          this.checkingMatch = true;
          this.checkMatch();
        }
        break;
      }
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
    drawText(this.ctx, '🃏 翻牌配对', width / 2, safeTop + 55, {
      fontSize: 52,
      color: this.theme.primary,
      bold: true
    });

    drawText(this.ctx, `${this.matchedPairs}/8  步:${this.moves}`, width - 130, safeTop + 55, {
      fontSize: 34,
      color: Colors.textDark,
      bold: true,
      align: 'right'
    });

    // 按钮 - 大字体，在标题下方
    drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
    drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, '分享 ↗', Colors.success, { fontSize: 32, radius: 16 });

    // 游戏区域
    drawRoundRect(this.ctx, 22, this.gameAreaTop, width - 44, this.gameAreaHeight, 26, '#fff', this.theme.primary, 4);

    // 卡片 - 更大更醒目
    this.cards.forEach(card => {
      if (card.matched) {
        drawRoundRect(this.ctx, card.x, card.y, card.width, card.height, 20, Colors.success);
        drawText(this.ctx, card.symbol, card.x + card.width / 2, card.y + card.height / 2, { fontSize: 56 });
      } else if (card.flipped) {
        drawRoundRect(this.ctx, card.x, card.y, card.width, card.height, 20, this.theme.primary);
        drawText(this.ctx, card.symbol, card.x + card.width / 2, card.y + card.height / 2, { fontSize: 56 });
      } else {
        drawRoundRect(this.ctx, card.x, card.y, card.width, card.height, 20, '#d1d5db');
        drawText(this.ctx, '?', card.x + card.width / 2, card.y + card.height / 2, { fontSize: 48, color: Colors.textLight });
      }
    });

    // 提示 - 底部
    drawText(this.ctx, '点击翻开卡片找配对', width / 2, height - safeBottom - 40, {
      fontSize: 26,
      color: Colors.textMuted
    });
  }
}