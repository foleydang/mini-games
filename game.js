/**
 * 主游戏入口 - 优化UI和交互
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

    // 2列4行布局
    const cols = 2;
    const rows = 4;

    const cardGapH = 50;  // 水平间距
    const cardGapV = 35;  // 垂直间距
    const paddingX = 30;

    const availableWidth = width - paddingX * 2 - cardGapH;
    const cardWidth = Math.floor(availableWidth / cols);
    const cardHeight = 140;

    const startX = paddingX;
    // 往下挪250
    const startY = safeTop + 270;

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
        // 排行榜按钮 - 右上角，字体大
        rankBtn: {
          x: cardX + cardWidth - 75,
          y: cardY + 8,
          width: 65,
          height: 32
        }
      });
    });
  }

  initParticles() {
    const { width, height } = this.designSize;
    this.particles = [
      ...generateParticles(width, height, 15, '#8b5cf6'),
      ...generateParticles(width, height, 15, '#3b82f6')
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
      const pos = getTouchPos(e.touches[0], this.designSize);
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
    RankData.save(this.currentRankGame || 'unknown', score);
    this.startAnimation();
  }

  handleHomeTouch(pos) {
    console.log('点击位置:', pos.x, pos.y);
    
    // 先检查排行榜按钮
    for (const card of this.cards) {
      const btn = card.rankBtn;
      if (pos.x >= btn.x && pos.x <= btn.x + btn.width &&
          pos.y >= btn.y && pos.y <= btn.y + btn.height) {
        console.log('点击排行榜:', card.game.name);
        this.showRank(card.game.id, card.game.name, card.theme);
        return;
      }
    }

    // 再检查卡片主体
    for (const card of this.cards) {
      if (pos.x >= card.x && pos.x <= card.x + card.width &&
          pos.y >= card.y && pos.y <= card.y + card.height) {
        console.log('点击游戏:', card.game.name);
        this.startGame(card.game.id);
        return;
      }
    }
    
    console.log('点击无效');
  }

  handleRankTouch(pos) {
    const { width, height, safeTop, safeBottom } = this.designSize;
    
    // 返回按钮 - 左下角
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

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    // 渐变背景
    drawGradientBg(this.ctx, width, height, '#f0f4ff', '#ffffff');

    // 粒子
    drawParticles(this.ctx, this.particles);

    // 标题
    drawText(this.ctx, '铃铛快乐屋', width / 2, safeTop + 50, {
      fontSize: 52,
      color: Colors.primary,
      bold: true
    });

    // 副标题
    drawText(this.ctx, '精选小游戏合集', width / 2, safeTop + 95, {
      fontSize: 28,
      color: Colors.textLight
    });

    // 游戏卡片
    this.cards.forEach((card, index) => {
      this.drawGameCard(card, index);
    });

    // 底部提示
    drawText(this.ctx, '点击卡片开始游戏', width / 2, height - safeBottom - 35, {
      fontSize: 22,
      color: Colors.textMuted
    });
  }

  renderRank(gameName) {
    const { width, height, safeTop, safeBottom } = this.designSize;

    // 背景
    drawGradientBg(this.ctx, width, height, this.rankTheme.bg, '#ffffff');

    // 标题
    drawText(this.ctx, `${gameName}排行榜`, width / 2, safeTop + 50, {
      fontSize: 48,
      color: this.rankTheme.primary,
      bold: true
    });

    // 排行榜数据
    const startY = safeTop + 120;
    const itemHeight = 55;

    if (this.rankData.length === 0) {
      drawText(this.ctx, '暂无记录', width / 2, startY + 100, {
        fontSize: 32,
        color: Colors.textLight
      });
      drawText(this.ctx, '快去玩游戏吧！', width / 2, startY + 150, {
        fontSize: 26,
        color: Colors.textMuted
      });
    } else {
      this.rankData.forEach((item, index) => {
        const y = startY + index * itemHeight;
        
        // 排名背景
        const bgColor = index < 3 ? this.rankTheme.primary : Colors.bgGray;
        drawRoundRect(this.ctx, 30, y, width - 60, itemHeight - 10, 12, bgColor);

        // 排名数字
        const rankColor = index < 3 ? '#fff' : Colors.textDark;
        drawText(this.ctx, `${index + 1}`, 70, y + 28, {
          fontSize: 28,
          color: rankColor,
          bold: true
        });

        // 分数
        drawText(this.ctx, `${item.score}`, width - 100, y + 28, {
          fontSize: 28,
          color: rankColor,
          bold: true
        });

        // 日期
        if (item.date) {
          drawText(this.ctx, item.date, width / 2, y + 28, {
            fontSize: 20,
            color: rankColor
          });
        }
      });
    }

    // 返回按钮 - 左下角
    const backX = 30;
    const backY = height - safeBottom - 80;
    drawButton(this.ctx, backX, backY, 120, 50, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });
  }

  drawGameCard(card, index) {
    const { game, x, y, width, height, theme, rankBtn } = card;

    // 卡片背景
    drawGameCardBg(this.ctx, x, y, width, height, theme);

    // 图标区域 - 左侧居中
    const iconX = x + 45;
    const iconY = y + height / 2;
    const iconRadius = 30;

    // 图标阴影
    this.ctx.shadowColor = 'rgba(0,0,0,0.1)';
    this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetY = 2;
    drawCircle(this.ctx, iconX, iconY, iconRadius, theme.primary);
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    // 绘制图标
    drawGameIcon(this.ctx, iconX, iconY, iconRadius * 0.65, '#fff', game.shape);

    // 游戏名称 - 右侧居中
    drawText(this.ctx, game.name, x + width * 0.58, y + height / 2 - 18, {
      fontSize: 32,
      color: Colors.textDark,
      bold: true
    });

    // 游戏描述 - 名称下方
    drawText(this.ctx, game.desc, x + width * 0.58, y + height / 2 + 18, {
      fontSize: 18,
      color: Colors.textLight
    });

    // 排行榜按钮 - 右上角，字体24
    drawButton(this.ctx, rankBtn.x, rankBtn.y, rankBtn.width, rankBtn.height, 
               '排行榜', theme.secondary, { fontSize: 24, radius: 10 });
  }
}

new MainGame();
