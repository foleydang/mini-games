/**
 * 精美视觉工具函数 - 鲜明活力风格
 */

// 获取安全区域信息
export function getSafeArea() {
  const info = wx.getSystemInfoSync();
  return {
    screenWidth: info.screenWidth,
    screenHeight: info.screenHeight,
    safeArea: info.safeArea,
    statusBarHeight: info.statusBarHeight || 0,
    pixelRatio: info.pixelRatio || 1
  };
}

// 适配后的设计尺寸（基于整个屏幕高度）
export function getDesignSize() {
  const info = getSafeArea();
  const designWidth = 750;
  // 使用整个屏幕高度，不是 safeArea.height，这样触摸坐标和绘制坐标一致
  const designHeight = Math.floor(info.screenHeight * designWidth / info.screenWidth);
  return {
    width: designWidth,
    height: designHeight,
    // safeTop 表示内容区域的起始位置（相对于屏幕顶部）
    safeTop: Math.floor(info.safeArea.top * designWidth / info.screenWidth),
    safeBottom: Math.floor((info.screenHeight - info.safeArea.bottom) * designWidth / info.screenWidth)
  };
}

// 鲜明配色系统 - 更醒目
export const Colors = {
  // 主背景
  bgPrimary: '#f0f4f8',
  bgCard: '#ffffff',

  // 文字色 - 更深更醒目
  text: '#2d3436',
  textDark: '#1a1a1a',
  textLight: '#636e72',
  textMuted: '#b2bec3',
  white: '#ffffff',

  // 辅助色 - 更鲜明
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  primary: '#8b5cf6',

  // 游戏专属主题 - 鲜明配色
  themes: {
    match3: {
      primary: '#ef4444',
      secondary: '#fca5a5',
      bg: '#fef2f2',
      pattern: '#fee2e2'
    },
    snake: {
      primary: '#10b981',
      secondary: '#6ee7b7',
      bg: '#ecfdf5',
      pattern: '#d1fae5'
    },
    '2048': {
      primary: '#f59e0b',
      secondary: '#fcd34d',
      bg: '#fffbeb',
      pattern: '#fef3c7'
    },
    tetris: {
      primary: '#3b82f6',
      secondary: '#93c5fd',
      bg: '#eff6ff',
      pattern: '#dbeafe'
    },
    flappy: {
      primary: '#f59e0b',
      secondary: '#fcd34d',
      bg: '#fffbeb',
      pattern: '#fef3c7'
    },
    breakout: {
      primary: '#8b5cf6',
      secondary: '#c4b5fd',
      bg: '#f5f3ff',
      pattern: '#ede9fe'
    },
    memory: {
      primary: '#06b6d4',
      secondary: '#67e8f9',
      bg: '#ecfeff',
      pattern: '#cffafe'
    },
    bounce: {
      primary: '#ec4899',
      secondary: '#f9a8d4',
      bg: '#fdf2f8',
      pattern: '#fce7f3'
    },
    sheep: {
      primary: '#d97706',
      secondary: '#fbbf24',
      bg: '#fffbeb',
      pattern: '#fef3c7'
    },
    fruit: {
      primary: '#10b981',
      secondary: '#34d399',
      bg: '#ecfdf5',
      pattern: '#d1fae5'
    }
  },

  // 消消乐宝石色 - 更鲜明
  // 消消乐宝石色 - 更鲜艳有层次感的设计
  gems: [
    '#ff4757', // 红宝石 - 鲜红
    '#2ed573', // 绿宝石 - 鲜绿
    '#1e90ff', // 蓝宝石 - 钴蓝
    '#ffa502', // 黄宝石 - 金黄
    '#ff6b81', // 粉宝石 - 玫粉
    '#a55eea'  //紫宝石 - 紫罗兰
  ],

  // 贪吃蛇
  snake: '#10b981',
  snakeHead: '#059669',
  food: '#ef4444',

  // 2048 颜色 - 更鲜明
  get2048Color(value) {
    const colors = {
      0: '#e5e7eb',
      2: '#fef3c7',
      4: '#fcd34d',
      8: '#fbbf24',
      16: '#f97316',
      32: '#ef4444',
      64: '#dc2626',
      128: '#c4b5fd',
      256: '#8b5cf6',
      512: '#7c3aed',
      1024: '#3b82f6',
      2048: '#10b981'
    };
    return colors[value] || '#1f2937';
  },

  // 俄罗斯方块色 - 更鲜明
  tetris: ['#3b82f6', '#fbbf24', '#8b5cf6', '#10b981', '#f97316', '#ec4899', '#ef4444']
};

