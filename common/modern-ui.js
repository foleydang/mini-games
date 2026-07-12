/**
 * 现代化UI组件库 - 铃铛快乐屋
 * 提供统一、现代、精美的UI组件
 */

import { Colors, drawRoundRect, drawText, drawGradientBg } from './utils.js';

// 现代主题配置
export const ModernThemes = {
  // 主色调
  primary: {
    main: '#6366f1',
    light: '#818cf8',
    dark: '#4f46e5',
    bg: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    accent: '#ec4899'
  },
  
  // 游戏主题升级版
  gameThemes: {
    match3: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      bg: '#faf5ff',
      surface: '#ffffff',
      gradient: ['#faf5ff', '#f3e8ff'],
      gemColors: ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#ff6b81', '#a55eea'],
      themeName: '紫晶'
    },
    snake: {
      primary: '#10b981',
      secondary: '#34d399',
      bg: '#f0fdf4',
      surface: '#ffffff',
      gradient: ['#f0fdf4', '#dcfce7'],
      themeName: '翡翠'
    },
    breakout: {
      primary: '#f59e0b',
      secondary: '#fbbf24',
      bg: '#fffbeb',
      surface: '#ffffff',
      gradient: ['#fffbeb', '#fef3c7'],
      themeName: '琥珀'
    },
    bounce: {
      primary: '#3b82f6',
      secondary: '#60a5fa',
      bg: '#eff6ff',
      surface: '#ffffff',
      gradient: ['#eff6ff', '#dbeafe'],
      themeName: '海洋'
    },
    fruit: {
      primary: '#ec4899',
      secondary: '#f472b6',
      bg: '#fdf2f8',
      surface: '#ffffff',
      gradient: ['#fdf2f8', '#fce7f3'],
      themeName: '樱花'
    },
    memory: {
      primary: '#06b6d4',
      secondary: '#22d3ee',
      bg: '#f0f9ff',
      surface: '#ffffff',
      gradient: ['#f0f9ff', '#e0f2fe'],
      themeName: '天空'
    },
    sheep: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      bg: '#faf5ff',
      surface: '#ffffff',
      gradient: ['#faf5ff', '#f3e8ff'],
      themeName: '薰衣草'
    },
    tetris: {
      primary: '#ef4444',
      secondary: '#f87171',
      bg: '#fef2f2',
      surface: '#ffffff',
      gradient: ['#fef2f2', '#fee2e2'],
      themeName: '火焰'
    },
    
    // 2048游戏主题
    '2048': {
      primary: '#f59e0b',
      secondary: '#fbbf24',
      bg: '#fffbeb',
      surface: '#ffffff',
      gradient: ['#fffbeb', '#fef3c7'],
      numberColors: {
        2: '#fef3c7', 4: '#fcd34d', 8: '#fbbf24', 16: '#f97316',
        32: '#ef4444', 64: '#dc2626', 128: '#c4b5fd', 256: '#8b5cf6',
        512: '#7c3aed', 1024: '#3b82f6', 2048: '#10b981'
      },
      themeName: '金橙'
    },
    
    // Flappy游戏主题
    flappy: {
      primary: '#f59e0b',
      secondary: '#fbbf24',
      bg: '#fffbeb',
      surface: '#ffffff',
      gradient: ['#fffbeb', '#fef3c7'],
      birdColor: '#f59e0b',
      pipeColor: '#059669',
      themeName: '飞翔'
    }
  },
  
  // 主题预设
  themePresets: {
    // 深色主题
    dark: {
      primary: '#3b82f6',
      secondary: '#60a5fa',
      bg: '#1e293b',
      surface: '#334155',
      gradient: ['#1e293b', '#334155'],
      text: '#f1f5f9',
      textSecondary: '#cbd5e1'
    },
    
    // 深紫色主题
    purple: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      bg: '#4c1d95',
      surface: '#6d28d9',
      gradient: ['#4c1d95', '#6d28d9'],
      text: '#f5f3ff',
      textSecondary: '#e9d5ff'
    },
    
    // 深绿色主题
    green: {
      primary: '#10b981',
      secondary: '#34d399',
      bg: '#064e3b',
      surface: '#047857',
      gradient: ['#064e3b', '#047857'],
      text: '#f0fdfa',
      textSecondary: '#ccfbf1'
    },
    
    // 深橙色主题
    orange: {
      primary: '#f59e0b',
      secondary: '#fbbf24',
      bg: '#92400e',
      surface: '#b45309',
      gradient: ['#92400e', '#b45309'],
      text: '#fffbeb',
      textSecondary: '#fed7aa'
    }
  }
};

