/**
 * 关卡选择界面组件
 * 提供统一的关卡选择和进度显示功能
 */

import { Colors, drawRoundRect, drawText, Storage, loadLevelStars } from './utils.js';
import { ModernThemes, drawModernButton, drawModernProgress } from './modern-ui.js';
import { Games, Levels } from './config.js';

export default class LevelSelector {
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
    // 每关最好星级映射 { levelIndex: stars }
    this.starMap = loadLevelStars(gameId);

    // UI状态
    this.cards = [];
    this.buttons = [];

    // 滚动状态
    this.scrollY = 0;
    this.maxScroll = 0;
    this.dragStartY = 0;
    this.dragStartScroll = 0;
    this.dragging = false;
    this.moved = false;
    // 惯性滚动(帧步进,不依赖 performance.now——真机 iOS 无全局 performance)
    this.scrollVel = 0;
    this.prevPointerY = 0;

    this.init();
  }

  init() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    // 一行一个关卡的列表布局
    this.rowMargin = 28;
    this.rowWidth = width - this.rowMargin * 2;
    this.rowHeight = 92;
    this.rowGap = 15;
    this.startX = this.rowMargin;

    // 列表可视区域(头部区块下方),用于裁剪与滚动计算
    this.cardAreaTop = safeTop + 280;
    this.cardAreaBottom = height - safeBottom - 30;
    this.startY = this.cardAreaTop + 12;

    this.generateCards();

    // 内容总高度与最大滚动量
    const contentBottom = this.startY + this.levels.length * (this.rowHeight + this.rowGap);
    this.maxScroll = Math.max(0, contentBottom - this.cardAreaBottom + 12);

    // 打开时自动定位到当前关卡(居中显示),避免从第1关翻起
    const cur = this.cards[Math.min(this.currentLevel, this.cards.length - 1)];
    if (cur) {
      const viewH = this.cardAreaBottom - this.cardAreaTop;
      const target = cur.y - this.cardAreaTop - viewH / 2 + this.rowHeight / 2;
      this.scrollY = Math.max(0, Math.min(this.maxScroll, target));
    }
  }

  generateCards() {
    this.cards = [];
    this.buttons = [];

    for (let i = 0; i < this.levels.length; i++) {
      const level = this.levels[i];
      const y = this.startY + i * (this.rowHeight + this.rowGap);

      const isCompleted = i < this.currentLevel;
      const isCurrent = i === this.currentLevel;
      const isLocked = i > this.currentLevel;

      this.cards.push({
        level: i,
        x: this.startX, y,
        width: this.rowWidth,
        height: this.rowHeight,
        levelInfo: level,
        isCompleted,
        isCurrent,
        isLocked
      });
    }
  }

  // 惯性滚动步进,每帧调用
  stepScroll() {
    if (this.dragging) return;
    if (Math.abs(this.scrollVel) < 0.3) { this.scrollVel = 0; return; }
    this.scrollY += this.scrollVel;
    this.scrollVel *= 0.92;
    if (this.scrollY < 0) { this.scrollY = 0; this.scrollVel = 0; }
    else if (this.scrollY > this.maxScroll) { this.scrollY = this.maxScroll; this.scrollVel = 0; }
  }

  draw(ctx) {
    const { width, height, safeTop, safeBottom } = this.designSize;

    // 背景渐变 + 装饰
    this.drawBackground(ctx, width, height);
    
    // 标题区域
    this.drawHeader(ctx, width, safeTop);

    // 惯性滚动步进
    this.stepScroll();

    // 关卡列表(裁剪 + 滚动 + 视口剔除,仅绘制可见行以保证流畅)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.cardAreaTop, width, this.cardAreaBottom - this.cardAreaTop);
    ctx.clip();
    ctx.translate(0, -this.scrollY);
    const visTop = this.scrollY + this.cardAreaTop;
    const visBot = this.scrollY + this.cardAreaBottom;
    for (const card of this.cards) {
      if (card.y + card.height < visTop || card.y > visBot) continue;
      this.drawCard(ctx, card);
    }
    ctx.restore();

    // 顶部/底部渐隐提示可滚动
    if (this.maxScroll > 0) this.drawScrollHint(ctx, width);

    // 操作按钮行(返回 / 重置进度),位于描述与进度之间
    this.drawActionButtons(ctx, width, safeTop);

    // 动画效果
    this.drawAnimations(ctx);
  }

  drawScrollHint(ctx, width) {
    // 底部可继续滚动时,画一个小箭头提示
    if (this.scrollY < this.maxScroll - 1) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawText(ctx, '⌄', width / 2, this.cardAreaBottom - 6, { fontSize: 40, color: this.theme.primary, bold: true });
      ctx.restore();
    }
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
    drawText(ctx, this.gameInfo.name, width / 2, safeTop + 72, {
      fontSize: 52, color: this.theme.primary, bold: true
    });

    // 副标题
    drawText(ctx, this.gameInfo.desc, width / 2, safeTop + 114, {
      fontSize: 24, color: '#64748b'
    });

    // 操作按钮行(描述与进度之间)在 draw() 中通过 drawActionButtons 绘制

    // 进度信息
    const progress = this.levels.length > 0 ? (this.currentLevel / this.levels.length) : 0;

    // 进度标题
    drawText(ctx, `进度`, width / 2 - 100, safeTop + 218, {
      fontSize: 22, color: '#64748b', bold: true
    });

    // 进度百分比
    drawText(ctx, `${Math.round(progress * 100)}%`, width / 2 + 100, safeTop + 218, {
      fontSize: 22, color: this.theme.primary, bold: true
    });

    // 进度条背景
    const progressW = width - 100;
    const progressX = 50;
    const progressY = safeTop + 242;
    
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

  drawActionButtons(ctx, width, safeTop) {
    const btnY = safeTop + 148;
    const btnH = 52;
    const btnW = 132;

    // 返回按钮(左上角)
    drawModernButton(ctx, 24, btnY, btnW, btnH, '← 返回', this.theme, {
      fontSize: 22, radius: 16, shadow: true, gradient: false
    });
    this.backBtn = { x: 24, y: btnY, width: btnW, height: btnH };

    // 重置进度按钮(右上角)
    const resetX = width - 24 - btnW;
    drawModernButton(ctx, resetX, btnY, btnW, btnH, '重置进度', this.theme, {
      fontSize: 20, radius: 16, shadow: true, gradient: false
    });
    this.resetBtn = { x: resetX, y: btnY, width: btnW, height: btnH };
  }

  drawAnimations(ctx) {
    // 这里可以添加动画效果，比如浮动动画、点击反馈等
    // 暂时留空，后续可以添加粒子效果或微动画
  }

  // 依据关卡在总关卡中的位置计算难度(5 档)
  getDifficulty(level) {
    const total = this.levels.length;
    const t = total <= 1 ? 0 : level / (total - 1);
    const tier = Math.min(4, Math.floor(t * 5));
    const labels = ['轻松', '简单', '普通', '挑战', '地狱'];
    const colors = ['#22c55e', '#38bdf8', '#fbbf24', '#fb923c', '#ef4444'];
    const emojis = ['🌱', '🙂', '🔥', '💪', '💀'];
    return { tier, label: labels[tier], color: colors[tier], emoji: emojis[tier], stars: tier + 1 };
  }

  // 左对齐绘制 total 颗星,filled 颗高亮
  drawStars(ctx, x, y, filled, total, filledColor, emptyColor) {
    ctx.font = '17px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let sx = x;
    for (let i = 0; i < total; i++) {
      ctx.fillStyle = i < filled ? filledColor : emptyColor;
      ctx.fillText('★', sx, y);
      sx += 19;
    }
  }

  drawCard(ctx, card) {
    const { x, y, width, height, level, isCompleted, isCurrent, isLocked, levelInfo } = card;
    const cy = y + height / 2;
    const radius = 24;
    const diff = this.getDifficulty(level);

    ctx.save();

    // 行背景 + 阴影
    ctx.shadowColor = isCurrent ? this.theme.primary + '55' : 'rgba(100,116,139,0.14)';
    ctx.shadowBlur = isCurrent ? 20 : 10;
    ctx.shadowOffsetY = 5;

    if (isCurrent) {
      const g = ctx.createLinearGradient(x, y, x + width, y + height);
      g.addColorStop(0, this.theme.primary);
      g.addColorStop(1, this.theme.secondary);
      ctx.fillStyle = g;
    } else if (isCompleted) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = '#f8fafc';
    }
    drawRoundRect(ctx, x, y, width, height, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 顶部柔光高光(可爱感)
    ctx.save();
    ctx.beginPath();
    drawRoundRect(ctx, x, y, width, height, radius);
    ctx.clip();
    const hl = ctx.createLinearGradient(0, y, 0, y + height * 0.5);
    hl.addColorStop(0, isCurrent ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.6)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(x, y, width, height * 0.5);
    ctx.restore();

    // 描边(未开始/已完成用淡色描边,当前用白色内描边)
    ctx.lineWidth = 2;
    ctx.strokeStyle = isCurrent ? 'rgba(255,255,255,0.55)' : (isCompleted ? '#d1fae5' : '#e2e8f0');
    drawRoundRect(ctx, x + 1, y + 1, width - 2, height - 2, radius - 1);
    ctx.stroke();

    // 左侧圆角方形编号徽章(比圆形更饱满可爱)
    const badgeSize = 56;
    const badgeX = x + 18;
    const badgeY = cy - badgeSize / 2;
    if (isCurrent) {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
    } else if (isCompleted) {
      const bg = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeSize);
      bg.addColorStop(0, '#34d399');
      bg.addColorStop(1, '#10b981');
      ctx.fillStyle = bg;
    } else {
      ctx.fillStyle = '#e2e8f0';
    }
    drawRoundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 18);
    ctx.fill();

    const badgeCX = badgeX + badgeSize / 2;
    if (isCompleted) {
      // 完成:大对勾 + 角标数字
      ctx.font = '32px "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('✓', badgeCX, cy);
    } else {
      drawText(ctx, `${level + 1}`, badgeCX, cy, {
        fontSize: 30,
        color: isCurrent ? this.theme.primary : '#94a3b8',
        bold: true
      });
    }

    // 中间(两行):第1行 名称 + 紧跟其后的规格说明;第2行 难度标签 + 星级
    const textX = badgeX + badgeSize + 16;
    const nameColor = isCurrent ? '#ffffff' : (isCompleted ? '#1f2937' : '#64748b');
    const subColor = isCurrent ? 'rgba(255,255,255,0.85)' : (isLocked ? '#a3aec0' : '#94a3b8');

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // 名称
    const nameStr = `${diff.emoji} ${levelInfo.name}`;
    ctx.font = 'bold 24px "PingFang SC", sans-serif';
    ctx.fillStyle = nameColor;
    ctx.fillText(nameStr, textX, cy - 14);
    // 规格说明紧跟名称之后(小字、弱化)
    const nameW = ctx.measureText(nameStr).width;
    ctx.font = '16px "PingFang SC", sans-serif';
    ctx.fillStyle = subColor;
    ctx.fillText(this.getLevelInfo(levelInfo), textX + nameW + 12, cy - 13);

    // 第2行:难度标签 + 星级
    drawText(ctx, diff.label, textX, cy + 16, {
      fontSize: 15, color: isCurrent ? '#fff' : diff.color, bold: true, align: 'left'
    });
    this.drawStars(
      ctx, textX + 42, cy + 16, diff.stars, 5,
      isCurrent ? '#fde047' : diff.color,
      isCurrent ? 'rgba(255,255,255,0.4)' : '#dbe2ea'
    );

    // 右侧状态
    if (isCurrent) {
      const pillW = 96, pillH = 46;
      const pillX = x + width - pillW - 18;
      const pillY = cy - pillH / 2;
      ctx.fillStyle = '#ffffff';
      drawRoundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      drawText(ctx, '开始 ▶', pillX + pillW / 2, cy, {
        fontSize: 22, color: this.theme.primary, bold: true
      });
    } else if (isCompleted) {
      // 真实获得的星级(旧存档无记录时默认 3 星,避免回退观感)
      const earned = this.starMap[level] != null ? this.starMap[level] : 3;
      this.drawStars(ctx, x + width - 78, cy, earned, 3, '#fbbf24', '#e5e7eb');
    } else {
      ctx.font = '30px "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.5;
      ctx.fillText('🔒', x + width - 44, cy);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  getLevelInfo(levelInfo) {
    switch (this.gameId) {
      case 'match3': return `${levelInfo.cols}×${levelInfo.rows} ${levelInfo.colors}色`;
      case 'fruit': return `${levelInfo.types}种·${levelInfo.maxFruits}个`;
      case 'breakout': return `${levelInfo.rows}×${levelInfo.cols}砖块`;
      case 'sheep': return `${levelInfo.layers}层 ${levelInfo.emojiCount}种`;
      case 'memory': return `${levelInfo.pairs}对卡片`;
      default: return levelInfo.name;
    }
  }

  onTouchStart(pos) {
    // 记录拖动起点,松手时再判定点击/滚动
    this.dragging = true;
    this.moved = false;
    this.dragStartY = pos.y;
    this.dragStartScroll = this.scrollY;
    this.prevPointerY = pos.y;
    this.scrollVel = 0;
  }

  onTouchMove(pos) {
    if (!this.dragging) return;
    const dy = pos.y - this.dragStartY;
    if (Math.abs(dy) > 8) this.moved = true;
    this.scrollY = Math.max(0, Math.min(this.maxScroll, this.dragStartScroll - dy));
    // 帧间位移作为惯性初速度(手指下滑 → 内容下移 → scrollY 减小)
    this.scrollVel = this.prevPointerY - pos.y;
    this.prevPointerY = pos.y;
  }

  onTouchEnd(pos) {
    const wasDragging = this.dragging;
    this.dragging = false;
    // 拖动过则视为滚动,不触发点击(惯性由 stepScroll 接管)
    if (this.moved || !wasDragging) { return; }

    // 固定按钮(不随滚动)
    if (this.backBtn && this.hitTest(pos, this.backBtn)) {
      this.shouldBack = true;
      return;
    }
    if (this.resetBtn && this.hitTest(pos, this.resetBtn)) {
      Storage.save(`${this.gameId}_level`, 0);
      Storage.remove(`${this.gameId}_stars`);
      this.currentLevel = 0;
      this.starMap = {};
      this.generateCards();
      return;
    }

    // 卡片区域外的点击忽略(避免穿透到标题/按钮区)
    if (pos.y < this.cardAreaTop || pos.y > this.cardAreaBottom) return;

    // 卡片按滚动偏移换算到布局坐标
    const layoutPos = { x: pos.x, y: pos.y + this.scrollY };
    for (const card of this.cards) {
      if (this.hitTest(layoutPos, card) && !card.isLocked) {
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