// 绘制圆角矩形
export function drawRoundRect(ctx, x, y, width, height, radius, fillColor, strokeColor = null, strokeWidth = 0) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

// 绘制卡片背景（带装饰图案）
export function drawGameCardBg(ctx, x, y, width, height, theme) {
  // 阴影效果
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  // 主背景色
  drawRoundRect(ctx, x, y, width, height, 28, theme.bg, theme.primary, 3);

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 添加装饰图案
  ctx.globalAlpha = 0.2;

  // 底部装饰条纹
  ctx.strokeStyle = theme.pattern;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 30, y + height - 35);
  ctx.lineTo(x + width - 30, y + height - 35);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 50, y + height - 50);
  ctx.lineTo(x + width - 50, y + height - 50);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

// 绘制按钮 - 更醒目
export function drawButton(ctx, x, y, width, height, text, color, options = {}) {
  const { radius = 20, fontSize = 20 } = options;

  // 柔和阴影
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  drawRoundRect(ctx, x, y, width, height, radius, color);

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  drawText(ctx, text, x + width / 2, y + height / 2, {
    fontSize,
    color: Colors.white,
    bold: true
  });
}

// 绘制文字 - 支持更大字体
export function drawText(ctx, text, x, y, options = {}) {
  const {
    fontSize = 30,
    color = Colors.text,
    align = 'center',
    baseline = 'middle',
    bold = false
  } = options;

  ctx.font = `${bold ? 'bold ' : ''}${fontSize}px "PingFang SC", "Helvetica Neue", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
}

// 绘制圆形
export function drawCircle(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// 绘制游戏图标（替代emoji，用几何图形）
export function drawGameIcon(ctx, x, y, radius, color, shape) {
  ctx.save();

  // 根据shape绘制不同图形
  switch(shape) {
    case 'star':  // 六角星 - 消消乐
      drawStar(ctx, x, y, radius, color);
      break;
    case 'wave':  // 波浪 - 贪吃蛇
      drawWaveIcon(ctx, x, y, radius, color);
      break;
    case 'number':  // 数字 - 2048
      drawNumberIcon(ctx, x, y, radius, color);
      break;
    case 'block':  // 方块 - 俄罗斯方块
      drawBlockIcon(ctx, x, y, radius, color);
      break;
    case 'bird':  // 鸟形 - 飞鸟
      drawBirdIcon(ctx, x, y, radius, color);
      break;
    case 'brick':  // 砖块 - 打砖块
      drawBrickIcon(ctx, x, y, radius, color);
      break;
    case 'card':  // 卡片 - 翻牌
      drawCardIcon(ctx, x, y, radius, color);
      break;
    case 'ball':  // 球形 - 弹球
      drawBallIcon(ctx, x, y, radius, color);
      break;
    default:
      drawCircle(ctx, x, y, radius, color);
  }

  ctx.restore();
}

// 六角星
function drawStar(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 90) * Math.PI / 180;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // 内部亮点
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 90) * Math.PI / 180;
    const px = x + radius * 0.5 * Math.cos(angle);
    const py = y + radius * 0.5 * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// 波浪图标 - 贪吃蛇
function drawWaveIcon(ctx, x, y, radius, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = radius * 0.3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x - radius * 0.6, y + radius * 0.3);
  ctx.quadraticCurveTo(x - radius * 0.3, y - radius * 0.4, x, y + radius * 0.3);
  ctx.quadraticCurveTo(x + radius * 0.3, y - radius * 0.4, x + radius * 0.6, y + radius * 0.3);
  ctx.stroke();
}

// 数字图标 - 2048
function drawNumberIcon(ctx, x, y, radius, color) {
  // 方形背景
  const size = radius * 1.4;
  drawRoundRect(ctx, x - size/2, y - size/2, size, size, size * 0.15, color);

  // 数字
  drawText(ctx, '2K', x, y, { fontSize: radius * 0.9, color: '#fff', bold: true });
}

// 方块图标 - 俄罗斯方块
function drawBlockIcon(ctx, x, y, radius, color) {
  const blockSize = radius * 0.45;
  const gap = 4;

  // 四个小方块组成L形
  ctx.fillStyle = color;

  // 左上
  drawRoundRect(ctx, x - radius * 0.7, y - radius * 0.7, blockSize, blockSize, 4, color);
  // 右上
  drawRoundRect(ctx, x - radius * 0.7 + blockSize + gap, y - radius * 0.7, blockSize, blockSize, 4, color);
  // 左下
  drawRoundRect(ctx, x - radius * 0.7, y - radius * 0.7 + blockSize + gap, blockSize, blockSize, 4, color);
  // 中下
  drawRoundRect(ctx, x - radius * 0.7 + blockSize + gap, y - radius * 0.7 + blockSize + gap, blockSize, blockSize, 4, color);
}

// 鸟形图标
function drawBirdIcon(ctx, x, y, radius, color) {
  ctx.fillStyle = color;

  // 身体 - 圆形
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // 翅膀 - 三角
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.3, y);
  ctx.lineTo(x - radius * 0.9, y - radius * 0.3);
  ctx.lineTo(x - radius * 0.9, y + radius * 0.3);
  ctx.closePath();
  ctx.fill();

  // 眼睛
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + radius * 0.15, y - radius * 0.1, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

// 砖块图标
function drawBrickIcon(ctx, x, y, radius, color) {
  const brickW = radius * 0.6;
  const brickH = radius * 0.35;
  const gap = 6;

  ctx.fillStyle = color;

  // 三排砖块
  drawRoundRect(ctx, x - radius * 0.9, y - radius * 0.6, brickW, brickH, 3, color);
  drawRoundRect(ctx, x - radius * 0.9 + brickW + gap, y - radius * 0.6, brickW, brickH, 3, color);

  drawRoundRect(ctx, x - radius * 0.9 + brickW * 0.3, y - radius * 0.6 + brickH + gap, brickW, brickH, 3, color);
  drawRoundRect(ctx, x - radius * 0.9 + brickW + gap + brickW * 0.3, y - radius * 0.6 + brickH + gap, brickW, brickH, 3, color);
}

// 卡片图标
function drawCardIcon(ctx, x, y, radius, color) {
  // 两张重叠的卡片
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  drawRoundRect(ctx, x - radius * 0.8 + 8, y - radius * 0.55 + 6, radius * 0.9, radius * 1.1, 6, 'rgba(255,255,255,0.5)');

  ctx.fillStyle = color;
  drawRoundRect(ctx, x - radius * 0.8, y - radius * 0.55, radius * 0.9, radius * 1.1, 6, color);

  // 问号
  drawText(ctx, '?', x - radius * 0.35, y, { fontSize: radius * 0.6, color: '#fff', bold: true });
}

// 球形图标
function drawBallIcon(ctx, x, y, radius, color) {
  // 主球
  drawCircle(ctx, x, y, radius * 0.6, color);

  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.15, y - radius * 0.15, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

// 绘制进度条 - 更醒目
export function drawProgress(ctx, x, y, width, height, progress, color, radius = 16) {
  drawRoundRect(ctx, x, y, width, height, radius, '#e5e7eb');
  if (progress > 0) {
    const pw = Math.max(width * progress, height);
    drawRoundRect(ctx, x, y, pw, height, radius, color);
  }
}

// 绘制渐变背景
export function drawGradientBg(ctx, width, height, color1, color2) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// 绘制粒子（简化版）
export function drawParticles(ctx, particles) {
  particles.forEach(p => {
    ctx.globalAlpha = p.alpha * 0.3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// 生成粒子
export function generateParticles(width, height, count, color) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 4 + 2,
      alpha: Math.random() * 0.15 + 0.05,
      color,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3
    });
  }
  return particles;
}

// 更新粒子
export function updateParticles(particles, width, height) {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;
  });
}

// 本地存储
export const Storage = {
  // wx.setStorageSync 本身支持对象存储，不需要额外 JSON 序列化
  save(key, value) {
    try { wx.setStorageSync(key, value); } catch (e) { console.error('存储失败:', e); }
  },
  load(key) {
    try { return wx.getStorageSync(key) || null; } catch (e) { return null; }
  },
  remove(key) {
    try { wx.removeStorageSync(key); } catch (e) { }
  }
};

// 触摸位置转换
export function getTouchPos(touch, designSize) {
  const info = wx.getSystemInfoSync();
  const ratio = designSize.width / info.screenWidth;
  
  // clientY 是相对于屏幕顶部的坐标
  // canvas 绘制也从屏幕顶部开始，按钮绘制用 safeTop + offset（也是相对于屏幕顶部）
  // 所以直接转换，不减去 safeTop，保持坐标系一致
  
  const x = Math.floor(touch.clientX * ratio);
  const y = Math.floor(touch.clientY * ratio);
  
  
  return { x, y };
}

// 分享
export function shareGame(gameName, score) {
  wx.shareAppMessage({
    title: `我在${gameName}获得了${score}分！来铃铛快乐屋挑战我吧！`,
    path: '/game.js',
    imageUrl: ''
  });
}


// 排行榜 - 使用服务器API（支持用户系统）
const API_BASE = 'https://api.yanten.top/api/games';

// 获取/生成用户唯一ID
function getOpenId() {
  try {
    let openid = wx.getStorageSync('game_openid');
    if (!openid) {
      // 生成唯一ID: 时间戳 + 随机数
      openid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      wx.setStorageSync('game_openid', openid);
    }
    return openid;
  } catch (e) {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// 同步用户设置到服务器
export function syncUserToServer(profile) {
  const openid = getOpenId();
  wx.request({
    url: `${API_BASE}/user`,
    method: 'POST',
    data: {
      openid: openid,
      nickname: profile.nickname || '玩家',
      avatarIndex: profile.avatarIndex || 0
    },
    header: { 'content-type': 'application/json' },
    success: (res) => console.log('用户同步成功:', res.data),
    fail: (e) => console.log('用户同步失败:', e)
  });
}

// 获取用户信息（从服务器）
export async function getUserFromServer() {
  const openid = getOpenId();
  try {
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${API_BASE}/user/${openid}`,
        method: 'GET',
        success: resolve,
        fail: reject
      });
    });
    if (res.data && res.data.success && res.data.data) {
      return res.data.data;
    }
  } catch (e) {
    console.log('获取用户信息失败:', e);
  }
  return null;
}

