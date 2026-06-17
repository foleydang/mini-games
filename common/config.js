/**
 * 游戏配置 - 分为关卡型和无限型
 */

// 游戏列表
export const Games = [
  { id: 'match3', name: '消消乐', shortName: '消', desc: '三消宝石得高分', shape: 'star', type: 'levels' },
  { id: 'snake', name: '贪吃蛇', shortName: '蛇', desc: '灵活躲避快成长', shape: 'wave', type: 'endless' },
  { id: '2048', name: '2048', shortName: '2K', desc: '合并数字大挑战', shape: 'number', type: 'endless' },
  { id: 'tetris', name: '俄罗斯方块', shortName: '方', desc: '经典消除不陌生', shape: 'block', type: 'endless' },
  { id: 'flappy', name: '飞鸟', shortName: '飞', desc: '穿越障碍看反应', shape: 'bird', type: 'endless' },
  { id: 'breakout', name: '打砖块', shortName: '打', desc: '击碎砖块真解压', shape: 'brick', type: 'levels' },
  { id: 'memory', name: '翻牌', shortName: '翻', desc: '记忆配对练脑子', shape: 'card', type: 'levels' },
  { id: 'bounce', name: '弹球', shortName: '弹', desc: '反弹跳跃得高分', shape: 'ball', type: 'endless' },
  { id: 'sheep', name: '羊了个羊', shortName: '羊', desc: '堆叠消除解谜题', shape: 'card', type: 'levels' },
  { id: 'fruit', name: '水果消消乐', shortName: '果', desc: '水果掉落三消乐', shape: 'fruit', type: 'levels' }
];

// 🎯 关卡型游戏配置（有明确过关目标）
export const Levels = {
  // 消消乐：目标分数驱动，网格大小递增
  match3: [
    { cols: 6, rows: 8, colors: 4, moves: 28, target: 800, name: '入门' },
    { cols: 6, rows: 8, colors: 4, moves: 25, target: 1200, name: '简单' },
    { cols: 6, rows: 8, colors: 5, moves: 22, target: 1800, name: '普通' },
    { cols: 6, rows: 8, colors: 5, moves: 18, target: 2500, name: '困难' },
    { cols: 6, rows: 8, colors: 6, moves: 15, target: 3500, name: '专家' }
  ],

  // 水果消消乐：掉落速度递增，水果种类递增
  fruit: [
    { dropInterval: 1800, fruitCount: 4, name: '入门' },
    { dropInterval: 1400, fruitCount: 5, name: '简单' },
    { dropInterval: 1100, fruitCount: 6, name: '普通' },
    { dropInterval: 800, fruitCount: 7, name: '困难' },
    { dropInterval: 500, fruitCount: 8, name: '专家' }
  ],

  // 打砖块：砖块数量递增
  breakout: [
    { rows: 3, cols: 5, name: '入门' },
    { rows: 4, cols: 6, name: '简单' },
    { rows: 5, cols: 7, name: '普通' },
    { rows: 6, cols: 8, name: '困难' },
    { rows: 7, cols: 9, name: '专家' }
  ],

  // 羊了个羊：牌数和图案种类递增
  sheep: [
    { layers: 2, rows: 3, cols: 4, emojiCount: 4, name: '入门' },
    { layers: 3, rows: 4, cols: 5, emojiCount: 6, name: '简单' },
    { layers: 3, rows: 5, cols: 5, emojiCount: 8, name: '普通' },
    { layers: 4, rows: 5, cols: 6, emojiCount: 10, name: '困难' },
    { layers: 4, rows: 6, cols: 6, emojiCount: 12, name: '专家' }
  ],

  // 翻牌：牌数递增
  memory: [
    { cols: 4, rows: 3, pairs: 6, name: '入门' },
    { cols: 4, rows: 4, pairs: 8, name: '简单' },
    { cols: 5, rows: 4, pairs: 10, name: '普通' },
    { cols: 6, rows: 4, pairs: 12, name: '困难' },
    { cols: 6, rows: 5, pairs: 15, name: '专家' }
  ]
};

// 🏆 无限型游戏配置（里程碑成就系统）
export const Milestones = {
  // 贪吃蛇：分数里程碑 + 速度递增
  snake: {
    targets: [50, 100, 200, 500, 1000],
    names: ['铜牌', '银牌', '金牌', '白金', '钻石'],
    speedStart: 350,
    speedMin: 80,
    speedDecPerScore: 50  // 每50分加速一次
  },

  // 2048：目标块里程碑
  '2048': {
    targets: [512, 1024, 2048, 4096, 8192],
    names: ['入门', '挑战', '大师', '传奇', '神级']
  },

  // 俄罗斯方块：消除行里程碑 + 速度递增
  tetris: {
    targets: [10, 30, 50, 100, 200],
    names: ['铜牌', '银牌', '金牌', '白金', '钻石'],
    speedStart: 600,
    speedMin: 100,
    speedDecPerLines: 10  // 每10行加速一次
  },

  // 飞鸟：穿越管道里程碑 + 难度递增
  flappy: {
    targets: [5, 15, 30, 50, 100],
    names: ['起飞', '飞行', '翱翔', '云端', '天空之王'],
    gapStart: 220,
    gapMin: 140,
    gapDecPerScore: 10  // 每10分间隙缩小
  },

  // 弹球：分数里程碑 + 难度递增
  bounce: {
    targets: [50, 100, 200, 500, 1000],
    names: ['铜牌', '银牌', '金牌', '白金', '钻石'],
    speedStart: 2.5,
    speedMax: 5.5,
    speedIncPerScore: 100
  }
};

// 翻牌符号配置
export const MemorySymbols = ['🌟', '💎', '🔥', '⚡', '💜', '🎯', '🍀', '🌈', '🌸', '🌺', '🌙', '☀️', '🎈', '🎁', '🎪'];

// 打砖块颜色配置
export const BrickColors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
