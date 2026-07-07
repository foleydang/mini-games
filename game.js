/**
 * 主游戏入口 - 铃铛快乐屋
 */
import {
  getDesignSize, Colors, drawGradientBg, drawGameCardBg, drawButton,
  drawText, drawParticles, generateParticles, updateParticles,
  getTouchPos, Storage, RankData, shareGame, drawCircle, drawRoundRect,
  drawGameIcon, GameSettings, drawToggle
} from './common/utils.js';
import { Games, Levels } from './common/config.js';
import { getUserInfo, createUserInfoButton, destroyUserInfoButton, drawAvatar, isAuthorized } from './common/userInfo.js';
import { syncUserToServer } from './common/utils.js';
import { ModernThemes, drawModernButton, drawModernCard, drawModernNavbar, drawModernTag, drawModernProgress } from './common/modern-ui.js';
import LevelSelector from './common/level-selector.js';
import { themeManager } from './common/theme-manager.js';
import Match3Game from './games/match3.js';
import SnakeGame from './games/snake.js';
import Game2048 from './games/2048.js';
import TetrisGame from './games/tetris.js';
import FlappyGame from './games/flappy.js';
import BreakoutGame from './games/breakout.js';
import MemoryGame from './games/memory.js';
import BounceGame from './games/bounce.js';
import SheepGame from './games/sheep.js';
import FruitGame from './games/fruit.js';

class MainGame {
  constructor() {
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    this.designSize = getDesignSize();

    this.canvas.width = this.designSize.width;
    this.canvas.height = this.designSize.height;

    // 状态管理
    this.currentGame = null;
    this.cards = [];
    this.showingRank = false;
    this.showingSettings = false;
    this.showingLevelSelect = false;
    this.currentRankGame = null;
    this.currentLevelSelectGame = null;
    this.rankData = [];
    this.settings = GameSettings.get();
    this.particles = [];
    this.animFrame = 0;
    
    // 现代化UI组件
    this.levelSelector = null;
    
    // 主题系统
    this.currentTheme = themeManager.getCurrentTheme();
    this.currentGameTheme = themeManager.getCurrentGameTheme();
    
    // 用户数据
    this.avatarCache = {};  // 头像图片缓存
    this.showingProfile = false;  // 显示个人设置页
    this.myProfile = this.loadProfile();  // 用户个人设置
    this.profileAvatars = [];  // 预设头像列表
    this.selectedAvatarIndex = 0;
    this.editingNickname = false;
    
    // 初始化
    this.initCards();
    this.initParticles();
    this.bindEvents();
    this.startAnimation();
  }


  // 加载用户设置
  loadProfile() {
    try {
      const saved = wx.getStorageSync('myProfile');
      return saved || { nickname: '玩家', avatarIndex: 0, avatarColor: '#7c3aed' };
    } catch (e) {
      return { nickname: '玩家', avatarIndex: 0, avatarColor: '#7c3aed' };
    }
  }

  // 保存用户设置（本地 + 服务器）
  saveProfile(profile) {
    this.myProfile = profile;
    try {
      wx.setStorageSync('myProfile', profile);
    } catch (e) {}
    // 同步到服务器
    syncUserToServer(profile);
  }

  initCards() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    const cols = 2;
    const rows = 4;
    const cardGapH = 40;
    const cardGapV = 80;
    const paddingX = 30;

    const availableWidth = width - paddingX * 2 - cardGapH;
    const cardWidth = Math.floor(availableWidth / cols);
    const cardHeight = 120;

    const startX = paddingX;
    const startY = safeTop + 320;

    Games.forEach((game, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      // 使用现代化主题
      const theme = ModernThemes.gameThemes[game.id] || ModernThemes.gameThemes.match3;

      const cardX = startX + col * (cardWidth + cardGapH);
      const cardY = startY + row * (cardHeight + cardGapV);

      this.cards.push({
        game,
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        theme,
        rankBtn: {
          x: cardX + 20,
          y: cardY + cardHeight + 5,
          width: cardWidth - 40,
          height: 36
        },
        playBtn: {
          x: cardX + 20,
          y: cardY + cardHeight + 50,
          width: cardWidth - 40,
          height: 36
        }
      });
    });

