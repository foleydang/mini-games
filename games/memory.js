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
    this.bestMoves = 999;
    this.gameOver = false;
    this.checkingMatch = false;
    
    // 卡片样式配置
    this.cardColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    
    this.symbols = ['★', '♦', '♣', '♠', '♥', '●', '▲', '■'];
    
    this.initGame();
  }

  initGame() {
    const { width, safeTop, safeBottom, height } = this.designSize;
    
    // 游戏区域
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
    
    // 创建卡片
    const symbols = this.symbols.slice(0, this.totalPairs);
    const pairs = [...symbols, ...symbols];
    
    // 洗牌
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
        matched: false,
        flipProgress: 0
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
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制标题
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('翻牌配对', width / 2, safeTop + 60);
    
    // 绘制信息
    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.textAlign = 'left';
    ctx.fillText('步数: ' + this.moves, 50, safeTop + 130);
    ctx.textAlign = 'right';
    ctx.fillText('配对: ' + this.matchedPairs + '/' + this.totalPairs, width - 50, safeTop + 130);
    
    // 绘制卡片
    for (const card of this.cards) {
      this.drawCard(card);
    }
    
    // 游戏结束提示
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('恭喜过关！', width / 2, safeTop + 300);
      ctx.font = '32px sans-serif';
      ctx.fillText('总步数: ' + this.moves, width / 2, safeTop + 360);
    }
  }

  drawCard(card) {
    const ctx = this.ctx;
    const { x, y, width, height, flipped, matched, symbol, color } = card;
    
    // 卡片背景
    if (matched) {
      // 已匹配 - 显示半透明
      ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.strokeStyle = '#ccc';
    } else if (flipped) {
      // 翻开 - 显示正面
      ctx.fillStyle = color;
      ctx.strokeStyle = '#fff';
    } else {
      // 未翻开 - 显示背面
      ctx.fillStyle = '#2c3e50';
      ctx.strokeStyle = '#1a252f';
    }
    
    ctx.lineWidth = 3;
    
    // 绘制圆角矩形卡片
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 12);
    ctx.fill();
    ctx.stroke();
    
    // 绘制卡片内容
    if (flipped || matched) {
      // 正面 - 显示符号
      ctx.fillStyle = matched ? '#999' : '#fff';
      ctx.font = `bold ${Math.min(width, height) * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, x + width / 2, y + height / 2);
    } else {
      // 背面 - 显示问号
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(width, height) * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x + width / 2, y + height / 2);
      
      // 背面装饰
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 10);
      ctx.lineTo(x + width - 10, y + height - 10);
      ctx.moveTo(x + width - 10, y + 10);
      ctx.lineTo(x + 10, y + height - 10);
      ctx.stroke();
    }
    
    // 选中效果
    if (flipped && !matched) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x - 2, y - 2, width + 4, height + 4, 14);
      ctx.stroke();
    }
  }

  handleClick(pos) {
    if (this.gameOver || this.checkingMatch) return;
    
    // 找到点击的卡片
    const card = this.cards.find(c => 
      pos.x >= c.x && pos.x <= c.x + c.width &&
      pos.y >= c.y && pos.y <= c.y + c.height &&
      !c.flipped && !c.matched
    );
    
    if (!card) return;
    
    // 翻开卡片
    card.flipped = true;
    this.flippedCards.push(card);
    this.moves++;
    this.draw();
    
    // 检查是否翻开两张
    if (this.flippedCards.length === 2) {
      this.checkingMatch = true;
      
      const [card1, card2] = this.flippedCards;
      
      setTimeout(() => {
        if (card1.symbol === card2.symbol) {
          // 匹配成功
          card1.matched = true;
          card2.matched = true;
          this.matchedPairs++;
          
          if (this.matchedPairs === this.totalPairs) {
            this.gameOver = true;
          }
        } else {
          // 匹配失败，翻回去
          card1.flipped = false;
          card2.flipped = false;
        }
        
        this.flippedCards = [];
        this.checkingMatch = false;
        this.draw();
      }, 500);
    }
  }
}
