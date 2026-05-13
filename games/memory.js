/**
 * 翻牌配对游戏 - 视觉优化版
 */
export default class MemoryGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    
    this.level = 1;
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = 6;
    this.moves = 0;
    this.gameOver = false;
    this.checkingMatch = false;
    
    this.cardColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    this.symbols = ['★', '♦', '♣', '♠', '♥', '●'];
    
    this.initGame();
  }

  initGame() {
    const { width, safeTop, safeBottom, height } = this.designSize;
    
    const cols = 4;
    const rows = 3;
    this.totalPairs = 6;
    
    const gameAreaTop = safeTop + 250;
    const gameAreaBottom = height - safeBottom - 120;
    const gameAreaHeight = gameAreaBottom - gameAreaTop;
    
    const padding = 20;
    const gap = 15;
    const cardWidth = (width - padding * 2 - gap * (cols - 1)) / cols;
    const cardHeight = (gameAreaHeight - gap * (rows - 1)) / rows;
    
    const symbols = this.symbols.slice(0, this.totalPairs);
    const pairs = [...symbols, ...symbols];
    
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    
    this.cards = [];
    for (let i = 0; i < rows * cols; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.cards.push({
        x: padding + col * (cardWidth + gap),
        y: gameAreaTop + row * (cardHeight + gap),
        width: cardWidth,
        height: cardHeight,
        symbol: pairs[i],
        color: this.cardColors[symbols.indexOf(pairs[i])],
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
    
    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#fdf4ff');
    gradient.addColorStop(1, '#e9d5ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('翻牌配对', width / 2, safeTop + 60);
    
    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.textAlign = 'left';
    ctx.fillText('步数: ' + this.moves, 50, safeTop + 130);
    ctx.textAlign = 'right';
    ctx.fillText('配对: ' + this.matchedPairs + '/' + this.totalPairs, width - 50, safeTop + 130);
    
    for (const card of this.cards) this.drawCard(card);
    
    // 返回按钮
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(width - 140, safeTop + 85, 120, 55, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('← 返回', width - 80, safeTop + 117);
    
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText('恭喜过关！', width / 2, safeTop + 300);
      ctx.font = '32px sans-serif';
      ctx.fillText('步数: ' + this.moves, width / 2, safeTop + 360);
    }
  }

  drawCard(card) {
    const ctx = this.ctx;
    const { x, y, width, height, flipped, matched, symbol, color } = card;
    
    if (matched) {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.strokeStyle = '#ccc';
    } else if (flipped) {
      ctx.fillStyle = color;
      ctx.strokeStyle = '#fff';
    } else {
      ctx.fillStyle = '#2c3e50';
      ctx.strokeStyle = '#1a252f';
    }
    
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 12);
    ctx.fill();
    ctx.stroke();
    
    if (flipped || matched) {
      ctx.fillStyle = matched ? '#999' : '#fff';
      ctx.font = `bold ${Math.min(width, height) * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, x + width / 2, y + height / 2);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(width, height) * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x + width / 2, y + height / 2);
    }
    
    if (flipped && !matched) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x - 2, y - 2, width + 4, height + 4, 14);
      ctx.stroke();
    }
  }

  onTouchStart(pos) {
    const { width, safeTop } = this.designSize;
    
    // 返回按钮
    if (pos.x >= width - 140 && pos.x <= width - 20 && pos.y >= safeTop + 85 && pos.y <= safeTop + 140) {
      this.onEnd(this.moves);
      return;
    }
    
    if (this.gameOver) {
      this.onEnd(this.moves);
      return;
    }
    
    if (this.checkingMatch) return;
    
    const card = this.cards.find(c => 
      pos.x >= c.x && pos.x <= c.x + c.width &&
      pos.y >= c.y && pos.y <= c.y + c.height &&
      !c.flipped && !c.matched
    );
    
    if (!card) return;
    
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
          if (this.matchedPairs === this.totalPairs) this.gameOver = true;
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