// 现代化按钮组件
export function drawModernButton(ctx, x, y, width, height, text, theme, options = {}) {
  const {
    radius = 24,
    fontSize = 24,
    fontWeight = 'bold',
    icon = null,
    shadow = true,
    gradient = false,
    disabled = false,
    onClick = null
  } = options;
  
  // 按钮状态
  const state = {
    hover: false,
    pressed: false
  };
  
  // 绘制阴影
  if (shadow && !disabled) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
  }
  
  // 绘制按钮背景
  if (gradient && !disabled) {
    const grad = ctx.createLinearGradient(x, y, x, y + height);
    grad.addColorStop(0, theme.primary);
    grad.addColorStop(1, theme.secondary);
    drawRoundRect(ctx, x, y, width, height, radius, grad);
  } else {
    drawRoundRect(ctx, x, y, width, height, radius, disabled ? '#e5e7eb' : theme.primary);
  }
  
  // 重置阴影
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // 绘制图标
  if (icon && !disabled) {
    ctx.font = `${fontSize * 1.2}px "Apple Color Emoji", "Segoe UI Emoji"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = Colors.white;
    ctx.fillText(icon, x + 20, y + height / 2);
  }
  
  // 绘制文字
  ctx.font = `${fontWeight} ${fontSize}px "PingFang SC", "Helvetica Neue", sans-serif`;
  ctx.textAlign = icon ? 'left' : 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = disabled ? '#9ca3af' : Colors.white;
  const textX = icon ? x + 60 : x + width / 2;
  ctx.fillText(text, textX, y + height / 2);
  
  // 返回按钮区域信息
  return {
    x, y, width, height,
    onClick,
    disabled,
    checkHit: (px, py) => {
      if (disabled) return false;
      return px >= x && px <= x + width && py >= y && py <= y + height;
    }
  };
}

// 现代化卡片组件
export function drawModernCard(ctx, x, y, width, height, theme, options = {}) {
  const {
    radius = 20,
    shadow = true,
    border = true,
    borderColor = theme.primary,
    title = null,
    titleSize = 28,
    titleColor = theme.text,
    content = null,
    contentSize = 24,
    contentColor = theme.textSecondary,
    icon = null,
    iconSize = 48,
    iconColor = theme.primary
  } = options;
  
  // 绘制阴影
  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
  }
  
  // 绘制卡片背景
  drawRoundRect(ctx, x, y, width, height, radius, theme.surface);
  
  // 绘制边框
  if (border) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // 重置阴影
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // 绘制图标
  if (icon) {
    ctx.font = `${iconSize}px "Apple Color Emoji", "Segoe UI Emoji"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = iconColor;
    ctx.fillText(icon, x + width / 2, y + 80);
  }
  
  // 绘制标题
  if (title) {
    ctx.font = `bold ${titleSize}px "PingFang SC", "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = titleColor;
    ctx.fillText(title, x + width / 2, y + (icon ? 140 : 60));
  }
  
  // 绘制内容
  if (content) {
    ctx.font = `${contentSize}px "PingFang SC", "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = contentColor;
    ctx.fillText(content, x + width / 2, y + height - 40);
  }
}

