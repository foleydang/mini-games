/**
 * 主游戏入口
 */
import {
  getDesignSize, Colors, drawGradientBg, drawGameCardBg, drawButton,
  drawText, drawParticles, generateParticles, updateParticles,
  getTouchPos, Storage, RankData, shareGame, drawCircle, drawRoundRect,
  drawGameIcon
} from './common/utils.js';
import { Games } from './common/config.js';
import Match3Game from './games/match3.js';
import SnakeGame from './games/snake.js';
import Game2048 from './games/2048.js';
import TetrisGame from './games/tetris.js';
import FlappyGame from './games/flappy.js';
import BreakoutGame from './games/breakout.js';
import MemoryGame from './games/memory.js';
import BounceGame from './games/bounce.js';

class MainGame {
  constructor() {
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    this.designSize = getDesignSize();

    this.canvas.width = this.designSize.width;
    this.canvas.height = this.designSize.height;

    this.currentGame = null;
    this.cards = [];
    this.showingRank = false;
    this.currentRankGame = null;
    this.rankData = [];
    this.particles = [];
    this.animFrame = 0;

    this.initCards();
    this.initParticles();
    this.bindEvents();
    this.startAnimation();
  }

  initCards() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    const cols = 2;
    const rows = 4;
    const cardGapH = 40;
    const cardGapV = 80;  // 卡片高度100+按钮36+偏移5，间距80更舒展
    const paddingX = 30;

    const availableWidth = width - paddingX * 2 - cardGapH;
    const cardWidth = Math.floor(availableWidth / cols);
    const cardHeight = 100;

    const startX = paddingX;
    const startY = safeTop + 320;

