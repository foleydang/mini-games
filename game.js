/**
 * 主游戏入口 - 美化UI
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

    const cardGapH = 50;
    const cardGapV = 52;
    const paddingX = 30;

    const availableWidth = width - paddingX * 2 - cardGapH;
    const cardWidth = Math.floor(availableWidth / cols);
    const cardHeight = 140;

    const startX = paddingX;
    const startY = safeTop + 420;

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
        // 排行榜按钮 - 右上角，紧凑
        rankBtn: {
          x: cardX + cardWidth - 70,
          y: cardY + 8,
          width: 60,
          height: 32
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

    this.currentGame = new GameClass(
      this.canvas,
      this.ctx,
      this.designSize,
      (score) => this.endGame(score)
    );
  }

  endGame(score) {
    this.currentGame = null;
    RankData.addRank(this.currentRankGame || 'unknown', score, '玩家');
    this.startAnimation();
  }

  handleHomeTouch(pos) {
    // 先检查排行榜按钮（小区域优先）
    for (const card of this.cards) {
      const btn = card.rankBtn;
      if (pos.x >= btn.x && pos.x <= btn.x + btn.width &&
          pos.y >= btn.y && pos.y <= btn.y + btn.height) {
        this.showRank(card.game.id, card.game.name, card.theme);
        return;
      }
    }

    // 检查卡片主体（排除排行榜按钮区域）
    for (const card of this.cards) {
      const btn = card.rankBtn;
      // 卡片区域，但不在排行榜按钮内
      if (pos.x >= card.x && pos.x <= card.x + card.width &&
          pos.y >= card.y && pos.y <= card.y + card.height) {
        // 如果点击在排行榜按钮区域，跳过
        if (pos.x >= btn.x && pos.x <= btn.x + btn.width &&
            pos.y >= btn.y && pos.y <= btn.y + btn.height) {
          continue;
        }
        this.startGame(card.game.id);
        return;
      }
    }
  }

  handleRankTouch(pos) {
    const { width, height, safeTop, safeBottom } = this.designSize;
    
    const backButton = { 
      x: 30, 
      y: height - safeBottom - 80, 
      width: 120, 
      height: 50 
    };

    if (pos.x >= backButton.x && pos.x <= backButton.x + backButton.width &&
        pos.y >= backButton.y && pos.y <= backButton.y + backButton.height) {
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

  // 绘制渐变背景 - 更美观
  drawBg(width, height) {
    const ctx = this.ctx;
    
    // 主渐变
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#fdf4ff');
    gradient.addColorStop(0.3, '#fae8ff');
    gradient.addColorStop(0.6, '#f5d0fe');
    gradient.addColorStop(1, '#e9d5ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 添加柔和的圆形装饰
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#c4b5fd';
    // 绘制卡片背景
    ctx.arc(width * 0.2, height * 0.3, 150, 0, Math.PI * 2);
    
    ctx.fillStyle = '#a78bfa';
    // 绘制卡片背景
    ctx.arc(width * 0.8, height * 0.6, 120, 0, Math.PI * 2);
    
    ctx.fillStyle = '#8b5cf6';
    // 绘制卡片背景
    ctx.arc(width * 0.5, height * 0.8, 100, 0, Math.PI * 2);
    
    ctx.globalAlpha = 1;
  }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    // 美化背景
    this.drawBg(width, height);
    
    // 粒子
    drawParticles(this.ctx, this.particles);

    // 标题
    drawText(this.ctx, '铃铛快乐屋', width / 2, safeTop + 150, {
      fontSize: 52,
      color: '#7c3aed',
      bold: true
    });

    // 副标题
    drawText(this.ctx, '精选小游戏合集', width / 2, safeTop + 195, {
      fontSize: 28,
      color: '#a78bfa'
    });

    // 游戏卡片
    this.cards.forEach((card, index) => {
      this.drawGameCard(card, index);
    const { game, x, y, width, height, theme, rankBtn } = card;
    const ctx = this.ctx;

    // 卡片背景
    ctx.save();
    ctx.shadowColor = 'rgba(139, 92, 246, 0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, x, y, width, height, 16, '#ffffff', theme.primary, 2);
    ctx.restore();

    // 图标
    const iconX = x + 45;
    const iconY = y + height / 2;
    const iconRadius = 30;

    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    drawCircle(ctx, iconX, iconY, iconRadius, theme.primary);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    drawGameIcon(ctx, iconX, iconY, iconRadius * 0.65, '#fff', game.shape);

    // 游戏名称
    drawText(ctx, game.name, x + width * 0.50, y + height / 2 - 18, {
      fontSize: 32,
      color: '#1f2937',
      bold: true
    });

    // 游戏描述
    drawText(ctx, game.desc, x + width * 0.50, y + height / 2 + 18, {
      fontSize: 18,
      color: '#6b7280'
    });

    // 排行榜按钮
    drawButton(ctx, rankBtn.x, rankBtn.y, rankBtn.width, rankBtn.height, 
               '榜', theme.secondary, { fontSize: 20, radius: 8 });
  }
}
  drawGameCard(card, index) {
    const { game, x, y, width, height, theme, rankBtn } = card;
    const ctx = this.ctx;

    // 卡片背景
    ctx.save();
    ctx.shadowColor = 'rgba(139, 92, 246, 0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, x, y, width, height, 16, '#ffffff', theme.primary, 2);
    ctx.restore();

    // 图标
    const iconX = x + 45;
    const iconY = y + height / 2;
    const iconRadius = 30;

    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    drawCircle(ctx, iconX, iconY, iconRadius, theme.primary);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    drawGameIcon(ctx, iconX, iconY, iconRadius * 0.65, '#fff', game.shape);

    // 游戏名称
    drawText(ctx, game.name, x + width * 0.50, y + height / 2 - 18, {
      fontSize: 32,
      color: '#1f2937',
      bold: true
    });

    // 游戏描述
    drawText(ctx, game.desc, x + width * 0.50, y + height / 2 + 18, {
      fontSize: 18,
      color: '#6b7280'
    });

    // 排行榜按钮
    drawButton(ctx, rankBtn.x, rankBtn.y, rankBtn.width, rankBtn.height, 
               '榜', theme.secondary, { fontSize: 20, radius: 8 });
  }
}

new MainGame();
