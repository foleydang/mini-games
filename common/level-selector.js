/**
 * 关卡选择界面组件
 * 提供统一的关卡选择和进度显示功能
 */

import { Colors, drawRoundRect, drawText, Storage } from './utils.js';
import { ModernThemes, drawModernButton, drawModernProgress } from './modern-ui.js';
import { Games, Levels } from './config.js';

export class LevelSelector {
  constructor(gameId, designSize, onLevelSelect, onBack) {
    this.gameId = gameId;
    this.designSize = designSize;
    this.onLevelSelect = onLevelSelect;
    this.onBack = onBack;
    this.shouldBack = false;

    // 获取游戏配置
    this.gameInfo = Games.find(g => g.id === gameId);
    this.levels = Levels[gameId] || [];
    this.theme = ModernThemes.gameThemes[gameId] || ModernThemes.gameThemes.match3;

    // 获取当前进度
    this.currentLevel = Storage.load(`${gameId}_level`) || 0;

    // UI状态
    this.cards = [];
    this.buttons = [];

    this.init();
  }

  init() {
    const { width, safeTop } = this.designSize;

    // 计算布局
    this.cardWidth = 140;
    this.cardHeight = 170;
    this.cardSpacing = 20;
    this.cardsPerRow = Math.floor((width - 60) / (this.cardWidth + this.cardSpacing));

    const totalWidth = this.cardsPerRow * this.cardWidth + (this.cardsPerRow - 1) * this.cardSpacing;
    this.startX = (width - totalWidth) / 2;
    this.startY = safeTop + 280;

    this.generateCards();
  }

  generateCards() {
    this.cards = [];
    this.buttons = [];

    for (let i = 0; i < this.levels.length; i++) {
      const level = this.levels[i];
      const row = Math.floor(i / this.cardsPerRow);
      const col = i % this.cardsPerRow;

      const x = this.startX + col * (this.cardWidth + this.cardSpacing);
      const y = this.startY + row * (this.cardHeight + this.cardSpacing);

      const isCompleted = i < this.currentLevel;
      const isCurrent = i === this.currentLevel;
      const isLocked = i > this.currentLevel;

      this.cards.push({
        level: i,
        x, y,
        width: this.cardWidth,
        height: this.cardHeight,
        levelInfo: level,
        isCompleted,
        isCurrent,
        isLocked
      });
    }
  }

  draw(ctx) {
    const { width, height, safeTop, safeBottom } = this.designSize;

    // 背景渐变 + 装饰
    this.drawBackground(ctx, width, height);
    
    // 标题区域
    this.drawHeader(ctx, width, safeTop);
    
    // 关卡卡片
    this.cards.forEach(card => this.drawCard(ctx, card));
    
    // 底部按钮
    this.drawBottomButtons(ctx, width, height, safeBottom);
    
    // 动画效果
    this.drawAnimations(ctx);
  }