// 现代化进度条
export function drawModernProgress(ctx, x, y, width, height, progress, theme, options = {}) {
  const {
    radius = 12,
    backgroundColor = '#e5e7eb',
    progressColor = theme.primary,
    showText = true,
    textSize = 20,
    textColor = theme.text,
    animated = false
  } = options;
  
  // 背景条
  drawRoundRect(ctx, x, y, width, height, radius, backgroundColor);
  
  // 进度条
  const progressWidth = Math.max(width * progress, 2);
  drawRoundRect(ctx, x, y, progressWidth, height, radius, progressColor);
  
  // 进度文字
  if (showText) {
    const percentage = Math.round(progress * 100);
    ctx.font = `bold ${textSize}px "PingFang SC", "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.fillText(`${percentage}%`, x + width / 2, y + height / 2);
  }
}

// 现代化开关组件
export function drawModernToggle(ctx, x, y, width, height, isOn, theme, options = {}) {
  const {
    radius = height / 2,
    thumbSize = height - 8,
    label = null,
    labelSize = 20,
    labelColor = theme.text,
    onChange = null
  } = options;
  
  // 背景圆
  const bgColor = isOn ? theme.primary : '#e5e7eb';
  drawRoundRect(ctx, x, y, width, height, radius, bgColor);
  
  // 滑动圆
  const thumbX = isOn ? x + width - thumbSize / 2 - 4 : x + thumbSize / 2 + 4;
  ctx.beginPath();
  ctx.arc(thumbX, y + height / 2, thumbSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = Colors.white;
  ctx.fill();
  
  // 标签
  if (label) {
    ctx.font = `${labelSize}px "PingFang SC", "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = labelColor;
    ctx.fillText(label, x + width + 15, y + height / 2);
  }
  
  return {
    x, y, width, height,
    isOn,
    onChange,
    checkHit: (px, py) => {
      return px >= x && px <= x + width && py >= y && py <= y + height;
    },
    toggle: () => {
      if (onChange) {
        onChange(!isOn);
      }
    }
  };
}

// 现代化标签组件
export function drawModernTag(ctx, x, y, text, theme, options = {}) {
  const {
    paddingX = 16,
    paddingY = 8,
    radius = 16,
    fontSize = 20,
    fontWeight = 'normal',
    backgroundColor = theme.primary,
    textColor = Colors.white,
    icon = null
  } = options;
  
  const textWidth = ctx.measureText(text).width;
  const width = textWidth + paddingX * 2;
  const height = fontSize + paddingY * 2;
  
  // 绘制标签背景
  drawRoundRect(ctx, x, y, width, height, radius, backgroundColor);
  
  // 绘制图标
  if (icon) {
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.fillText(icon, x + paddingX, y + height / 2);
  }
  
  // 绘制文字
  ctx.font = `${fontWeight} ${fontSize}px "PingFang SC", "Helvetica Neue", sans-serif`;
  ctx.textAlign = icon ? 'left' : 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  const textX = icon ? x + paddingX + 25 : x + width / 2;
  ctx.fillText(text, textX, y + height / 2);
  
  return { x, y, width, height };
}