    // 设置按钮位置
    this.settingsBtn = {
      x: width - 120,
      y: safeTop + 165,
      width: 90,
      height: 45
    };
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
      if (this.showingLevelSelect && this.levelSelector) {
        this.levelSelector.onTouchStart(pos);
        if (this.levelSelector.shouldBack) {
          this.showingLevelSelect = false;
          this.levelSelector = null;
          this.startAnimation();
        }
        return;
      }
      if (this.showingProfile) {
        this.handleProfileTouch(pos);
      } else if (this.showingSettings) {
        this.handleSettingsTouch(pos);
      } else if (this.showingRank) {
        this.handleRankTouch(pos);
      } else if (this.currentGame) {
        this.currentGame.onTouchStart(pos);
      } else {
        this.handleHomeTouch(pos);
      }
    });

    wx.onTouchMove((e) => {
      const pos = getTouchPos(e.touches[0], this.designSize);
      if (!this.showingSettings && !this.showingRank && this.currentGame) {
        this.currentGame.onTouchMove(pos);
      }
    });

    wx.onTouchEnd((e) => {
      const pos = getTouchPos(e.changedTouches[0], this.designSize);
      if (!this.showingSettings && !this.showingRank && this.currentGame) {
        this.currentGame.onTouchEnd(pos);
      }
    });
  }

  startAnimation() {
    const animate = () => {
      if (this.currentGame || this.showingRank || this.showingSettings || this.showingProfile || this.showingLevelSelect) return;
      this.animFrame++;
      updateParticles(this.particles);
      this.render();
      requestAnimationFrame(animate);
    };
    animate();
  }

  showLevelSelect(gameId) {
    this.showingLevelSelect = true;
    this.currentLevelSelectGame = gameId;
    this.levelSelector = new LevelSelector(
      gameId,
      this.designSize,
      (level) => this.startGameWithLevel(gameId, level),
      () => {
        this.showingLevelSelect = false;
        this.levelSelector = null;
        this.startAnimation();
      }
    );
    // 立即渲染关卡选择器
    const animate = () => {
      if (!this.showingLevelSelect) return;
      this.levelSelector.draw(this.ctx);
      requestAnimationFrame(animate);
    };
    animate();
  }

  startGameWithLevel(gameId, level) {
    this.showingLevelSelect = false;
    this.levelSelector = null;
    this.currentRankGame = gameId;
    this.currentLevel = level;
    const gameClasses = {
      match3: Match3Game,
      snake: SnakeGame,
      2048: Game2048,
      tetris: TetrisGame,
      flappy: FlappyGame,
      breakout: BreakoutGame,
      memory: MemoryGame,
      bounce: BounceGame,
      sheep: SheepGame,
      fruit: FruitGame
    };
    const GameClass = gameClasses[gameId];
    if (!GameClass) return;
    // 关卡型游戏传 level 参数，无限型不传
    const gameConfig = Games.find(g => g.id === gameId);
    if (gameConfig && gameConfig.type === 'levels') {
      this.currentGame = new GameClass(this.canvas, this.ctx, this.designSize, (score) => this.endGame(score), level);
    } else {
      this.currentGame = new GameClass(this.canvas, this.ctx, this.designSize, (score) => this.endGame(score));
    }
  }

  startGame(gameId) {
    this.currentRankGame = gameId;
    this.startGameWithLevel(gameId, 0);
  }

  endGame(score) {
    this.currentGame = null;
    RankData.addRank(this.currentRankGame || 'unknown', score, '玩家');
    
    // 关卡型游戏：检查是否过关，推进关卡进度
    if (this.currentLevel !== undefined && this.currentRankGame) {
      const gameConfig = Games.find(g => g.id === this.currentRankGame);
      if (gameConfig && gameConfig.type === 'levels') {
        // 简单判定：分数 > 0 视为过关（各游戏可自定义过关条件）
        if (score > 0) {
          const savedLevel = Storage.load(`${this.currentRankGame}_level`) || 0;
          if (this.currentLevel >= savedLevel) {
            Storage.save(`${this.currentRankGame}_level`, this.currentLevel + 1);
          }
        }
        this.currentLevel = undefined;
      }
    }
    
    this.startAnimation();
  }

  handleHomeTouch(pos) {
    // 先检查右上角按钮区域（我的 + 设置）
    // 检查"我的"按钮
    if (this.myButton) {
      const mb = this.myButton;
      if (pos.x >= mb.x && pos.x <= mb.x + mb.width &&
          pos.y >= mb.y && pos.y <= mb.y + mb.height) {
        console.log('点击我的按钮');
        this.showingProfile = true;
        this.renderProfile();
        return;
      }
    }
    
    // 检查设置按钮
    const btn = this.settingsBtn;
    if (pos.x >= btn.x && pos.x <= btn.x + btn.width &&
        pos.y >= btn.y && pos.y <= btn.y + btn.height) {
      console.log('点击设置按钮');
      this.showingSettings = true;
      this.settings = GameSettings.get();
      this.renderSettings();
      return;
    }
    
    // 检查主题切换按钮
    if (this.showingSettings) {
      const { width, safeTop } = this.designSize;
      const cardY = safeTop + 240;
      const themes = themeManager.getAllThemes();
      const buttonWidth = 80;
      const buttonHeight = 40;
      const buttonSpacing = 15;
      const totalWidth = themes.length * buttonWidth + (themes.length - 1) * buttonSpacing;
      const startX = (width - totalWidth) / 2;
      
      // 检查主题按钮点击
      for (const theme of themes) {
        const index = themes.indexOf(theme);
        const x = startX + index * (buttonWidth + buttonSpacing);
        const themeBtn = { x, y: cardY + 110, width: buttonWidth, height: buttonHeight };
        if (this.hitTest(pos, themeBtn)) {
          themeManager.setTheme(theme.id);
          this.currentTheme = themeManager.getCurrentTheme();
          this.showingSettings = false;
          return;
        }
      }
      
      // 检查游戏主题按钮点击
      const gameCardY = cardY + 220;
      const gameThemes = themeManager.getAllGameThemes();
      const gameButtonWidth = 70;
      const gameButtonHeight = 35;
      const gameButtonSpacing = 10;
      const gameTotalWidth = Math.min(gameThemes.length, 4) * gameButtonWidth + (Math.min(gameThemes.length, 4) - 1) * gameButtonSpacing;
      const gameStartX = (width - gameTotalWidth) / 2;
      
      for (const theme of gameThemes.slice(0, 4)) {
        const index = gameThemes.indexOf(theme);
        const x = gameStartX + index * (gameButtonWidth + gameButtonSpacing);
        const gameThemeBtn = { x, y: gameCardY + 110, width: gameButtonWidth, height: gameButtonHeight };
        if (this.hitTest(pos, gameThemeBtn)) {
          themeManager.setGameTheme(theme.id);
          this.currentGameTheme = themeManager.getCurrentGameTheme();
          this.showingSettings = false;
          return;
        }
      }
    }

    // 检查每个卡片
    for (const card of this.cards) {
      // 先检查排行榜按钮
      const rankBtn = card.rankBtn;
      if (pos.x >= rankBtn.x && pos.x <= rankBtn.x + rankBtn.width &&
          pos.y >= rankBtn.y && pos.y <= rankBtn.y + rankBtn.height) {
        this.showRank(card.game.id, card.game.name, card.theme);
        return;
      }

      // 再检查卡片（启动游戏）
      if (pos.x >= card.x && pos.x <= card.x + card.width &&
          pos.y >= card.y && pos.y <= card.y + card.height) {
        // 关卡型游戏显示关卡选择
        if (card.game.type === 'levels') {
          this.showLevelSelect(card.game.id);
        } else {
          this.startGame(card.game.id);
        }
        return;
      }
    }
  }

  handleSettingsTouch(pos) {
    const { width, height, safeTop, safeBottom } = this.designSize;
    
    // 返回按钮
    const backButton = { x: 30, y: safeTop + 110, width: 140, height: 50 };
    if (pos.x >= backButton.x && pos.x <= backButton.x + backButton.width &&
        pos.y >= backButton.y && pos.y <= backButton.y + backButton.height) {
      this.showingSettings = false;
      this.startAnimation();
      return;
    }

    // 开关按钮区域
    const toggleWidth = 120;
    const toggleHeight = 36;
    const startX = width / 2 + 50;
    const startY = safeTop + 280;

    // 音效开关
    if (pos.x >= startX && pos.x <= startX + toggleWidth &&
        pos.y >= startY && pos.y <= startY + toggleHeight) {
      this.settings = GameSettings.toggle('soundEnabled');
      if (this.settings.vibrationEnabled) {
        wx.vibrateShort({ type: 'light' });
      }
      this.renderSettings();
      return;
    }

    // 音乐开关
    const musicY = startY + 60;
    if (pos.x >= startX && pos.x <= startX + toggleWidth &&
        pos.y >= musicY && pos.y <= musicY + toggleHeight) {
      this.settings = GameSettings.toggle('musicEnabled');
      if (this.settings.vibrationEnabled) {
        wx.vibrateShort({ type: 'light' });
      }
      this.renderSettings();
      return;
    }

    // 振动开关
    const vibrationY = startY + 120;
    if (pos.x >= startX && pos.x <= startX + toggleWidth &&
        pos.y >= vibrationY && pos.y <= vibrationY + toggleHeight) {
      this.settings = GameSettings.toggle('vibrationEnabled');
      if (this.settings.vibrationEnabled) {
        wx.vibrateShort({ type: 'light' });
      }
      this.renderSettings();
      return;
    }
  }

  handleRankTouch(pos) {
    const { safeTop } = this.designSize;
    const backButton = { x: 30, y: safeTop + 110, width: 140, height: 50 };
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
    const sortType = gameId === 'memory' ? 'asc' : 'desc';
    
    // 先显示本地数据
    this.rankData = RankData.getRank(gameId, sortType);
    this.renderRank(gameName);
    
    // 异步从服务器获取最新数据
    RankData.getRankFromCloud(gameId, sortType).then(data => {
      if (data && data.length > 0) {
        this.rankData = data;
        // 预加载头像图片
        this.preloadAvatars(data);
        this.renderRank(gameName);
      }
    });
  }

  preloadAvatars(rankData) {
    // 预加载头像图片到 canvas
    rankData.forEach(item => {
      if (item.avatar && !this.avatarCache[item.avatar]) {
        try {
          const img = this.ctx.createImage ? this.ctx.createImage() : null;
          if (img) {
            img.src = item.avatar;
            this.avatarCache[item.avatar] = img;
          }
        } catch (e) {}
      }
    });
  }

  drawBg(width, height) {
    const ctx = this.ctx;
    
    // 使用现代化渐变背景
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#fdf4ff');
    gradient.addColorStop(0.5, '#fae8ff');
    gradient.addColorStop(1, '#e9d5ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 添加装饰粒子
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#c4b5fd';
    ctx.beginPath();
    ctx.arc(width * 0.2, height * 0.3, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.6, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.8, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  render() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    
    // 如果正在显示关卡选择器
    if (this.showingLevelSelect && this.levelSelector) {
      this.levelSelector.draw(this.ctx);
      return;
    }
    
    this.drawBg(width, height);
    drawParticles(this.ctx, this.particles);

    // 现代化标题
    drawText(this.ctx, '铃铛快乐屋', width / 2, safeTop + 150, { fontSize: 52, color: '#7c3aed', bold: true });
    drawText(this.ctx, '精选小游戏合集', width / 2, safeTop + 195, { fontSize: 28, color: '#a78bfa' });

    // 右上角按钮区域（设置 + 我的）
    // 我的按钮（上方）
    const myBtnX = width - 120;
    const myBtnY = safeTop + 110;
    drawModernButton(this.ctx, myBtnX, myBtnY, 90, 45, '我的', ModernThemes.primary, {
      fontSize: 24,
      icon: '👤'
    });
    this.myButton = { x: myBtnX, y: myBtnY, width: 90, height: 45 };
    
    // 设置按钮（下方）
    this.settingsBtn.x = width - 120;
    this.settingsBtn.y = safeTop + 165;
    this.settingsBtn.width = 90;
    this.settingsBtn.height = 45;
    drawModernButton(this.ctx, this.settingsBtn.x, this.settingsBtn.y, this.settingsBtn.width, this.settingsBtn.height, '设置', ModernThemes.primary, {
      fontSize: 24,
      icon: '⚙️'
    });

    this.cards.forEach((card, index) => this.drawModernGameCard(card, index));

    drawText(this.ctx, '点击卡片开始游戏', width / 2, height - safeBottom - 35, { fontSize: 22, color: '#c4b5fd' });
  }

  // 现代化游戏卡片
  drawModernGameCard(card, index) {
    const { game, x, y, width, height, theme, rankBtn } = card;
    const ctx = this.ctx;

    // 卡片阴影 + 渐变背景
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, 0.12)`;
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;

    // 渐变卡片底色
    const cardGradient = ctx.createLinearGradient(x, y, x, y + height);
    cardGradient.addColorStop(0, theme.surface || '#ffffff');
    cardGradient.addColorStop(1, theme.bg || '#faf5ff');
    ctx.fillStyle = cardGradient;
    drawRoundRect(ctx, x, y, width, height, 20);
    ctx.fill();

    // 左侧彩色装饰条
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const barGradient = ctx.createLinearGradient(x, y, x, y + height);
    barGradient.addColorStop(0, theme.primary);
    barGradient.addColorStop(1, theme.secondary || theme.primary);
    ctx.fillStyle = barGradient;
    drawRoundRect(ctx, x, y, 8, height, 4);
    ctx.fill();

    // 卡片边框
    ctx.strokeStyle = theme.primary + '33';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, x, y, width, height, 20);
    ctx.stroke();
    ctx.restore();

    // 游戏图标圆形背景
    const iconX = x + 55;
    const iconY = y + height / 2;
    const iconRadius = 28;

    ctx.save();
    ctx.shadowColor = theme.primary + '66';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    const iconGradient = ctx.createRadialGradient(iconX - 8, iconY - 8, 2, iconX, iconY, iconRadius);
    iconGradient.addColorStop(0, theme.secondary || theme.primary);
    iconGradient.addColorStop(1, theme.primary);
    ctx.fillStyle = iconGradient;
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 图标
    drawGameIcon(ctx, iconX, iconY, iconRadius * 0.6, '#fff', game.shape);

    // 游戏名称
    drawText(ctx, game.name, x + 100, y + 38, { fontSize: 30, color: '#1e293b', bold: true, align: 'left' });
    // 描述
    drawText(ctx, game.desc, x + 100, y + 72, { fontSize: 20, color: '#64748b', align: 'left' });

    // 关卡类型标签
    const tagText = game.type === 'levels' ? '关卡' : '无限';
    const tagColor = game.type === 'levels' ? '#8b5cf6' : '#10b981';
    ctx.font = 'bold 18px "PingFang SC", sans-serif';
    const tagWidth = ctx.measureText(tagText).width + 24;
    drawRoundRect(ctx, x + width - tagWidth - 15, y + 15, tagWidth, 30, 15, tagColor + '22');
    ctx.fillStyle = tagColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, x + width - tagWidth / 2 - 15, y + 30);

    // 排行榜按钮
    drawModernButton(ctx, rankBtn.x, rankBtn.y, rankBtn.width, rankBtn.height, '🏆 排行', theme, {
      fontSize: 22,
      radius: 14,
      shadow: false,
      gradient: true
    });
  }
renderProfile() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    console.log('renderProfile 被调用');
    this.ctx.clearRect(0, 0, width, height);
    this.drawBg(width, height);
    
    // 标题
    drawText(this.ctx, '个人设置', width / 2, safeTop + 50, { fontSize: 48, color: '#7c3aed', bold: true });
    
    // 返回按钮
    drawButton(this.ctx, 30, safeTop + 110, 120, 45, '← 返回', '#dc2626', { fontSize: 28, radius: 12 });
    this.profileBackBtn = { x: 30, y: safeTop + 110, width: 120, height: 45 };
    
    const avatarColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    const avatarColor = avatarColors[this.myProfile.avatarIndex] || '#7c3aed';
    const nickname = this.myProfile.nickname || '玩家';
    
    // ===== 头像区域 =====
    const avatarStartY = safeTop + 230;
    
    // 头像大圆圈
    const avatarX = width / 2;
    const avatarY = avatarStartY;
    const avatarRadius = 60;
    
    drawCircle(this.ctx, avatarX, avatarY, avatarRadius, avatarColor);
    // 昵称首字
    drawText(this.ctx, nickname.charAt(0), avatarX, avatarY, { fontSize: 44, color: '#fff', bold: true });
    
    // 昵称（头像下方）
    drawText(this.ctx, nickname, width / 2, avatarY + 100, { fontSize: 32, color: '#1f2937', bold: true });
    
    // ===== 修改昵称按钮 =====
    const btnY = avatarY + 170;
    drawButton(this.ctx, width / 2 - 100, btnY, 200, 50, '修改昵称', '#8b5cf6', { fontSize: 26, radius: 14 });
    this.editNicknameBtn = { x: width / 2 - 100, y: btnY, width: 200, height: 50 };
    
    // ===== 头像颜色选择 =====
    const colorStartY = btnY + 120;
    drawText(this.ctx, '选择头像颜色', width / 2, colorStartY, { fontSize: 24, color: '#6b7280' });
    
    // 颜色按钮分两行
    const colorBtnSize = 55;
    const colorGap = 30;
    const rowGap = 35;
    const colorsPerRow = 5;
    const rowWidth = colorBtnSize * colorsPerRow + colorGap * (colorsPerRow - 1);
    const rowStartX = (width - rowWidth) / 2;
    
    this.profileColorBtns = [];
    avatarColors.forEach((color, i) => {
      const row = Math.floor(i / colorsPerRow);
      const col = i % colorsPerRow;
      const x = rowStartX + col * (colorBtnSize + colorGap);
      const y = colorStartY + 35 + row * (colorBtnSize + rowGap);
      
      drawCircle(this.ctx, x + colorBtnSize / 2, y + colorBtnSize / 2, colorBtnSize / 2 - 3, color);
      
      // 选中标记
      if (i === this.myProfile.avatarIndex) {
        this.ctx.strokeStyle = '#7c3aed';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(x + colorBtnSize / 2, y + colorBtnSize / 2, colorBtnSize / 2 + 4, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      
      this.profileColorBtns.push({ x, y, width: colorBtnSize, height: colorBtnSize, index: i });
    });
    
    // 底部提示
    drawText(this.ctx, '排行榜会显示你的昵称和头像', width / 2, height - safeBottom - 40, { fontSize: 22, color: '#a78bfa' });
  }
  
  handleProfileTouch(pos) {
    const { safeTop, width, height, safeBottom } = this.designSize;
    
    // 返回按钮
    if (this.profileBackBtn && 
        pos.x >= this.profileBackBtn.x && pos.x <= this.profileBackBtn.x + this.profileBackBtn.width &&
        pos.y >= this.profileBackBtn.y && pos.y <= this.profileBackBtn.y + this.profileBackBtn.height) {
      this.showingProfile = false;
      this.startAnimation();
      return;
    }
    
    // 修改昵称按钮
    if (this.editNicknameBtn &&
        pos.x >= this.editNicknameBtn.x && pos.x <= this.editNicknameBtn.x + this.editNicknameBtn.width &&
        pos.y >= this.editNicknameBtn.y && pos.y <= this.editNicknameBtn.y + this.editNicknameBtn.height) {
      // 使用微信键盘输入昵称
      wx.showKeyboard({
        defaultValue: this.myProfile.nickname,
        maxLength: 10,
        multiple: false,
        confirmHold: false,
        confirmType: 'done'
      });
      
      wx.onKeyboardInput((res) => {
        this.myProfile.nickname = res.value || '玩家';
      });
      
      wx.onKeyboardConfirm((res) => {
        this.myProfile.nickname = res.value || '玩家';
        this.saveProfile(this.myProfile);
        wx.hideKeyboard();  // 关闭键盘
        this.renderProfile();
        wx.offKeyboardInput();
        wx.offKeyboardConfirm();
      });
      
      wx.onKeyboardComplete(() => {
        wx.offKeyboardInput();
        wx.offKeyboardConfirm();
        wx.offKeyboardComplete();
      });
      return;
    }
    
    // 头像颜色选择
    if (this.profileColorBtns) {
      for (const btn of this.profileColorBtns) {
        if (pos.x >= btn.x && pos.x <= btn.x + btn.width &&
            pos.y >= btn.y && pos.y <= btn.y + btn.height) {
          this.myProfile.avatarIndex = btn.index;
          this.saveProfile(this.myProfile);
          this.renderProfile();
          return;
        }
      }
    }
  }

  renderSettings() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    const ctx = this.ctx;
    console.log('renderSettings 被调用');
    ctx.clearRect(0, 0, width, height);
    this.drawBg(width, height);

    // 标题
    drawText(ctx, '⚙️ 设置', width / 2, safeTop + 50, { fontSize: 48, color: '#7c3aed', bold: true });

    // 返回按钮
    drawButton(ctx, 30, safeTop + 110, 140, 50, '← 返回', '#dc2626', { fontSize: 32, radius: 16 });

    // 设置项背景卡片
    const cardY = safeTop + 240;
    ctx.shadowColor = 'rgba(139, 92, 246, 0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    
    // 主题选择卡片
    drawRoundRect(ctx, 40, cardY, width - 80, 200, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // 主题标题
    drawText(ctx, '🎨 主题设置', width / 2, cardY + 40, { fontSize: 28, color: '#7c3aed', bold: true });
    
    // 当前主题
    const currentTheme = themeManager.getCurrentTheme();
    drawText(ctx, `当前主题: ${themeManager.currentTheme === 'default' ? '默认' : themeManager.currentTheme}`, width / 2, cardY + 80, { fontSize: 20, color: '#64748b' });
    
    // 主题切换按钮
    const themes = themeManager.getAllThemes();
    const buttonWidth = 80;
    const buttonHeight = 40;
    const buttonSpacing = 15;
    const totalWidth = themes.length * buttonWidth + (themes.length - 1) * buttonSpacing;
    const startX = (width - totalWidth) / 2;
    
    themes.forEach((theme, index) => {
      const x = startX + index * (buttonWidth + buttonSpacing);
      const isActive = theme.id === themeManager.currentTheme;
      
      drawModernButton(ctx, x, cardY + 110, buttonWidth, buttonHeight, theme.icon, isActive ? currentTheme : '#e5e7eb', {
        fontSize: 20,
        radius: 12,
        shadow: isActive,
        gradient: false
      });
      
      // 主题名称
      drawText(ctx, theme.name, x + buttonWidth/2, cardY + 165, { fontSize: 14, color: isActive ? currentTheme : '#64748b', align: 'center' });
    });
    
    // 游戏主题选择
    const gameCardY = cardY + 220;
    drawRoundRect(ctx, 40, gameCardY, width - 80, 200, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // 游戏主题标题
    drawText(ctx, '🎮 游戏主题', width / 2, gameCardY + 40, { fontSize: 28, color: '#7c3aed', bold: true });
    
    // 当前游戏主题
    const currentGameTheme = themeManager.getCurrentGameTheme();
    drawText(ctx, `当前游戏主题: ${currentGameTheme.themeName}`, width / 2, gameCardY + 80, { fontSize: 20, color: '#64748b' });
    
    // 游戏主题切换按钮
    const gameThemes = themeManager.getAllGameThemes();
    const gameButtonWidth = 70;
    const gameButtonHeight = 35;
    const gameButtonSpacing = 10;
    const gameTotalWidth = Math.min(gameThemes.length, 4) * gameButtonWidth + (Math.min(gameThemes.length, 4) - 1) * gameButtonSpacing;
    const gameStartX = (width - gameTotalWidth) / 2;
    
    gameThemes.slice(0, 4).forEach((theme, index) => {
      const x = gameStartX + index * (gameButtonWidth + gameButtonSpacing);
      const isActive = theme.id === themeManager.currentGameTheme;
      
      drawModernButton(ctx, x, gameCardY + 110, gameButtonWidth, gameButtonHeight, theme.icon, isActive ? currentGameTheme.primary : '#e5e7eb', {
        fontSize: 18,
        radius: 10,
        shadow: isActive,
        gradient: false
      });
      
      // 游戏主题名称
      drawText(ctx, theme.name, x + gameButtonWidth/2, gameCardY + 160, { fontSize: 12, color: isActive ? currentGameTheme.primary : '#64748b', align: 'center' });
    });
    ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, 30, cardY, width - 60, 200, 20, '#ffffff', '#8b5cf6', 2);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 开关按钮
    const toggleWidth = 120;
    const toggleHeight = 36;
    const toggleStartX = width / 2 + 50;
    const toggleStartY = cardY + 40;

    drawToggle(ctx, toggleStartX, toggleStartY, toggleWidth, toggleHeight, this.settings.soundEnabled, '音效');
    drawToggle(ctx, toggleStartX, toggleStartY + 60, toggleWidth, toggleHeight, this.settings.musicEnabled, '音乐');
    drawToggle(ctx, toggleStartX, toggleStartY + 120, toggleWidth, toggleHeight, this.settings.vibrationEnabled, '振动');

    // 提示文字
    drawText(ctx, '设置会自动保存', width / 2, height - safeBottom - 80, { fontSize: 22, color: '#a78bfa' });
  }

  renderRank(gameName) {
    const { width, height, safeTop, safeBottom } = this.designSize;
    console.log('renderRank 被调用');
    this.ctx.clearRect(0, 0, width, height);
    this.drawBg(width, height);

    drawText(this.ctx, `${gameName}排行榜`, width / 2, safeTop + 50, { fontSize: 48, color: this.rankTheme.primary, bold: true });

    const startY = safeTop + 220;
    const itemHeight = 65;  // 增加高度以显示头像

    if (this.rankData.length === 0) {
      drawText(this.ctx, '暂无记录', width / 2, startY + 100, { fontSize: 32, color: Colors.textLight });
      drawText(this.ctx, '快去玩游戏吧！', width / 2, startY + 150, { fontSize: 26, color: Colors.textMuted });
    } else {
      this.rankData.forEach((item, index) => {
        const y = startY + index * itemHeight;
        const bgColor = index < 3 ? this.rankTheme.primary : '#f3e8ff';
        drawRoundRect(this.ctx, 30, y, width - 60, itemHeight - 8, 12, bgColor);
        const rankColor = index < 3 ? '#fff' : '#5b21b6';
        
        // 排名
        drawText(this.ctx, `${index + 1}`, 70, y + 30, { fontSize: 28, color: rankColor, bold: true });
        
        // 头像（颜色圆形）
        const avatarX = 120;
        const avatarY = y + 30;
        const avatarRadius = 20;
        
        // 解析头像颜色
        const avatarColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
        let avatarColor = '#7c3aed';
        if (item.avatar && item.avatar.startsWith('color:')) {
          const idx = parseInt(item.avatar.split(':')[1]) || 0;
          avatarColor = avatarColors[idx] || avatarColor;
        }
        
        drawCircle(this.ctx, avatarX, avatarY, avatarRadius, avatarColor);
        // 显示昵称首字
        drawText(this.ctx, (item.nickname || '玩家').charAt(0), avatarX, avatarY, { fontSize: 24, color: '#fff', bold: true });
        
        // 昵称
        const nickname = item.nickname || item.name || '玩家';
        drawText(this.ctx, nickname, 160, y + 30, { fontSize: 26, color: rankColor, align: 'left' });
        
        // 分数
        const displayScore = this.currentRankGame === 'memory' ? item.score + '步' : item.score + '分';
        drawText(this.ctx, displayScore, width - 80, y + 30, { fontSize: 26, color: rankColor, bold: true });
      });
    }

    drawButton(this.ctx, 30, safeTop + 110, 140, 50, '← 返回', '#dc2626', { fontSize: 32, radius: 16 });
  }

  drawGameCard(card, index) {
    const { game, x, y, width, height, theme, rankBtn } = card;
    const ctx = this.ctx;

    // 获取游戏进度
    const currentLevel = Storage.load(`${game.id}_level`) || 0;
    const levelInfo = Levels[game.id] ? Levels[game.id][currentLevel] : null;

    ctx.save();
    ctx.shadowColor = 'rgba(139, 92, 246, 0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, x, y, width, height, 16, '#ffffff', theme.primary, 2);
    ctx.restore();

    const centerY = y + height / 2;
    const iconX = x + 40;
    const iconRadius = 25;

    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    drawCircle(ctx, iconX, centerY, iconRadius, theme.primary);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    drawGameIcon(ctx, iconX, centerY, iconRadius * 0.65, '#fff', game.shape);

    drawText(ctx, game.name, x + width * 0.55, centerY - 10, { fontSize: 30, color: '#1f2937', bold: true });
    drawText(ctx, game.desc, x + width * 0.55, centerY + 20, { fontSize: 20, color: '#6b7280' });

    // 游戏类型标签
    const levelType = game.type === 'levels' ? '关卡' : '无限';
    const typeColor = game.type === 'levels' ? theme.primary : '#10b981';
    drawModernTag(ctx, x + width - 100, y + 20, levelType, theme, {
      fontSize: 16, fontWeight: 'bold', backgroundColor: typeColor + '22', textColor: typeColor
    });

    // 进度信息
    if (game.type === 'levels' && Levels[game.id]) {
      const totalLevels = Levels[game.id].length;
      const progress = currentLevel / totalLevels;
      
      // 进度条背景
      const progressY = y + height - 35;
      const progressWidth = width - 40;
      const progressX = x + 20;
      
      drawRoundRect(ctx, progressX, progressY, progressWidth, 8, 4);
      ctx.fillStyle = '#e5e7eb';
      ctx.fill();
      
      // 进度条填充
      const fillWidth = progressWidth * progress;
      const progressGradient = ctx.createLinearGradient(progressX, progressY, progressX + fillWidth, progressY);
      progressGradient.addColorStop(0, theme.primary);
      progressGradient.addColorStop(1, theme.secondary || theme.primary);
      ctx.fillStyle = progressGradient;
      drawRoundRect(ctx, progressX, progressY, fillWidth, 8, 4);
      ctx.fill();
      
      // 进度文字
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`第${currentLevel + 1}关`, progressX, progressY + 4);
      
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(progress * 100)}%`, progressX + progressWidth, progressY + 4);
    }
    
    // 当前关卡信息
    if (game.type === 'levels' && levelInfo) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(levelInfo.name, x + width * 0.55, centerY + 45);
    }

    drawButton(ctx, rankBtn.x, rankBtn.y, rankBtn.width, rankBtn.height, '排行榜', theme.secondary, { fontSize: 24, radius: 12 });
  }
}

new MainGame();