  drawBackground(ctx, width, height) {
    // 主背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, this.theme.gradient[0]);
    gradient.addColorStop(1, this.theme.gradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 装饰性圆形
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = this.theme.primary;
    
    // 大圆装饰
    ctx.beginPath();
    ctx.arc(width * 0.15, height * 0.25, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width * 0.85, height * 0.65, 140, 0, Math.PI * 2);
    ctx.fill();
    
    // 小圆装饰
    ctx.globalAlpha = 0.04;
    ctx.beginPath();
    ctx.arc(width * 0.75, height * 0.15, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width * 0.25, height * 0.75, 80, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1;
  }

  drawHeader(ctx, width, safeTop) {
    // 游戏标题
    drawText(ctx, this.gameInfo.name, width / 2, safeTop + 80, {
      fontSize: 52, color: this.theme.primary, bold: true
    });
    
    // 副标题
    drawText(ctx, this.gameInfo.desc, width / 2, safeTop + 130, {
      fontSize: 24, color: '#64748b'
    });

    // 关卡类型标签
    const levelType = this.gameInfo.type === 'levels' ? '关卡' : '无限';
    const typeColor = this.gameInfo.type === 'levels' ? this.theme.primary : '#10b981';
    drawModernTag(ctx, width - 120, safeTop + 80, levelType, this.theme, {
      fontSize: 20, fontWeight: 'bold', backgroundColor: typeColor + '22', textColor: typeColor
    });

    // 进度信息
    const progress = this.levels.length > 0 ? (this.currentLevel / this.levels.length) : 0;
    
    // 进度标题
    drawText(ctx, `进度`, width / 2 - 100, safeTop + 185, {
      fontSize: 22, color: '#64748b', bold: true
    });
    
    // 进度百分比
    drawText(ctx, `${Math.round(progress * 100)}%`, width / 2 + 100, safeTop + 185, {
      fontSize: 22, color: this.theme.primary, bold: true
    });

    // 进度条背景
    const progressW = width - 100;
    const progressX = 50;
    const progressY = safeTop + 210;
    
    // 进度条背景
    drawRoundRect(ctx, progressX, progressY, progressW, 16, 8);
    ctx.fillStyle = '#e5e7eb';
    ctx.fill();
    
    // 进度条填充
    const fillWidth = progressW * progress;
    const progressGradient = ctx.createLinearGradient(progressX, progressY, progressX + fillWidth, progressY);
    progressGradient.addColorStop(0, this.theme.primary);
    progressGradient.addColorStop(1, this.theme.secondary);
    ctx.fillStyle = progressGradient;
    drawRoundRect(ctx, progressX, progressY, fillWidth, 16, 8);
    ctx.fill();
    
    // 进度条高光
    if (progress > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffffff';
      drawRoundRect(ctx, progressX + 2, progressY + 2, fillWidth - 4, 4, 4);
      ctx.restore();
    }
  }

    // 关卡卡片
    this.cards.forEach(card => this.drawCard(ctx, card));

  drawBottomButtons(ctx, width, height, safeBottom) {
    const buttonY = height - safeBottom - 80;
    
    // 返回按钮
    drawModernButton(ctx, 30, buttonY, 150, 60, '← 返回', this.theme, {
      fontSize: 24, radius: 18, shadow: true, gradient: false
    });
    this.backBtn = { x: 30, y: buttonY, width: 150, height: 60 };

    // 重置进度按钮
    drawModernButton(ctx, width - 180, buttonY, 150, 60, '重置进度', this.theme, {
      fontSize: 22, radius: 18, shadow: true, gradient: false
    });
    this.resetBtn = { x: width - 180, y: buttonY, width: 150, height: 60 };
    
    // 底部装饰线
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, buttonY - 10);
    ctx.lineTo(width, buttonY - 10);
    ctx.stroke();
  }

  drawAnimations(ctx) {
    // 这里可以添加动画效果，比如浮动动画、点击反馈等
    // 暂时留空，后续可以添加粒子效果或微动画
  }
}

  drawCard(ctx, card) {
    const { x, y, width, height, level, isCompleted, isCurrent, isLocked, levelInfo } = card;

    ctx.save();
    
    // 卡片阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    // 卡片背景
    if (isCurrent) {
      // 当前关卡 - 渐变背景
      const cardGradient = ctx.createLinearGradient(x, y, x, y + height);
      cardGradient.addColorStop(0, this.theme.primary);
      cardGradient.addColorStop(1, this.theme.secondary);
      ctx.fillStyle = cardGradient;
    } else if (isCompleted) {
      // 已完成关卡 - 绿色背景
      const cardGradient = ctx.createLinearGradient(x, y, x, y + height);
      cardGradient.addColorStop(0, '#10b981');
      cardGradient.addColorStop(1, '#059669');
      ctx.fillStyle = cardGradient;
    } else {
      // 未解锁关卡 - 灰色背景
      const cardGradient = ctx.createLinearGradient(x, y, x, y + height);
      cardGradient.addColorStop(0, '#f3f4f6');
      cardGradient.addColorStop(1, '#e5e7eb');
      ctx.fillStyle = cardGradient;
    }
    
    // 圆角矩形
    drawRoundRect(ctx, x, y, width, height, 20);
    ctx.fill();
    
    // 卡片边框
    if (isCurrent) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      drawRoundRect(ctx, x, y, width, height, 20);
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // 关卡编号背景
    const badgeX = x + 15;
    const badgeY = y + 15;
    const badgeSize = 32;
    
    if (isCurrent) {
      // 当前关卡 - 彩色徽章
      const badgeGradient = ctx.createRadialGradient(badgeX + 8, badgeY + 8, 2, badgeX + badgeSize/2, badgeY + badgeSize/2, badgeSize/2);
      badgeGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
      badgeGradient.addColorStop(1, 'rgba(255,255,255,0.6)');
      ctx.fillStyle = badgeGradient;
    } else if (isCompleted) {
      // 已完成 - 白色徽章
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
    } else {
      // 未解锁 - 灰色徽章
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
    }
    
    drawRoundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, badgeSize/2);
    ctx.fill();
    