// 现代化输入框组件
export function drawModernInput(ctx, x, y, width, height, placeholder, value, theme, options = {}) {
  const {
    radius = 12,
    fontSize = 24,
    placeholderColor = theme.textSecondary,
    textColor = theme.text,
    borderColor = theme.primary,
    borderWidth = 2,
    icon = null,
    iconSize = 24
  } = options;
  
  // 绘制边框
  drawRoundRect(ctx, x, y, width, height, radius, null, borderColor, borderWidth);
  
  // 绘制图标
  if (icon) {
    ctx.font = `${iconSize}px "Apple Color Emoji", "Segoe UI Emoji"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(icon, x + 15, y + height / 2);
  }
  
  // 绘制占位符或值
  ctx.font = `${fontSize}px "PingFang SC", "Helvetica Neue", sans-serif`;
  ctx.textAlign = icon ? 'left' : 'center';
  ctx.textBaseline = 'middle';
  
  if (value) {
    ctx.fillStyle = textColor;
    const textX = icon ? x + 50 : x + width / 2;
    ctx.fillText(value, textX, y + height / 2);
  } else if (placeholder) {
    ctx.fillStyle = placeholderColor;
    const textX = icon ? x + 50 : x + width / 2;
    ctx.fillText(placeholder, textX, y + height / 2);
  }
  
  return {
    x, y, width, height,
    value,
    checkHit: (px, py) => {
      return px >= x && px <= x + width && py >= y && py <= y + height;
    }
  };
}

// 现代化导航栏组件
export function drawModernNavbar(ctx, designSize, title, theme, options = {}) {
  const {
    height = 80,
    showBack = true,
    showShare = true,
    showSound = true,
    soundEnabled = true
  } = options;
  
  const { width, safeTop } = designSize;
  const navbarY = safeTop + 20;
  
  // 绘制导航栏背景
  const gradient = ctx.createLinearGradient(0, navbarY, 0, navbarY + height);
  gradient.addColorStop(0, theme.primary);
  gradient.addColorStop(1, theme.secondary);
  ctx.fillStyle = gradient;
  drawRoundRect(ctx, 0, navbarY, width, height, 0);
  
  // 绘制标题
  ctx.font = `bold 32px "PingFang SC", "Helvetica Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = Colors.white;
  ctx.fillText(title, width / 2, navbarY + height / 2);
  
  // 绘制按钮
  const buttons = [];
  const buttonSize = 50;
  const buttonSpacing = 20;
  
  // 返回按钮
  if (showBack) {
    const backX = 30;
    const backY = navbarY + (height - buttonSize) / 2;
    buttons.push({
      x: backX,
      y: backY,
      width: buttonSize,
      height: buttonSize,
      type: 'back',
      icon: '←',
      checkHit: (px, py) => px >= backX && px <= backX + buttonSize && py >= backY && py <= backY + buttonSize
    });
  }
  
  // 分享按钮
  if (showShare) {
    const shareX = width - 180;
    const shareY = navbarY + (height - buttonSize) / 2;
    buttons.push({
      x: shareX,
      y: shareY,
      width: buttonSize,
      height: buttonSize,
      type: 'share',
      icon: '📤',
      checkHit: (px, py) => px >= shareX && px <= shareX + buttonSize && py >= shareY && py <= shareY + buttonSize
    });
  }
  
  // 音效按钮
  if (showSound) {
    const soundX = width - 100;
    const soundY = navbarY + (height - buttonSize) / 2;
    buttons.push({
      x: soundX,
      y: soundY,
      width: buttonSize,
      height: buttonSize,
      type: 'sound',
      icon: soundEnabled ? '🔊' : '🔇',
      checkHit: (px, py) => px >= soundX && px <= soundX + buttonSize && py >= soundY && py <= soundY + buttonSize
    });
  }
  
  // 绘制按钮
  buttons.forEach(btn => {
    ctx.font = '28px "Apple Color Emoji", "Segoe UI Emoji"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = Colors.white;
    ctx.fillText(btn.icon, btn.x + btn.width / 2, btn.y + btn.height / 2);
  });
  
  return { navbarY, height, buttons };
}

// 现代化底部操作栏
export function drawModernBottomBar(ctx, designSize, buttons, theme, options = {}) {
  const {
    height = 80,
    spacing = 20
  } = options;
  
  const { width, safeBottom } = designSize;
  const barY = designSize.height - safeBottom - height;
  
  // 绘制背景
  ctx.fillStyle = theme.surface;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = -8;
  drawRoundRect(ctx, 0, barY, width, height, 20);
  ctx.shadowBlur = 0;
  
  // 绘制按钮
  const buttonWidth = 120;
  const totalWidth = buttons.length * buttonWidth + (buttons.length - 1) * spacing;
  const startX = (width - totalWidth) / 2;
  
  const buttonElements = [];
  let currentX = startX;
  
  buttons.forEach((btn, index) => {
    const buttonY = barY + (height - 60) / 2;
    
    // 绘制按钮背景
    drawRoundRect(ctx, currentX, buttonY, buttonWidth, 60, 16, btn.color || theme.primary);
    
    // 绘制文字
    ctx.font = 'bold 24px "PingFang SC", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = Colors.white;
    ctx.fillText(btn.text, currentX + buttonWidth / 2, buttonY + 30);
    
    buttonElements.push({
      ...btn,
      x: currentX,
      y: buttonY,
      width: buttonWidth,
      height: 60,
      checkHit: (px, py) => px >= currentX && px <= currentX + buttonWidth && py >= buttonY && py <= buttonY + 60
    });
    
    currentX += buttonWidth + spacing;
  });
  
  return { barY, height, buttons: buttonElements };
}

// 现代化对话框组件
export function drawModernDialog(ctx, x, y, width, height, title, content, theme, options = {}) {
  const {
    radius = 24,
    showClose = true,
    closeSize = 32,
    buttons = []
  } = options;
  
  // 绘制背景遮罩
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // 绘制对话框
  ctx.fillStyle = theme.surface;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.shadowBlur = 0;
  
  // 绘制标题
  if (title) {
    ctx.font = 'bold 32px "PingFang SC", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.text;
    ctx.fillText(title, x + width / 2, y + 50);
  }
  
  // 绘制内容
  if (content) {
    ctx.font = '24px "PingFang SC", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(content, x + width / 2, y + height / 2);
  }
  
  // 绘制关闭按钮
  if (showClose) {
    ctx.font = `${closeSize}px "Apple Color Emoji", "Segoe UI Emoji"`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText('✕', x + width - 20, y + 50);
  }
  
  // 绘制按钮
  const buttonHeight = 60;
  const buttonSpacing = 20;
  const buttonWidth = 140;
  const totalButtonsWidth = buttons.length * buttonWidth + (buttons.length - 1) * buttonSpacing;
  const buttonsStartX = x + (width - totalButtonsWidth) / 2;
  const buttonsY = y + height - buttonHeight - 40;
  
  const buttonElements = [];
  let currentX = buttonsStartX;
  
  buttons.forEach((btn, index) => {
    drawRoundRect(ctx, currentX, buttonsY, buttonWidth, buttonHeight, 16, btn.color || theme.primary);
    
    ctx.font = 'bold 24px "PingFang SC", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = Colors.white;
    ctx.fillText(btn.text, currentX + buttonWidth / 2, buttonsY + buttonHeight / 2);
    
    buttonElements.push({
      ...btn,
      x: currentX,
      y: buttonsY,
      width: buttonWidth,
      height: buttonHeight,
      checkHit: (px, py) => px >= currentX && px <= currentX + buttonWidth && py >= buttonsY && py <= buttonsY + buttonHeight
    });
    
    currentX += buttonWidth + buttonSpacing;
  });
  
  return {
    x, y, width, height,
    closeHit: showClose ? (px, py) => {
      return px >= x + width - 40 && px <= x + width && py >= y + 20 && py <= y + 80;
    } : null,
    buttons: buttonElements
  };
}

// 现代化排行榜组件
export function drawModernLeaderboard(ctx, x, y, width, height, data, theme, options = {}) {
  const {
    radius = 20,
    title = '排行榜',
    titleSize = 32,
    itemHeight = 80,
    showRank = true,
    showAvatar = true,
    showScore = true,
    maxItems = 10
  } = options;
  
  // 绘制卡片背景
  ctx.fillStyle = theme.surface;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.shadowBlur = 0;
  
  // 绘制标题
  ctx.font = `bold ${titleSize}px "PingFang SC", "Helvetica Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.text;
  ctx.fillText(title, x + width / 2, y + 50);
  
  // 绘制排行榜项目
  const items = data.slice(0, maxItems);
  const itemStartY = y + 100;
  
  items.forEach((item, index) => {
    const itemY = itemStartY + index * itemHeight;
    
    // 排名背景
    if (index < 3) {
      const gradient = ctx.createLinearGradient(x, itemY, x, itemY + itemHeight);
      gradient.addColorStop(0, theme.primary);
      gradient.addColorStop(1, theme.secondary);
      ctx.fillStyle = gradient;
      drawRoundRect(ctx, x + 10, itemY, width - 20, itemHeight, 12);
    }
    
    // 排名
    if (showRank) {
      ctx.font = 'bold 28px "PingFang SC", "Helvetica Neue", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = index < 3 ? Colors.white : theme.text;
      const rankText = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
      ctx.fillText(rankText, x + 30, itemY + itemHeight / 2);
    }
    
    // 头像/名字
    if (showAvatar) {
      ctx.font = '24px "PingFang SC", "Helvetica Neue", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = index < 3 ? Colors.white : theme.text;
      const nameX = showRank ? x + 80 : x + 30;
      ctx.fillText(item.name || `玩家${index + 1}`, nameX, itemY + itemHeight / 2 - 10);
    }
    
    // 分数
    if (showScore) {
      ctx.font = 'bold 24px "PingFang SC", "Helvetica Neue", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = index < 3 ? Colors.white : theme.text;
      ctx.fillText(`${item.score}分`, x + width - 30, itemY + itemHeight / 2);
    }
  });
  
  return { x, y, width, height, items };
}

// 导出主题
export { ModernThemes as themes };