export const RankData = {
  // 同步获取排行榜（本地缓存）
  getRank(gameId, sortType = 'desc') {
    const data = Storage.load('rank_' + gameId) || [];
    const filtered = data.filter(item => item.score > 0);
    return filtered.sort((a, b) => sortType === 'asc' ? a.score - b.score : b.score - a.score);
  },
  
  // 异步从服务器获取排行榜
  async getRankFromCloud(gameId, sortType = 'desc') {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${API_BASE}/rank/${gameId}`,
          method: 'GET',
          data: { sort: sortType, limit: 10 },
          success: resolve,
          fail: reject
        });
      });
      
      if (res.data && res.data.success && res.data.data) {
        Storage.save('rank_' + gameId, res.data.data);
        return res.data.data;
      }
    } catch (e) {
      console.log('服务器获取排行榜失败:', e);
    }
    return null;
  },
  
  // 添加排行榜记录
  addRank(gameId, score, name = '玩家', sortType = 'desc') {
    if (!score || score <= 0) return;
    
    // 获取用户设置的昵称和头像
    let nickname = name;
    let avatarIndex = 0;
    let avatarColor = '#7c3aed';
    
    try {
      const myProfile = wx.getStorageSync('myProfile');
      if (myProfile) {
        nickname = myProfile.nickname || name;
        avatarIndex = myProfile.avatarIndex || 0;
        avatarColor = myProfile.avatarColor || '#7c3aed';
      }
    } catch (e) {}
    
    // 头像使用颜色索引，服务器端会转换为颜色
    const avatar = `color:${avatarIndex}`;
    
    // 本地存储
    const data = this.getRank(gameId, sortType);
    data.push({ 
      score, 
      name: nickname,
      nickname: nickname,
      avatar: avatar,
      date: new Date().toLocaleDateString("zh-CN") 
    });
    const top10 = data.sort((a, b) => sortType === 'asc' ? a.score - b.score : b.score - a.score).slice(0, 10);
    Storage.save('rank_' + gameId, top10);
    
    // 异步提交到服务器
    wx.request({
      url: `${API_BASE}/rank/${gameId}`,
      method: 'POST',
      data: { 
        score, 
        nickname: nickname,
        avatar: avatar,
        openid: getOpenId()
      },
      header: { 'content-type': 'application/json' },
      success: (res) => console.log('排行榜提交成功'),
      fail: (e) => console.log('排行榜提交失败:', e)
    });
  },
  
  // 获取用户信息（从本地存储）
  getUserInfo() {
    try {
      return wx.getStorageSync('userInfo') || null;
    } catch (e) {
      return null;
    }
  },
  
  save(gameId, score) {
    this.addRank(gameId, score, '玩家');
  },
  
  clearRank(gameId) {
    Storage.remove('rank_' + gameId);
  }
};
// 兼容旧函数名
export const drawNeonRoundRect = drawRoundRect;
export const drawNeonButton = drawButton;
export const drawGlowCircle = drawCircle;
export const drawNeonProgress = drawProgress;
export const drawGlowGrid = () => {};
export const drawCard = (ctx, x, y, w, h, borderColor, opts = {}) => {
  const radius = opts.radius || 24;
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  drawRoundRect(ctx, x, y, w, h, radius, Colors.bgCard, borderColor, opts.selected ? 3 : 2);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
};
// 游戏设置管理
export const GameSettings = {
  defaults: {
    soundEnabled: true,
    musicEnabled: true,
    vibrationEnabled: true
  },
  get() {
    const saved = Storage.load('gameSettings');
    return saved ? { ...this.defaults, ...saved } : this.defaults;
  },
  save(settings) {
    Storage.save('gameSettings', settings);
  },
  toggle(key) {
    const settings = this.get();
    settings[key] = !settings[key];
    this.save(settings);
    return settings;
  }
};

// 绘制开关按钮
export function drawToggle(ctx, x, y, width, height, isOn, label) {
  const bgColor = isOn ? '#10b981' : '#d1d5db';
  drawRoundRect(ctx, x, y, width, height, height / 2, bgColor);
  const dotRadius = height / 2 - 4;
  const dotX = isOn ? x + width - dotRadius - 4 : x + dotRadius + 4;
  ctx.beginPath();
  ctx.arc(dotX, y + height / 2, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  drawText(ctx, label, x - 20, y + height / 2, { fontSize: 28, color: Colors.text, align: 'right' });
}