    // 关卡编号文字
    ctx.font = 'bold 20px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isCurrent ? this.theme.primary : (isCompleted ? '#059669' : '#6b7280');
    ctx.fillText(`${level + 1}`, badgeX + badgeSize/2, badgeY + badgeSize/2);
    
    // 关卡名称
    drawText(ctx, levelInfo.name, x + width/2, y + 65, {
      fontSize: 24, 
      color: isCurrent ? '#ffffff' : (isCompleted ? '#ffffff' : '#374151'), 
      bold: true,
      align: 'center'
    });
    
    // 关卡信息
    const info = this.getLevelInfo(levelInfo);
    drawText(ctx, info, x + width/2, y + 95, {
      fontSize: 18, 
      color: isCurrent ? 'rgba(255,255,255,0.9)' : (isCompleted ? 'rgba(255,255,255,0.8)' : '#6b7280'),
      align: 'center'
    });
    
    // 状态图标
    const iconY = y + height - 35;
    if (isCompleted) {
      // 完成图标
      ctx.font = '32px "Apple Color Emoji"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('✓', x + width/2, iconY);
      
      // 星星装饰
      ctx.font = '20px "Apple Color Emoji"';
      ctx.fillText('⭐', x + width/2 - 25, iconY - 15);
      ctx.fillText('⭐', x + width/2 + 25, iconY - 15);
    } else if (isLocked) {
      // 锁定图标
      ctx.font = '32px "Apple Color Emoji"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('🔒', x + width/2, iconY);
    } else if (isCurrent) {
      // 当前关卡 - 播放图标
      ctx.font = '32px "Apple Color Emoji"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('▶', x + width/2, iconY);
    }
    
    ctx.restore();
  }

  getLevelInfo(levelInfo) {
    switch (this.gameId) {
      case 'match3': return `${levelInfo.cols}×${levelInfo.rows} ${levelInfo.colors}色`;
      case 'fruit': return `${levelInfo.fruitCount}种水果`;
      case 'breakout': return `${levelInfo.rows}×${levelInfo.cols}砖块`;
      case 'sheep': return `${levelInfo.layers}层 ${levelInfo.emojiCount}种`;
      case 'memory': return `${levelInfo.pairs}对卡片`;
      default: return levelInfo.name;
    }
  }

  onTouchStart(pos) {
    // 返回按钮
    if (this.backBtn && this.hitTest(pos, this.backBtn)) {
      this.shouldBack = true;
      return;
    }

    // 重置按钮
    if (this.resetBtn && this.hitTest(pos, this.resetBtn)) {
      Storage.save(`${this.gameId}_level`, 0);
      this.currentLevel = 0;
      this.generateCards();
      return;
    }

    // 关卡卡片
    for (const card of this.cards) {
      if (this.hitTest(pos, card) && !card.isLocked) {
        this.onLevelSelect(card.level);
        return;
      }
    }
  }

  hitTest(pos, rect) {
    return pos.x >= rect.x && pos.x <= rect.x + rect.width &&
           pos.y >= rect.y && pos.y <= rect.y + rect.height;
  }
}
