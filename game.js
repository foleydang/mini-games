/**
 * 主游戏入口
 */
import {
  getDesignSize, Colors, drawGradientBg, drawGameCardBg, drawButton,
  drawText, drawParticles, generateParticles, updateParticles,
  getTouchPos, Storage, RankData, shareGame, drawCircle, drawRoundRect,
  drawGameIcon, GameSettings, drawToggle
} from './common/utils.js';
import { Games } from './common/config.js';
import { getUserInfo, createUserInfoButton, destroyUserInfoButton, drawAvatar, isAuthorized } from './common/userInfo.js';
import { syncUserToServer } from './common/utils.js';
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
    this.showingSettings = false;
    this.currentRankGame = null;
    this.rankData = [];
    this.settings = GameSettings.get();
    this.particles = [];
    this.animFrame = 0;

    this.avatarCache = {};  // 头像图片缓存
    this.showingProfile = false;  // 显示个人设置页
    this.myProfile = this.loadProfile();  // 用户个人设置
    this.profileAvatars = [];  // 预设头像列表
    this.selectedAvatarIndex = 0;
    this.editingNickname = false;
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
        rankBtn: {
          x: cardX + 20,
          y: cardY + cardHeight + 5,
          width: cardWidth - 40,
          height: 36
        }
      });
    });

    // 设置按钮位置（在 render 中动态设置）
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
      if (this.currentGame || this.showingRank || this.showingSettings || this.showingProfile) return;
      this.animFrame++;
      updateParticles(this.particles);
      this.render();
      requestAnimationFrame(animate);
    };
    animate();
  }

  startGame(gameId) {
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
        this.startGame(card.game.id);
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

    // 右上角按钮区域（设置 + 我的）
    // 我的按钮（上方）
    const myBtnX = width - 120;
    const myBtnY = safeTop + 110;
    drawButton(this.ctx, myBtnX, myBtnY, 90, 45, '我的', '#10b981', { fontSize: 24, radius: 12 });
    this.myButton = { x: myBtnX, y: myBtnY, width: 90, height: 45 };
    
    // 设置按钮（下方）
    this.settingsBtn.x = width - 120;
    this.settingsBtn.y = safeTop + 165;
    this.settingsBtn.width = 90;
    this.settingsBtn.height = 45;
    drawButton(this.ctx, this.settingsBtn.x, this.settingsBtn.y, this.settingsBtn.width, this.settingsBtn.height, '设置', '#8b5cf6', { fontSize: 24, radius: 12 });

    this.cards.forEach((card, index) => this.drawGameCard(card, index));

    drawText(this.ctx, '点击卡片开始游戏', width / 2, height - safeBottom - 35, { fontSize: 22, color: '#c4b5fd' });
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
    drawRoundRect(ctx, 30, cardY, width - 60, 200, 20, '#ffffff', '#8b5cf6', 2);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 开关按钮
    const toggleWidth = 120;
    const toggleHeight = 36;
    const startX = width / 2 + 50;
    const startY = cardY + 40;

    drawToggle(ctx, startX, startY, toggleWidth, toggleHeight, this.settings.soundEnabled, '音效');
    drawToggle(ctx, startX, startY + 60, toggleWidth, toggleHeight, this.settings.musicEnabled, '音乐');
    drawToggle(ctx, startX, startY + 120, toggleWidth, toggleHeight, this.settings.vibrationEnabled, '振动');

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

    drawButton(ctx, rankBtn.x, rankBtn.y, rankBtn.width, rankBtn.height, '排行榜', theme.secondary, { fontSize: 24, radius: 12 });
  }
}

new MainGame();
