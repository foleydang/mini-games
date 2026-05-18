// 翻牌配对游戏 - 关卡型
import { Colors, drawRoundRect, drawButton, drawText, drawGradientBg, Storage } from '../common/utils.js';
import { Levels, MemorySymbols } from '../common/config.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';

export default class MemoryGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'memory';
    
    this.level = Storage.load('memory_level') || 0;
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = 8;
    this.moves = 0;
    this.gameOver = false;
    this.checkingMatch = false;
    this.soundEnabled = true;
    
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);
    
    this.theme = {
      primary: '#06b6d4',
      secondary: '#67e8f9',
      bg: '#ecfeff'
    };
    
    this.initGame();
  }

  initGame() {
    const levelConfig = Levels.memory[this.level] || Levels.memory[0];
    const cols = levelConfig.cols;
    const rows = levelConfig.rows;
    this.totalPairs = levelConfig.pairs;
    this.levelName = levelConfig.name;
    this.cols = cols;
    this.rows = rows;
    
    const { width, safeTop, safeBottom, height } = this.designSize;
    
    const headerHeight = safeTop + 180;
    const footerHeight = safeBottom + 80;
    const gameAreaTop = headerHeight + 20;
    const gameAreaBottom = height - footerHeight;
    const gameAreaHeight = gameAreaBottom - gameAreaTop;
    
    const padding = 25;
    const gap = 10;
    const cardWidth = (width - padding * 2 - gap * (cols - 1)) / cols;
    const cardHeight = (gameAreaHeight - gap * (rows - 1)) / rows;
    
    const symbols = MemorySymbols.slice(0, this.totalPairs);
    const pairs = [...symbols, ...symbols];
    
    // 洗牌
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    
    this.cards = [];
    this.cardColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F7DC6F', '#BB8FCE',
      '#FF9FF3', '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0', '#ff6348', '#7bed9f'];
    
    for (let i = 0; i < rows * cols; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.cards.push({
        x: padding + col * (cardWidth + gap),
        y: gameAreaTop + row * (cardHeight + gap),
        width: cardWidth,
        height: cardHeight,
        symbol: pairs[i],
        color: this.cardColors[symbols.indexOf(pairs[i]) % this.cardColors.length],
        flipped: false,
        matched: false
      });
    }
    
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.gameOver = false;
    this.checkingMatch = false;
    
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const { width, safeTop, height, safeBottom } = this.designSize;
    
    ctx.clearRect(0, 0, width, height);
    drawGradientBg(ctx, width, height, '#ecfeff', '#cffafe');
    
    drawText(ctx, '翻牌配对', width / 2, safeTop + 55, { fontSize: 48, color: '#0891b2', bold: true });
    drawText(ctx, `第${this.level + 1}关 ${this.levelName}`, width / 2, safeTop + 95, { fontSize: 22, color: '#6b7280' });
    drawText(ctx, '步数: ' + this.moves + '  配对: ' + this.matchedPairs + '/' + this.totalPairs, width / 2, safeTop + 135, { fontSize: 26, color: '#4b5563' });
    
    // 关卡进度
    const maxLevel = Levels.memory.length;
    const progressWidth = width - 80;
    drawRoundRect(ctx, 40, safeTop + 165, progressWidth, 14, 7, '#e5e7eb');
    const fillWidth = Math.max(progressWidth * ((this.level + 1) / maxLevel), 14);
    drawRoundRect(ctx, 40, safeTop + 165, fillWidth, 14, 7, '#0891b2');
    
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);
    
    for (const card of this.cards) this.drawCard(card);
    
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '🎉 过关！', width / 2, height / 2 - 50, { fontSize: 48, color: '#fff', bold: true });
      drawText(ctx, '步数: ' + this.moves, width / 2, height / 2 + 20, { fontSize: 32, color: '#fff' });
      drawHint(ctx, this.designSize, '点击返回');
    }
  }

  drawCard(card) {
    const ctx = this.ctx;
    const { x, y, width, height, flipped, matched, symbol, color } = card;
    
    if (matched) {
      drawRoundRect(ctx, x, y, width, height, 10, 'rgba(200,200,200,0.3)', '#ccc', 2);
      ctx.fillStyle = '#999';
      ctx.font = `bold ${Math.min(width, height) * 0.35}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, x + width / 2, y + height / 2);
      return;
    }
    
    if (flipped) {
      // 正面 - 彩色背景
      drawRoundRect(ctx, x, y, width, height, 10, color, '#fff', 3);
      // 金色边框高亮
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(x - 2, y - 2, width + 4, height + 4);
      ctx.stroke();
      // 符号
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(width, height) * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, x + width / 2, y + height / 2);
    } else {
      // 背面 - 深色卡片
      drawRoundRect(ctx, x, y, width, height, 10, '#2c3e50', '#1a252f', 2);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(width, height) * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x + width / 2, y + height / 2);
    }
  }

  onTouchStart(pos) {
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') { this.onEnd(this.moves); return; }
    if (btn === 'soundBtn') { this.soundEnabled = !this.soundEnabled; this.draw(); return; }
    
    if (this.gameOver) {
      const hasNext = this.level + 1 < Levels.memory.length;
      if (hasNext) {
        this.level++;
        Storage.save('memory_level', this.level);
        this.initGame();
      } else {
        this.onEnd(this.moves);
      }
      return;
    }
    
    if (this.checkingMatch) return;
    
    const card = this.cards.find(c => 
      pos.x >= c.x && pos.x <= c.x + c.width &&
      pos.y >= c.y && pos.y <= c.y + c.height &&
      !c.flipped && !c.matched
    );
    
    if (!card) return;
    
    playSound(SoundType.CARD);
    card.flipped = true;
    this.flippedCards.push(card);
    this.moves++;
    this.draw();
    
    if (this.flippedCards.length === 2) {
      this.checkingMatch = true;
      const [card1, card2] = this.flippedCards;
      
      setTimeout(() => {
        if (card1.symbol === card2.symbol) {
          card1.matched = true;
          card2.matched = true;
          this.matchedPairs++;
          playSound(SoundType.MATCH_PAIR);
          if (this.matchedPairs === this.totalPairs) {
            this.gameOver = true;
            playSound(SoundType.LEVEL_UP);
          }
        } else {
          card1.flipped = false;
          card2.flipped = false;
        }
        this.flippedCards = [];
        this.checkingMatch = false;
        this.draw();
      }, 500);
    }
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}
}
