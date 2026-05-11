/**
 * 主游戏入口 - 鲜明活力风格
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

    const headerHeight = 140;
    const footerHeight = 50;
    const cardGap = 60; // 卡片之间的间隙
    const paddingX = 28;

    const availableWidth = width - paddingX * 2 - cardGap;
    const cardWidth = Math.floor(availableWidth / cols);

    // 卡片高度增大到160，给内容足够空间
    const cardHeight = 160;

    const startX = paddingX;
    const startY = safeTop + headerHeight + 100 + 150; // 往下移

    Games.forEach((game, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const theme = Colors.themes[game.id] || {
        primary: '#8b5cf6',
        secondary: '#c4b5fd',
        bg: '#f5f3ff',
        pattern: '#ede9fe'
      };

      const cardX = startX + col * (cardWidth + cardGap);
      const cardY = startY + row * (cardHeight + cardGap);

      this.cards.push({
        game,
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        theme,
        // 排行榜按钮在底部，与上方内容分离
        rankBtn: {
          x: cardX + 15,
          y: cardY + cardHeight - 38,
          width: cardWidth - 30,
          height: 28
        }
      });
    });
  }

  initParticles() {
    const { width, height } = this.designSize;
    this.particles = [
      ...generateParticles(width, height, 20, '#8b5cf6'),
      ...generateParticles(width, height, 20, '#3b82f6')
    ];
  }

  startAnimation() {
    this.timer = setInterval(() => {
      this.animFrame++;
      updateParticles(this.particles, this.designSize.width, this.designSize.height);
      if (!this.currentGame && !this.showingRank) {
        this.render();
      }
    }, 50);
  }

  bindEvents() {
    wx.onTouchStart((e) => {
      const pos = getTouchPos(e.touches[0], this.designSize);
      if (this.currentGame) {
        this.currentGame.onTouchStart(pos);
      } else if (this.showingRank) {
        this.handleRankTouch(pos);
      } else {
        this.handleHomeTouch(pos);
      }
    });

    wx.onTouchMove((e) => {
      const pos = getTouchPos(e.touches[0], this.designSize);
      if (this.currentGame) {
        this.currentGame.onTouchMove(pos);
      }
    });

    wx.onTouchEnd((e) => {
      const pos = getTouchPos(e.changedTouches[0], this.designSize);
      if (this.currentGame) {
        this.currentGame.onTouchEnd(pos);
      }
    });

    wx.onShareAppMessage(() => ({
      title: '来铃铛快乐屋一起玩游戏吧！',
      path: '/game.js',
      imageUrl: ''
    }));
  }

  handleHomeTouch(pos) {
    for (const card of this.cards) {
      // 点击游戏区域（排除排行榜按钮区域）
      if (pos.x >= card.x && pos.x <= card.x + card.width &&
          pos.y >= card.y && pos.y <= card.y + card.height - 38) {
        this.startGame(card.game.id);
        return;
      }
      // 点击排行榜按钮
      if (pos.x >= card.rankBtn.x && pos.x <= card.rankBtn.x + card.rankBtn.width &&
          pos.y >= card.rankBtn.y && pos.y <= card.rankBtn.y + card.rankBtn.height) {
        this.showRank(card.game.id, card.game.name, card.theme);
        return;
      }
    }
  }

  handleRankTouch(pos) {
    const { width, safeTop } = this.designSize;
    const backButton = { x: width - 150, y: safeTop + 18, width: 130, height: 52 };

    if (pos.x >= backButton.x && pos.x <= backButton.x + backButton.width &&
        pos.y >= backButton.y && pos.y <= backButton.y + backButton.height) {
      this.showingRank = false;
      this.currentRankGame = null;
      this.render();
    }
  }

  showRank(gameId, gameName, theme) {
    this.showingRank = true;
    this.currentRankGame = gameId;
    this.rankTheme = theme;
    this.rankData = RankData.getRank(gameId);
    this.renderRank(gameName);
  }

  renderRank(gameName) {
    const { width, height, safeTop, safeBottom } = this.designSize;

    drawGradientBg(this.ctx, width, height, this.rankTheme.bg, '#ffffff');

    // 返回按钮 - 放在右上角避开胶囊按钮
    drawButton(this.ctx, width - 150, safeTop + 18, 130, 52, '← 返回', Colors.danger, { fontSize: 32, radius: 16 });

    // 标题
    drawText(this.ctx, '排行榜', width / 2, safeTop + 90, {
      fontSize: 48,
      color: this.rankTheme.primary,
      bold: true
    });

    drawText(this.ctx, gameName, width / 2, safeTop + 130, {
      fontSize: 26,
      color: Colors.textLight
    });

    // 排行列表区域 - 高度适中
    const listTop = safeTop + 165;
    const listHeight = height - safeTop - safeBottom - listTop - 25;
    const itemHeight = 60;
    const itemGap = 12;

    // 添加圆角背景框
    drawRoundRect(this.ctx, 30, listTop, width - 60, listHeight, 18, '#fff', this.rankTheme.primary, 3);

    if (this.rankData.length === 0) {
      drawText(this.ctx, '暂无记录', width / 2, listTop + listHeight / 2 - 15, {
        fontSize: 34,
        color: Colors.textLight
      });
      drawText(this.ctx, '开始游戏创建记录', width / 2, listTop + listHeight / 2 + 25, {
        fontSize: 24,
        color: Colors.textMuted
      });
    } else {
      const maxItems = Math.min(this.rankData.length, 8);
      const startY = listTop + 20;

      this.rankData.slice(0, maxItems).forEach((item, i) => {
        const y = startY + i * (itemHeight + itemGap);

        const medalColor = i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : null;

        // 每条记录背景
        const bgColor = i === 0 ? '#fef3c7' : i === 1 ? '#f3f4f6' : i === 2 ? '#fef2f2' : '#fafafa';
        drawRoundRect(this.ctx, 50, y, width - 100, itemHeight, 10, bgColor);

        // 排名
        const rankText = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}`;
        drawText(this.ctx, rankText, 80, y + itemHeight / 2, {
          fontSize: 28,
          color: i < 3 ? medalColor : Colors.textLight,
          bold: true
        });

        // 分数
        drawText(this.ctx, `${item.score}`, width / 2, y + itemHeight / 2, {
          fontSize: 32,
          color: Colors.text,
          bold: true
        });

        // 时间
        const timeStr = this.formatTime(item.time);
        drawText(this.ctx, timeStr, width - 80, y + itemHeight / 2, {
          fontSize: 22,
          color: Colors.textMuted,
          align: 'right'
        });
      });
    }
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  startGame(gameId) {
    const callback = (score) => {
      if (score > 0) RankData.addRank(gameId, score);
      this.currentGame = null;
      this.initParticles();
    };

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
    if (GameClass) {
      this.currentGame = new GameClass(this.canvas, this.ctx, this.designSize, callback);
    }
  }

  render() {
    if (this.currentGame || this.showingRank) return;

    const { width, height, safeTop, safeBottom } = this.designSize;

    drawGradientBg(this.ctx, width, height, '#f0f4f8', '#ffffff');

    drawParticles(this.ctx, this.particles);

    // 标题区 - 向下偏移
    drawText(this.ctx, '铃铛快乐屋', width / 2, safeTop + 55 + 150, {
      fontSize: 50,
      color: Colors.textDark,
      bold: true
    });

    drawText(this.ctx, '选择游戏开始玩耍', width / 2, safeTop + 100 + 150, {
      fontSize: 26,
      color: Colors.textLight
    });

    // 游戏卡片
    this.cards.forEach((card, index) => {
      this.drawGameCard(card, index);
    });

    // 底部
    drawText(this.ctx, '点击卡片进入游戏', width / 2, height - safeBottom - 28, {
      fontSize: 22,
      color: Colors.textMuted
    });
  }

  drawGameCard(card, index) {
    const { game, x, y, width, height, theme, rankBtn } = card;

    // 游戏专属背景
    drawGameCardBg(this.ctx, x, y, width, height, theme);

    // 图标和名字水平布局
    const centerY = y + height * 0.38;
    const iconX = x + 55;
    const iconRadius = 38;

    // 圆形背景阴影
    this.ctx.shadowColor = 'rgba(0,0,0,0.12)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetY = 3;

    drawCircle(this.ctx, iconX, centerY, iconRadius, theme.primary);

    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    // 绘制几何图标
    drawGameIcon(this.ctx, iconX, centerY, iconRadius * 0.65, '#fff', game.shape);

    // 游戏名称 - 在图标右边
    drawText(this.ctx, game.name, x + width * 0.58, centerY - 15, {
      fontSize: 36,
      color: Colors.textDark,
      bold: true
    });

    // 游戏描述 - 名字下方，间距增大
    drawText(this.ctx, game.desc, x + width * 0.58, centerY + 28, {
      fontSize: 22,
      color: Colors.textLight
    });

    // 排行榜按钮 - 字体更大
    drawButton(this.ctx, rankBtn.x, rankBtn.y, rankBtn.width, rankBtn.height, '排行榜', theme.secondary, { fontSize: 26, radius: 12 });
  }
}

new MainGame();