    Games.forEach((game, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const theme = Colors.themes[game.id] || {
        primary: '#8b5cf6',
        secondary: '#c4b5fd',
        bg: '#f5f3ff',
        pattern: '#ede9fe'
      };

      const cardX = startX + col * (cardWidth + cardGapH);
      const cardY = startY + row * (cardHeight + cardGapV);

      this.cards.push({
        game,
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        theme,
        // 排行榜按钮区域：在卡片下方（完全不覆盖卡片主体）
        rankBtn: {
          x: cardX + 20,
          y: cardY + cardHeight + 5,  // 卡片下方8单位
          width: cardWidth - 40,
          height: 36  // 按钮高度36，加上偏移8，间距60足够
        }
      });
    });
  }

  initParticles() {
    const { width, height } = this.designSize;
    this.particles = [
      ...generateParticles(width, height, 20, '#a78bfa'),
      ...generateParticles(width, height, 20, '#60a5fa'),
      ...generateParticles(width, height, 15, '#f472b6')
    ];
  }

  bindEvents() {
    wx.onTouchStart((e) => {
      const pos = getTouchPos(e.touches[0], this.designSize);
      if (this.showingRank) {
        this.handleRankTouch(pos);
      } else if (this.currentGame) {
        this.currentGame.onTouchStart(pos);
      } else {
        this.handleHomeTouch(pos);
      }
    });

    wx.onTouchMove((e) => {
      const pos = getTouchPos(e.touches[0], this.designSize);
      if (!this.showingRank && this.currentGame) {
        this.currentGame.onTouchMove(pos);
      }
    });

    wx.onTouchEnd((e) => {
      const pos = getTouchPos(e.changedTouches[0], this.designSize);
      if (!this.showingRank && this.currentGame) {
        this.currentGame.onTouchEnd(pos);
      }
    });
  }

  startAnimation() {
    const animate = () => {
      if (this.currentGame || this.showingRank) return;
      this.animFrame++;
      updateParticles(this.particles);
      this.render();
      requestAnimationFrame(animate);
    };
    animate();
  }

  startGame(gameId) {
    // 记录当前游戏ID，用于保存分数到排行榜
    this.currentRankGame = gameId;
    const gameClasses = {
      match3: Match3Game,
      snake: SnakeGame,
      2048: Game2048,
      tetris: TetrisGame,
      flappy: FlappyGame,
      breakout: BreakoutGame,
      memory: MemoryGame,
      bounce: BounceGame
    };
    const GameClass = gameClasses[gameId];
    if (!GameClass) return;
    this.currentGame = new GameClass(this.canvas, this.ctx, this.designSize, (score) => this.endGame(score));
  }

  endGame(score) {
    this.currentGame = null;
    RankData.addRank(this.currentRankGame || 'unknown', score, '玩家');
    this.startAnimation();
  }

  handleHomeTouch(pos) {
    console.log('点击位置:', pos.x, pos.y);
    // 检查每个卡片
    for (const card of this.cards) {
      console.log('卡片:', card.game.name, '范围:', card.x, card.y, card.width, card.height, '按钮:', card.rankBtn);
      
      // 先检查是否在排行榜按钮区域（优先检测）
      const btn = card.rankBtn;
      if (pos.x >= btn.x && pos.x <= btn.x + btn.width &&
          pos.y >= btn.y && pos.y <= btn.y + btn.height) {
        console.log('点击排行榜:', card.game.name);
        this.showRank(card.game.id, card.game.name, card.theme);
        return;
      }
      
      // 再检查是否在卡片范围内（启动游戏）
      if (pos.x >= card.x && pos.x <= card.x + card.width &&
          pos.y >= card.y && pos.y <= card.y + card.height) {
        console.log('启动游戏:', card.game.name);
        this.startGame(card.game.id);
        return;
      }
    }
    console.log('点击未命中任何卡片');
  }

  handleRankTouch(pos) {
    const { safeTop } = this.designSize;
    // 返回按钮在左上角（更大更容易点击）
    const backButton = { x: 30, y: safeTop + 110, width: 140, height: 50 };
    console.log('排行榜点击:', pos.x, pos.y, '返回按钮:', backButton);
    if (pos.x >= backButton.x && pos.x <= backButton.x + backButton.width && 
        pos.y >= backButton.y && pos.y <= backButton.y + backButton.height) {
      console.log('点击返回按钮，退出排行榜');
      this.showingRank = false;
      this.currentRankGame = null;
      this.startAnimation();
    }
  }

  showRank(gameId, gameName, theme) {
    this.showingRank = true;
    this.currentRankGame = gameId;
    this.rankTheme = theme;
    this.rankData = RankData.getRank(gameId);
    this.renderRank(gameName);
  }

  drawBg(width, height) {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#fdf4ff');
    gradient.addColorStop(0.5, '#fae8ff');
    gradient.addColorStop(1, '#e9d5ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#c4b5fd';
    ctx.beginPath();
    ctx.arc(width * 0.2, height * 0.3, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.6, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    this.drawBg(width, height);
    drawParticles(this.ctx, this.particles);

    drawText(this.ctx, '铃铛快乐屋', width / 2, safeTop + 150, { fontSize: 52, color: '#7c3aed', bold: true });
    drawText(this.ctx, '精选小游戏合集', width / 2, safeTop + 195, { fontSize: 28, color: '#a78bfa' });

    this.cards.forEach((card, index) => this.drawGameCard(card, index));

    drawText(this.ctx, '点击卡片开始游戏', width / 2, height - safeBottom - 35, { fontSize: 22, color: '#c4b5fd' });
  }

  renderRank(gameName) {
    const { width, height, safeTop, safeBottom } = this.designSize;
    this.drawBg(width, height);

    drawText(this.ctx, `${gameName}排行榜`, width / 2, safeTop + 50, { fontSize: 48, color: this.rankTheme.primary, bold: true });

    const startY = safeTop + 260;
    const itemHeight = 55;

    if (this.rankData.length === 0) {
      drawText(this.ctx, '暂无记录', width / 2, startY + 100, { fontSize: 32, color: Colors.textLight });
      drawText(this.ctx, '快去玩游戏吧！', width / 2, startY + 150, { fontSize: 26, color: Colors.textMuted });
    } else {
      this.rankData.forEach((item, index) => {
        const y = startY + index * itemHeight;
        const bgColor = index < 3 ? this.rankTheme.primary : '#f3e8ff';
        drawRoundRect(this.ctx, 30, y, width - 60, itemHeight - 10, 12, bgColor);
        const rankColor = index < 3 ? '#fff' : '#5b21b6';
        drawText(this.ctx, `${index + 1}`, 70, y + 28, { fontSize: 28, color: rankColor, bold: true });
        drawText(this.ctx, `${item.score}`, width - 100, y + 28, { fontSize: 28, color: rankColor, bold: true });
        if (item.date) {
          drawText(this.ctx, item.date, width / 2, y + 28, { fontSize: 28, color: rankColor });
        }
      });
    }

    // 返回按钮在左上角（更大更容易点击）
    // 返回按钮在左上角（140x50）
    drawButton(this.ctx, 30, safeTop + 110, 140, 50, '← 返回', '#dc2626', { fontSize: 32, radius: 16 });
  }

  drawGameCard(card, index) {
    const { game, x, y, width, height, theme, rankBtn } = card;
    const ctx = this.ctx;

    ctx.save();
    ctx.shadowColor = 'rgba(139, 92, 246, 0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, x, y, width, height, 16, '#ffffff', theme.primary, 2);
    ctx.restore();

    // 卡片内容居中（高度100）
    const centerY = y + height / 2;
    
    // 游戏图标在左侧
    const iconX = x + 40;
    const iconRadius = 25;

    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    drawCircle(ctx, iconX, centerY, iconRadius, theme.primary);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    drawGameIcon(ctx, iconX, centerY, iconRadius * 0.65, '#fff', game.shape);

    // 游戏名称和描述在右侧（居中）
    drawText(ctx, game.name, x + width * 0.55, centerY - 10, { fontSize: 30, color: '#1f2937', bold: true });
    drawText(ctx, game.desc, x + width * 0.55, centerY + 20, { fontSize: 20, color: '#6b7280' });

    // 排行榜按钮在卡片下方
    drawButton(ctx, rankBtn.x, rankBtn.y, rankBtn.width, rankBtn.height, '排行榜', theme.secondary, { fontSize: 24, radius: 12 });
  }
}

new MainGame();
