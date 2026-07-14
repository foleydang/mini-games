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
import { syncUserToServer, initOpenId } from './common/utils.js';
import { checkTextSecurity, maskSensitive, containsSensitive } from './common/contentSecurity.js';
import { ModernThemes, drawModernButton, drawModernCard, drawModernNavbar, drawModernTag, drawModernProgress } from './common/modern-ui.js';
import LevelSelector from './common/level-selector.js';
import { themeManager } from './common/theme-manager.js';
import { audioManager } from './common/audio.js';
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

    // 画布后备缓冲区按物理像素分辨率设置，避免在高清屏被放大导致画面发虚（散光感）；
    // 再把绘图上下文缩放回 750 设计坐标系，绘制/触摸坐标不变，仅提升清晰度。
    const sysInfo = wx.getSystemInfoSync();
    const dpr = sysInfo.pixelRatio || 1;
    this.canvas.width = Math.round(sysInfo.screenWidth * dpr);
    this.canvas.height = Math.round(sysInfo.screenHeight * dpr);
    const renderScale = this.canvas.width / this.designSize.width;
    this.ctx.scale(renderScale, renderScale);

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
    
    // 启动时换取真实微信 openid（异步，不阻塞首屏；失败自动降级为本地兜底 ID）
    initOpenId();

    // 前后台切换:后台时停音乐+停循环,回前台恢复,缓解低端机(如小米)
    // 后台被系统回收后重进的黑屏/卡顿
    this.hidden = false;
    this._musicWasPlaying = false;
    try {
      wx.onHide(() => {
        this.hidden = true;
        this._musicWasPlaying = audioManager.bgMusicPlaying;
        audioManager.stopBgMusic();
      });
      wx.onShow(() => {
        this.hidden = false;
        if (this._musicWasPlaying) audioManager.startBgMusic();
        // 仅在停留于主界面(无子页/游戏)时重启主循环
        if (!this.currentGame && !this.showingRank && !this.showingSettings &&
            !this.showingProfile && !this.showingLevelSelect) {
          this.startAnimation();
        }
      });
    } catch (e) {}

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
      if (!saved) return { nickname: '玩家', avatarIndex: 0, avatarColor: '#7c3aed' };
      // 入场自愈:历史遗留的违规昵称(词库更新前存下的)重置为默认,并回写
      if (containsSensitive(saved.nickname)) {
        saved.nickname = '玩家';
        try { wx.setStorageSync('myProfile', saved); } catch (e) {}
      }
      return saved;
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
    const cardGapH = 28;
    const cardGapV = 40;
    const paddingX = 28;

    const availableWidth = width - paddingX * 2 - cardGapH;
    const cardWidth = Math.floor(availableWidth / cols);
    const cardHeight = 112;

    const startX = paddingX;
    const startY = safeTop + 300;

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
          x: cardX + cardWidth - 102,
          y: cardY + cardHeight - 44,
          width: 88,
          height: 32
        }
      });
    });

    // 设置按钮位置
    this.settingsBtn = {
      x: width - 100,
      y: safeTop + 162,
      width: 80,
      height: 38
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
      if (this.showingLevelSelect && this.levelSelector) {
        this.levelSelector.onTouchMove(pos);
        return;
      }
      if (!this.showingSettings && !this.showingRank && this.currentGame) {
        this.currentGame.onTouchMove(pos);
      }
    });

    wx.onTouchEnd((e) => {
      const pos = getTouchPos(e.changedTouches[0], this.designSize);
      if (this.showingLevelSelect && this.levelSelector) {
        this.levelSelector.onTouchEnd(pos);
        if (this.levelSelector && this.levelSelector.shouldBack) {
          this.showingLevelSelect = false;
          this.levelSelector = null;
          this.startAnimation();
        }
        return;
      }
      if (!this.showingSettings && !this.showingRank && this.currentGame) {
        this.currentGame.onTouchEnd(pos);
      }
    });
  }

  startAnimation() {
    // 幂等:避免 onShow 与其它入口重复启动多个 RAF 循环
    if (this.animRunning) return;
    this.animRunning = true;
    const animate = () => {
      if (this.hidden || this.currentGame || this.showingRank || this.showingSettings || this.showingProfile || this.showingLevelSelect) {
        this.animRunning = false;
        return;
      }
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
    // 防御:销毁上一局残留实例,避免旧渲染循环盖在新游戏画面上
    try {
      if (this.currentGame && typeof this.currentGame.destroy === 'function') {
        this.currentGame.destroy();
      }
    } catch (e) {
      console.error('destroy prev game failed:', gameId, e);
    }
    this.currentGame = null;
    // 关卡型游戏传 level 参数，无限型不传
    const gameConfig = Games.find(g => g.id === gameId);
    try {
      if (gameConfig && gameConfig.type === 'levels') {
        this.currentGame = new GameClass(this.canvas, this.ctx, this.designSize, (score) => this.endGame(score), level);
      } else {
        this.currentGame = new GameClass(this.canvas, this.ctx, this.designSize, (score) => this.endGame(score));
      }
    } catch (e) {
      // 关键:构造失败不再让整个小游戏崩溃重载,回到关卡选择并暴露错误
      console.error('launch game failed:', gameId, 'level=', level, e);
      this.currentGame = null;
      this.showLevelSelect(gameId);
      return;
    }
    // 进入游戏时播放背景音乐
    audioManager.startBgMusic();
  }

  startGame(gameId) {
    this.currentRankGame = gameId;
    this.startGameWithLevel(gameId, 0);
  }

  endGame(result) {
    // 支持 { score, passed } 对象或纯数字 score
    const score = typeof result === 'object' ? result.score : result;

    // 安全网:确保离场前停掉游戏自身的循环(定时器/rAF),避免野循环画到主页
    if (this.currentGame && typeof this.currentGame.destroy === 'function') {
      try { this.currentGame.destroy(); } catch (e) {}
    }
    this.currentGame = null;
    audioManager.stopBgMusic();

    // 无限型游戏:提交分数到排行榜。
    // 关卡型游戏:排行榜提交“到达关卡”与解锁均在游戏内通关时经 completeLevel 处理,此处不再提交分数。
    const gameConfig = Games.find(g => g.id === this.currentRankGame);
    if (!gameConfig || gameConfig.type !== 'levels') {
      RankData.addRank(this.currentRankGame || 'unknown', score, '玩家');
    }
    this.currentLevel = undefined;

    // 关卡型游戏:退出后回到选关页(而非最外层首页),方便继续挑战
    if (gameConfig && gameConfig.type === 'levels') {
      this.showLevelSelect(this.currentRankGame);
      return;
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
      // 先检查排行榜按钮:热区向外扩 16px(隐形热区),视觉不变但更易点中
      const rankBtn = card.rankBtn;
      const slop = 16;
      if (pos.x >= rankBtn.x - slop && pos.x <= rankBtn.x + rankBtn.width + slop &&
          pos.y >= rankBtn.y - slop && pos.y <= rankBtn.y + rankBtn.height + slop) {
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
      audioManager.soundEnabled = this.settings.soundEnabled;
      audioManager.save();
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
      audioManager.musicEnabled = this.settings.musicEnabled;
      audioManager.save();
      if (this.settings.musicEnabled) { audioManager.startBgMusic(); }
      else { audioManager.stopBgMusic(); }
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
    // 统一按降序:关卡型比“到达关卡”越高越好,无限型比分数越高越好
    const sortType = 'desc';
    
    // 先显示本地数据
    this.rankData = RankData.getRank(gameId, sortType);
    this.renderRank(gameName);
    
    // 异步从服务器获取最新数据（服务器为准，空数组也覆盖本地缓存）
    RankData.getRankFromCloud(gameId, sortType).then(data => {
      if (data) {
        this.rankData = data;
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

    // 柔和明亮渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#faf8ff');
    gradient.addColorStop(0.5, '#f5f0ff');
    gradient.addColorStop(1, '#ede8ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 装饰圆 - 更淡更柔和
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(width * 0.15, height * 0.25, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f9a8d4';
    ctx.beginPath();
    ctx.arc(width * 0.85, height * 0.6, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.85, 90, 0, Math.PI * 2);
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
    drawText(this.ctx, '铃铛快乐屋', width / 2, safeTop + 130, { fontSize: 48, color: '#6d28d9', bold: true });
    drawText(this.ctx, '精选小游戏合集', width / 2, safeTop + 174, { fontSize: 24, color: '#8b5cf6' });

    // 右上角按钮区域（设置 + 我的）
    const btnTheme = ModernThemes.gameThemes.match3;
    // 我的按钮（上方）
    const myBtnX = width - 134;
    const myBtnY = safeTop + 118;
    drawModernButton(this.ctx, myBtnX, myBtnY, 114, 40, '我的', btnTheme, {
      fontSize: 22,
      icon: '👤'
    });
    this.myButton = { x: myBtnX, y: myBtnY, width: 114, height: 40 };
    
    // 设置按钮（下方）
    this.settingsBtn.x = width - 134;
    this.settingsBtn.y = safeTop + 162;
    this.settingsBtn.width = 114;
    this.settingsBtn.height = 40;
    drawModernButton(this.ctx, this.settingsBtn.x, this.settingsBtn.y, this.settingsBtn.width, this.settingsBtn.height, '设置', btnTheme, {
      fontSize: 22,
      icon: '⚙️'
    });

    this.cards.forEach((card, index) => this.drawModernGameCard(card, index));

    drawText(this.ctx, '🎮 点击卡片开始游戏', width / 2, height - safeBottom - 25, { fontSize: 20, color: '#a78bfa' });
  }

  // 现代化游戏卡片
  drawModernGameCard(card, index) {
    const { game, x, y, width, height, theme, rankBtn } = card;
    const ctx = this.ctx;

    // 卡片阴影 + 白色底色
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, 0.06)`;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // 白色卡片底色
    ctx.fillStyle = '#ffffff';
    drawRoundRect(ctx, x, y, width, height, 14);
    ctx.fill();

    // 左侧浅色装饰条
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = theme.primary + '30';
    drawRoundRect(ctx, x, y, 6, height, 3);
    ctx.fill();

    // 卡片边框
    ctx.strokeStyle = theme.primary + '18';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, x, y, width, height, 14);
    ctx.stroke();
    ctx.restore();

    // 游戏图标圆形背景
    const iconX = x + 48;
    const iconY = y + height / 2;
    const iconRadius = 26;

    ctx.save();
    ctx.shadowColor = theme.primary + '30';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = theme.primary + '20';
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 图标
    drawGameIcon(ctx, iconX, iconY, iconRadius * 0.6, theme.primary, game.shape);

    // 游戏名称(上下大致居中于卡片)
    drawText(ctx, game.name, x + 86, y + 44, { fontSize: 28, color: '#1e293b', bold: true, align: 'left' });
    // 描述
    drawText(ctx, game.desc, x + 86, y + 74, { fontSize: 19, color: '#94a3b8', align: 'left' });

    // 关卡类型标签(卡片右上角)
    const tagText = game.type === 'levels' ? '关卡' : '无限';
    const tagColor = game.type === 'levels' ? theme.primary : '#10b981';
    ctx.font = 'bold 19px "PingFang SC", sans-serif';
    const tagWidth = ctx.measureText(tagText).width + 24;
    const tagH = 28;
    const tagX = x + width - tagWidth - 14;
    const tagY = y + 14;
    drawRoundRect(ctx, tagX, tagY, tagWidth, tagH, 12, tagColor + '1a');
    ctx.fillStyle = tagColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, tagX + tagWidth / 2, tagY + tagH / 2 + 1);

    // 排行榜按钮（卡片内右下角）
    ctx.save();
    const rbGradient = ctx.createLinearGradient(rankBtn.x, rankBtn.y, rankBtn.x, rankBtn.y + rankBtn.height);
    rbGradient.addColorStop(0, theme.primary);
    rbGradient.addColorStop(1, theme.secondary || theme.primary);
    ctx.fillStyle = rbGradient;
    drawRoundRect(ctx, rankBtn.x, rankBtn.y, rankBtn.width, rankBtn.height, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆', rankBtn.x + rankBtn.width / 2 - 18, rankBtn.y + rankBtn.height / 2);
    ctx.font = 'bold 16px "PingFang SC", sans-serif';
    ctx.fillText('排行', rankBtn.x + rankBtn.width / 2 + 13, rankBtn.y + rankBtn.height / 2);
    ctx.restore();
  }
renderProfile() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    const ctx = this.ctx;
    const theme = ModernThemes.gameThemes.match3;  // 紫晶主题，与首页统一
    ctx.clearRect(0, 0, width, height);
    this.drawBg(width, height);

    const avatarColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    const avatarColor = avatarColors[this.myProfile.avatarIndex] || theme.primary;
    const nickname = maskSensitive(this.myProfile.nickname || '玩家');

    // ===== 顶部导航：圆形返回按钮 + 居中标题 =====
    const backR = 24;
    const backCX = 34 + backR;
    const backCY = safeTop + 60;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    drawCircle(ctx, backCX, backCY, backR, '#ffffff');
    ctx.restore();
    drawText(ctx, '‹', backCX, backCY - 2, { fontSize: 40, color: theme.primary, bold: true });
    this.profileBackBtn = { x: backCX - backR, y: backCY - backR, width: backR * 2, height: backR * 2 };
    drawText(ctx, '个人设置', width / 2, backCY, { fontSize: 34, color: '#1f2937', bold: true });

    // ===== 资料卡片 =====
    const cardX = 40;
    const cardW = width - 80;
    const cardY = safeTop + 130;
    const cardH = 300;
    drawModernCard(ctx, cardX, cardY, cardW, cardH, theme, { border: false, radius: 24 });

    // 头像（渐变圆 + 柔和光晕）
    const avatarX = width / 2;
    const avatarY = cardY + 90;
    const avatarRadius = 54;
    ctx.save();
    ctx.shadowColor = avatarColor + '66';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    const g = ctx.createLinearGradient(avatarX, avatarY - avatarRadius, avatarX, avatarY + avatarRadius);
    g.addColorStop(0, avatarColor);
    g.addColorStop(1, avatarColor + 'cc');
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    drawText(ctx, nickname.charAt(0), avatarX, avatarY, { fontSize: 44, color: '#fff', bold: true });

    // 昵称
    drawText(ctx, nickname, width / 2, avatarY + 95, { fontSize: 30, color: '#1f2937', bold: true });

    // 修改昵称按钮
    const btnW = 220;
    const btnH = 52;
    const btnX = width / 2 - btnW / 2;
    const btnY = avatarY + 130;
    drawModernButton(ctx, btnX, btnY, btnW, btnH, '修改昵称', theme, {
      fontSize: 26, radius: 26, icon: '✏️', gradient: true
    });
    this.editNicknameBtn = { x: btnX, y: btnY, width: btnW, height: btnH };

    // ===== 外观卡片：头像颜色 =====
    const colorCardY = cardY + cardH + 28;
    const colorsPerRow = 5;
    const colorBtnSize = 54;
    const colorGapX = (cardW - 48 - colorBtnSize * colorsPerRow) / (colorsPerRow - 1);
    const rowGap = 26;
    const colorCardH = 90 + colorBtnSize * 2 + rowGap + 24;
    drawModernCard(ctx, cardX, colorCardY, cardW, colorCardH, theme, { border: false, radius: 24 });

    drawText(ctx, '头像颜色', cardX + 30, colorCardY + 40, { fontSize: 26, color: '#1f2937', bold: true, align: 'left' });

    const gridStartX = cardX + 24;
    const gridStartY = colorCardY + 78;
    this.profileColorBtns = [];
    avatarColors.forEach((color, i) => {
      const row = Math.floor(i / colorsPerRow);
      const col = i % colorsPerRow;
      const x = gridStartX + col * (colorBtnSize + colorGapX);
      const y = gridStartY + row * (colorBtnSize + rowGap);
      const cx = x + colorBtnSize / 2;
      const cy = y + colorBtnSize / 2;
      const selected = i === this.myProfile.avatarIndex;

      drawCircle(ctx, cx, cy, colorBtnSize / 2 - 4, color);

      if (selected) {
        // 选中：外环高亮 + 中心对勾
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, colorBtnSize / 2, 0, Math.PI * 2);
        ctx.stroke();
        drawText(ctx, '✓', cx, cy, { fontSize: 26, color: '#fff', bold: true });
      }

      this.profileColorBtns.push({ x, y, width: colorBtnSize, height: colorBtnSize, index: i });
    });

    // 底部提示
    drawText(ctx, '排行榜会展示你的昵称和头像', width / 2, height - safeBottom - 36, { fontSize: 22, color: theme.secondary });
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
      // 先清掉可能残留的监听,避免连续点击"修改昵称"导致回调叠加
      wx.offKeyboardInput();
      wx.offKeyboardConfirm();
      wx.offKeyboardComplete();

      // 使用微信键盘输入昵称
      wx.showKeyboard({
        defaultValue: this.myProfile.nickname,
        maxLength: 10,
        multiple: false,
        confirmHold: false,
        confirmType: 'done'
      });

      // 输入过程中仅暂存到临时变量，确认时才做内容安全校验后落库
      let pendingNickname = this.myProfile.nickname;
      wx.onKeyboardInput((res) => {
        pendingNickname = res.value || '玩家';
      });

      wx.onKeyboardConfirm(async (res) => {
        const value = (res.value || pendingNickname || '玩家').trim() || '玩家';
        wx.hideKeyboard();  // 关闭键盘
        wx.offKeyboardInput();
        wx.offKeyboardConfirm();

        const result = await checkTextSecurity(value);
        if (!result.pass) {
          wx.showToast({ title: '昵称含违规内容，请修改', icon: 'none' });
          this.renderProfile();  // 保持原昵称，不保存、不上传
          return;
        }

        this.myProfile.nickname = value;
        this.saveProfile(this.myProfile);
        this.renderProfile();
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

  // 排行榜行内星级:以 cx 为中心横向居中绘制 3 颗星(金色实心 + 弱化空心)
  drawRankStars(ctx, cx, cy, stars, top3) {
    const size = 26;
    const gap = 4;
    const n = 3;
    const totalW = n * size + (n - 1) * gap;
    ctx.save();
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let x = cx - totalW / 2 + size / 2;
    for (let i = 0; i < n; i++) {
      if (i < stars) {
        ctx.fillStyle = top3 ? '#fde047' : '#f59e0b';
        ctx.fillText('★', x, cy);
      } else {
        ctx.fillStyle = top3 ? 'rgba(255,255,255,0.4)' : '#d8b4fe';
        ctx.fillText('☆', x, cy);
      }
      x += size + gap;
    }
    ctx.restore();
  }

  renderRank(gameName) {
    const { width, height, safeTop, safeBottom } = this.designSize;
    console.log('renderRank 被调用');
    this.ctx.clearRect(0, 0, width, height);
    this.drawBg(width, height);

    drawText(this.ctx, `${gameName}排行榜`, width / 2, safeTop + 50, { fontSize: 48, color: this.rankTheme.primary, bold: true });

    const startY = safeTop + 220;
    const itemHeight = 74;

    const gameCfg = Games.find(g => g.id === this.currentRankGame);
    const isLevelGame = gameCfg && gameCfg.type === 'levels';

    if (this.rankData.length === 0) {
      drawText(this.ctx, '暂无记录', width / 2, startY + 100, { fontSize: 32, color: Colors.textLight });
      drawText(this.ctx, '快去玩游戏吧！', width / 2, startY + 150, { fontSize: 26, color: Colors.textMuted });
    } else {
      const avatarColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
      this.rankData.forEach((item, index) => {
        const y = startY + index * itemHeight;
        const midY = y + (itemHeight - 8) / 2;
        const top3 = index < 3;
        const bgColor = top3 ? this.rankTheme.primary : '#f3e8ff';
        drawRoundRect(this.ctx, 30, y, width - 60, itemHeight - 8, 14, bgColor);
        const rankColor = top3 ? '#fff' : '#5b21b6';

        // 排名
        drawText(this.ctx, `${index + 1}`, 66, midY, { fontSize: 28, color: rankColor, bold: true });

        // 头像（颜色圆形 + 昵称首字）
        const avatarX = 118;
        const avatarColor = avatarColors[item.avatarIndex] || '#7c3aed';
        drawCircle(this.ctx, avatarX, midY, 20, avatarColor);
        // 昵称展示端脱敏（防止服务器历史/未过滤的违规内容被展示）
        const nickname = maskSensitive(item.nickname || item.name || '玩家');
        drawText(this.ctx, nickname.charAt(0), avatarX, midY, { fontSize: 24, color: '#fff', bold: true });

        // 昵称
        drawText(this.ctx, nickname, 156, midY, { fontSize: 26, color: rankColor, align: 'left' });

        if (isLevelGame) {
          // 中间空白区:星级(金色实心 + 弱化空心),纵向居中
          if (item.stars) {
            this.drawRankStars(this.ctx, width * 0.55, midY, item.stars, top3);
          }
          // 右侧:到达关卡(纵向居中)
          drawText(this.ctx, `第${item.score}关`, width - 48, midY, {
            fontSize: 28, color: rankColor, bold: true, align: 'right'
          });
        } else {
          drawText(this.ctx, item.score + '分', width - 48, midY, {
            fontSize: 28, color: rankColor, bold: true, align: 'right'
          });
        }
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
