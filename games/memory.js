// 翻牌配对游戏
import { Colors, drawRoundRect, drawButton, drawText, drawGradientBg, completeLevel, saveLevelStars } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';
import { audioManager } from '../common/audio.js';
import { Levels, MemorySymbols } from '../common/config.js';
import LevelResult from '../common/level-result.js';

export default class MemoryGame {
  constructor(canvas, ctx, designSize, onEnd, level = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'memory';
    this.currentLevel = level;
    
    this.levels = Levels.memory;
    this.currentLevel = Math.max(0, Math.min(level, this.levels.length - 1));

    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.gameOver = false;
    this.win = false;
    this.result = null;
    this.checkingMatch = false;
    this.soundEnabled = audioManager.soundEnabled;
    this.timer = null;

    // 按钮配置
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);

    this.cardColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F7DC6F', '#BB8FCE',
                       '#FF9F43', '#54A0FF', '#5F27CD', '#00D2D3', '#EE5253', '#10AC84', '#F368E0'];
    this.symbols = MemorySymbols;

    this.applyLevelConfig();
    this.initGame();
  }

  applyLevelConfig() {
    const cfg = this.levels[this.currentLevel] || this.levels[0];
    this.cols = cfg.cols;
    this.rows = cfg.rows;
    this.totalPairs = cfg.pairs;
    this.timeLimit = cfg.timeLimit || 60;
    this.levelName = cfg.name || `第${this.currentLevel + 1}关`;
  }

  initGame() {
    const { width, safeTop, safeBottom, height } = this.designSize;

    // 使用关卡配置的行列(之前被硬编码为 4x4,导致所有关卡一样)
    const cols = this.cols;
    const rows = this.rows;

    const gameAreaTop = safeTop + 250;
    const gameAreaBottom = height - safeBottom - 40;
    const gameAreaHeight = gameAreaBottom - gameAreaTop;

    const padding = 20;
    const gap = 12;
    // 正方形卡片:取宽高中较小值,保证不同行列都能放下
    const maxCardW = (width - padding * 2 - gap * (cols - 1)) / cols;
    const maxCardH = (gameAreaHeight - gap * (rows - 1)) / rows;
    const cardSize = Math.floor(Math.min(maxCardW, maxCardH));
    const cardWidth = cardSize;
    const cardHeight = cardSize;

    // 整体居中
    const gridW = cols * cardWidth + gap * (cols - 1);
    const gridH = rows * cardHeight + gap * (rows - 1);
    const startX = (width - gridW) / 2;
    const startY = gameAreaTop + (gameAreaHeight - gridH) / 2;
    
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
        x: startX + col * (cardWidth + gap),
        y: startY + row * (cardHeight + gap),
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
    this.win = false;
    this.result = null;
    this.checkingMatch = false;
    this.timeLeft = this.timeLimit;

    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this._lastTs = null;

    this.startTimer();
    this.draw();
  }

  // 翻面动画:横向缩放到 0 再回到 1,中点切换正反面(像扑克牌被翻开)
  startFlip(card, toFront) {
    card.anim = {
      t: 0,
      dur: 260,
      frontStart: !toFront, // 翻开:先背面;翻回:先正面
      frontEnd: toFront
    };
    this.ensureAnimLoop();
  }

  ensureAnimLoop() {
    if (this.rafId) return;
    this._lastTs = null;
    const step = (ts) => {
      if (this._lastTs == null) this._lastTs = ts;
      const dt = ts - this._lastTs;
      this._lastTs = ts;
      let active = false;
      for (const c of this.cards) {
        if (!c.anim) continue;
        c.anim.t += dt;
        if (c.anim.t >= c.anim.dur) c.anim = null;
        else active = true;
      }
      this.draw();
      this.rafId = active ? requestAnimationFrame(step) : null;
    };
    this.rafId = requestAnimationFrame(step);
  }

  startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.gameOver) return;
      this.timeLeft -= 0.25;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.finish(false);
      }
      this.draw();
    }, 250);
  }

  destroy() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  finish(win) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.win = win;
    // 耗时 = 预算时间 - 剩余时间 (秒转毫秒)
    const timeMs = win ? Math.round((this.timeLimit - this.timeLeft) * 1000) : 0;
    const hasNext = win && this.currentLevel < this.levels.length - 1;
    // 星级:步数效率(完美步数 = 对数×2)
    const perfect = this.totalPairs * 2;
    const ratio = perfect > 0 ? this.moves / perfect : 1;
    const stars = ratio <= 1.8 ? 3 : ratio <= 2.6 ? 2 : 1;
    if (win) {
      completeLevel(this.gameId, this.currentLevel, { timeMs, stars });
      saveLevelStars(this.gameId, this.currentLevel, stars);
      audioManager.play && audioManager.play('levelup');
    }
    this.result = new LevelResult(this.designSize, {
      win,
      score: this.moves,
      scoreLabel: '步数',
      levelName: this.levelName,
      hasNext,
      stars,
      primaryColor: '#7c3aed'
    });
    this.draw();
  }

  nextLevel() {
    this.currentLevel = Math.min(this.currentLevel + 1, this.levels.length - 1);
    this.applyLevelConfig();
    this.initGame();
  }

  retry() {
    this.applyLevelConfig();
    this.initGame();
  }

  draw() {
    const ctx = this.ctx;
    const { width, safeTop, height, safeBottom } = this.designSize;
    
    ctx.clearRect(0, 0, width, height);
    drawGradientBg(ctx, width, height, '#f0f9ff', '#e0f2fe', '#06b6d4' + '11');
    
    drawText(ctx, '翻牌配对', width / 2, safeTop + 80, { fontSize: 48, color: '#7c3aed', bold: true });
    drawText(ctx, `第${this.currentLevel + 1}关 · 步数: ${this.moves}  配对: ${this.matchedPairs}/${this.totalPairs}`, width / 2, safeTop + 135, { fontSize: 24, color: '#4b5563' });

    // 倒计时条
    const remain = Math.max(0, this.timeLeft || 0);
    const ratio = this.timeLimit > 0 ? remain / this.timeLimit : 0;
    const barW = width - 100;
    const barX = 50;
    const barY = safeTop + 165;
    drawRoundRect(ctx, barX, barY, barW, 14, 7, '#e5e7eb');
    const barColor = ratio > 0.3 ? '#10b981' : '#ef4444';
    if (ratio > 0) drawRoundRect(ctx, barX, barY, barW * ratio, 14, 7, barColor);
    drawText(ctx, `⏱ ${Math.ceil(remain)}s`, width / 2, barY + 32, { fontSize: 22, color: barColor, bold: true });

    // 底部按钮（返回在左边）
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);

    for (const card of this.cards) this.drawCard(card);

    if (this.gameOver && this.result) this.result.draw(ctx);
  }

  drawCard(card) {
    const ctx = this.ctx;
    const { x, y, width, height, flipped, matched, symbol, color } = card;
    const cx = x + width / 2;
    const cy = y + height / 2;

    // 翻面动画:横向缩放 |cos|,中点切面
    let scaleX = 1;
    let showFront = flipped || matched;
    if (card.anim) {
      const t = Math.min(1, card.anim.t / card.anim.dur);
      scaleX = Math.abs(Math.cos(t * Math.PI));
      showFront = t < 0.5 ? card.anim.frontStart : card.anim.frontEnd;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX < 0.02 ? 0.02 : scaleX, 1);
    ctx.translate(-cx, -cy);

    let bgColor, strokeColor;
    if (matched) {
      bgColor = 'rgba(200, 200, 200, 0.3)';
      strokeColor = '#ccc';
    } else if (showFront) {
      bgColor = color;
      strokeColor = '#fff';
    } else {
      bgColor = '#2c3e50';
      strokeColor = '#1a252f';
    }

    drawRoundRect(ctx, x, y, width, height, 12, bgColor, strokeColor, 3);

    ctx.fillStyle = matched ? '#999' : '#fff';
    ctx.font = `bold ${Math.min(width, height) * 0.45}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(showFront || matched ? symbol : '?', cx, cy);

    // 选中高亮(仅静止翻开且未匹配时)
    if (!card.anim && flipped && !matched) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.rect(x - 2, y - 2, width + 4, height + 4);
      ctx.stroke();
    }

    ctx.restore();
  }

  onTouchStart(pos) {
    if (this.gameOver && this.result) {
      const action = this.result.onTouchStart(pos);
      if (action === 'next') this.nextLevel();
      else if (action === 'replay' || action === 'retry') this.retry();
      else if (action === 'back') { this.destroy(); this.onEnd({ score: this.moves, passed: this.win }); }
      return;
    }

    // 检测按钮点击
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') {
      this.destroy();
      this.onEnd({ score: this.moves, passed: false });
      return;
    }
    if (btn === 'shareBtn') {
      return;
    }
    if (btn === 'soundBtn') {
      audioManager.toggleSound();
      this.soundEnabled = audioManager.soundEnabled;
      this.draw();
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
    this.startFlip(card, true);

    if (this.flippedCards.length === 2) {
      this.checkingMatch = true;
      const [card1, card2] = this.flippedCards;

      setTimeout(() => {
        if (card1.symbol === card2.symbol) {
          card1.matched = true;
          card2.matched = true;
          this.matchedPairs++;
          if (this.matchedPairs === this.totalPairs) { this.flippedCards = []; this.checkingMatch = false; this.finish(true); return; }
          this.draw();
        } else {
          card1.flipped = false;
          card2.flipped = false;
          this.startFlip(card1, false);
          this.startFlip(card2, false);
        }
        this.flippedCards = [];
        this.checkingMatch = false;
      }, 600);
    }
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}
}
