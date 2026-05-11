/**
 * 游戏配置 - 8款精选小游戏 + 多关卡系统
 */
export const Games = [
  {
    id: 'match3',
    name: '消消乐',
    shortName: '消',
    desc: '三消宝石得高分',
    shape: 'star'
  },
  {
    id: 'snake',
    name: '贪吃蛇',
    shortName: '蛇',
    desc: '灵活躲避快成长',
    shape: 'wave'
  },
  {
    id: '2048',
    name: '2048',
    shortName: '2K',
    desc: '合并数字大挑战',
    shape: 'number'
  },
  {
    id: 'tetris',
    name: '方块',
    shortName: '方',
    desc: '经典消除不陌生',
    shape: 'block'
  },
  {
    id: 'flappy',
    name: '飞鸟',
    shortName: '飞',
    desc: '穿越障碍看反应',
    shape: 'bird'
  },
  {
    id: 'breakout',
    name: '打砖块',
    shortName: '打',
    desc: '击碎砖块真解压',
    shape: 'brick'
  },
  {
    id: 'memory',
    name: '翻牌',
    shortName: '翻',
    desc: '记忆配对练脑子',
    shape: 'card'
  },
  {
    id: 'bounce',
    name: '弹球',
    shortName: '弹',
    desc: '反弹跳跃得高分',
    shape: 'ball'
  }
];

// 多关卡配置
export const Levels = {
  // 消消乐关卡（难度递增）
  match3: [
    { grid: 6, colors: 4, moves: 20, target: 800, name: '新手入门' },
    { grid: 6, colors: 4, moves: 18, target: 1000, name: '宝石花园' },
    { grid: 6, colors: 5, moves: 20, target: 1500, name: '彩虹世界' },
    { grid: 7, colors: 5, moves: 25, target: 2000, name: '钻石迷阵' },
    { grid: 7, colors: 6, moves: 28, target: 3000, name: '星空璀璨' },
    { grid: 8, colors: 6, moves: 30, target: 4000, name: '魔法森林' },
    { grid: 8, colors: 7, moves: 35, target: 5000, name: '宝石大师' },
    { grid: 9, colors: 7, moves: 40, target: 7000, name: '传奇挑战' }
  ],

  // 2048目标挑战
  '2048': [
    { target: 512, name: '初学者' },
    { target: 1024, name: '挑战者' },
    { target: 2048, name: '大师' },
    { target: 4096, name: '传奇' },
    { target: 8192, name: '神级' }
  ],

  // 贪吃蛇速度关卡
  snake: [
    { speed: 250, name: '悠闲漫步', target: 100 },
    { speed: 200, name: '正常模式', target: 200 },
    { speed: 150, name: '快速挑战', target: 300 },
    { speed: 120, name: '极速狂飙', target: 500 },
    { speed: 90, name: '疯狂模式', target: 800 }
  ],

  // 俄罗斯方块难度
  tetris: [
    { speed: 500, name: '新手练习', lines: 10 },
    { speed: 400, name: '初级挑战', lines: 20 },
    { speed: 300, name: '中级磨练', lines: 40 },
    { speed: 200, name: '高手对决', lines: 60 },
    { speed: 150, name: '大师级别', lines: 100 }
  ],

  // 飞鸟难度
  flappy: [
    { gap: 220, speed: 3.0, spacing: 300, name: '新手飞行' },
    { gap: 200, speed: 3.5, spacing: 280, name: '正常挑战' },
    { gap: 180, speed: 4.0, spacing: 260, name: '高手飞行' },
    { gap: 160, speed: 4.5, spacing: 240, name: '极限挑战' },
    { gap: 140, speed: 5.0, spacing: 220, name: '疯狂模式' }
  ],

  // 打砖块关卡
  breakout: [
    { rows: 4, cols: 5, ballSpeed: 5, name: '轻松入门' },
    { rows: 5, cols: 6, ballSpeed: 6, name: '正常挑战' },
    { rows: 6, cols: 7, ballSpeed: 7, name: '高级难度' },
    { rows: 7, cols: 8, ballSpeed: 8, name: '大师级别' },
    { rows: 8, cols: 9, ballSpeed: 9, name: '极限挑战' }
  ],

  // 翻牌配对难度
  memory: [
    { cols: 4, rows: 3, name: '简单模式' },  // 12张牌，6对
    { cols: 4, rows: 4, name: '正常模式' },  // 16张牌，8对
    { cols: 5, rows: 4, name: '困难模式' },  // 20张牌，10对
    { cols: 6, rows: 5, name: '大师级别' },  // 30张牌，15对
    { cols: 6, rows: 6, name: '极限记忆' }   // 36张牌，18对
  ],

  // 弹球难度
  bounce: [
    { speed: 2.5, platformWidth: 140, name: '轻松弹跳' },
    { speed: 3.0, platformWidth: 120, name: '正常挑战' },
    { speed: 3.5, platformWidth: 100, name: '高手弹跳' },
    { speed: 4.0, platformWidth: 80, name: '大师级别' },
    { speed: 4.5, platformWidth: 60, name: '极限挑战' }
  ]
};

// 翻牌游戏的符号配置
export const MemorySymbols = {
  easy: ['🌟', '💎', '🔥', '⚡', '💜', '🎯'],
  normal: ['🌟', '💎', '🔥', '⚡', '💜', '🎯', '🍀', '🌈'],
  hard: ['🌟', '💎', '🔥', '⚡', '💜', '🎯', '🍀', '🌈', '🌸', '🌺'],
  master: ['🌟', '💎', '🔥', '⚡', '💜', '🎯', '🍀', '🌈', '🌸', '🌺', '🌙', '☀️', '🎈', '🎁', '🎪']
};

// 打砖块砖块颜色配置
export const BrickColors = [
  ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
  ['#dc2626', '#ea580c', '#d97706', '#059669', '#2563eb', '#7c3aed'],
  ['#b91c1c', '#c2410c', '#b45309', '#047857', '#1d4ed8', '#6d28d9']
];
