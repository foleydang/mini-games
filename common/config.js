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
  { id: 'sheep', name: '叠叠消', shortName: '叠', desc: '美食堆叠消消乐', shape: 'card', type: 'levels' },
  { id: 'fruit', name: '接水果', shortName: '接', desc: '水桶接住掉落水果', shape: 'fruit', type: 'levels' }
];

// 难度分层名(用于关卡卡片标签)
const TIER_NAMES = ['入门', '简单', '普通', '进阶', '困难', '专家', '大师', '宗师', '传奇', '巅峰'];
function tierName(i, n) {
  const t = Math.min(TIER_NAMES.length - 1, Math.floor(i / Math.max(1, n / TIER_NAMES.length)));
  return TIER_NAMES[t];
}

// 消消乐:网格/颜色/目标分随关卡递增,步数缓降
function genMatch3Levels(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const rows = 8 + Math.floor(p * 2);                 // 8..10
    const cols = 6 + Math.floor(p * 2);                 // 6..8
    const colors = 4 + Math.min(2, Math.floor(i / Math.ceil(n / 3))); // 4,5,6
    const moves = Math.max(18, 30 - Math.floor(i / 5)); // 30 → 18
    const target = 1000 + i * 150;                      // 目标分递增
    arr.push({ rows, cols, colors, moves, target, name: tierName(i, n) });
  }
  return arr;
}

// 打砖块:砖块行列/球速/砖块血量随关卡递增(均有封顶,防止不可玩)
function genBreakoutLevels(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const rows = Math.min(8, 3 + Math.floor(i / 7));    // 3..8
    const cols = Math.min(9, 5 + Math.floor(i / 9));    // 5..9
    const speed = Math.min(30, 15 + i * 0.4);           // 15 → 30
    const hp = Math.min(4, 1 + Math.floor(i / 12));     // 1..4(顶部砖块更硬)
    arr.push({ rows, cols, speed, hp, name: tierName(i, n) });
  }
  return arr;
}

// 翻牌:棋盘随关卡增大(取整齐可整除的布局),并叠加倒计时收紧
function genMemoryLevels(n) {
  // 递增的整齐棋盘,乘积为偶数 → pairs 为整数,rows ≤ 8
  const boards = [
    { cols: 4, rows: 3 }, // 6 对
    { cols: 4, rows: 4 }, // 8
    { cols: 6, rows: 3 }, // 9
    { cols: 5, rows: 4 }, // 10
    { cols: 6, rows: 4 }, // 12
    { cols: 4, rows: 7 }, // 14
    { cols: 6, rows: 5 }, // 15
    { cols: 4, rows: 8 }, // 16
    { cols: 6, rows: 6 }, // 18
    { cols: 5, rows: 8 }, // 20
    { cols: 6, rows: 7 }, // 21
    { cols: 6, rows: 8 }  // 24
  ];
  const arr = [];
  for (let i = 0; i < n; i++) {
    const bi = Math.min(boards.length - 1, Math.floor(i * boards.length / n));
    const b = boards[bi];
    const pairs = (b.cols * b.rows) / 2;
    const perPair = Math.max(2.2, 6 - i * 0.08);        // 每对可用秒数随关卡递减
    const timeLimit = Math.round(pairs * perPair);
    arr.push({ cols: b.cols, rows: b.rows, pairs, timeLimit, name: tierName(i, n) });
  }
  return arr;
}

// 接水果:水果数量/种类递增,半径递减(更密)
function genFruitLevels(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const types = Math.min(8, 4 + Math.floor(i / Math.ceil(n / 5))); // 4..8
    const maxFruits = 24 + i;                                        // 24..
    const radius = Math.max(22, 34 - Math.floor(i * 0.25));          // 34 → 22
    arr.push({ maxFruits, types, radius, name: tierName(i, n) });
  }
  return arr;
}

// 🎯 关卡型游戏配置
export const Levels = {
  match3: genMatch3Levels(60),
  breakout: genBreakoutLevels(50),
  memory: genMemoryLevels(50),
  fruit: genFruitLevels(60),

  // 叠叠消:羊了个羊风格,固定 2 关
  sheep: [
    { layers: 2, rows: 3, cols: 4, emojiCount: 4, name: '新手村' },
    { layers: 4, rows: 5, cols: 6, emojiCount: 8, name: '地狱模式' }
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

// 翻牌符号配置(扩到 24 种以支持大棋盘)
export const MemorySymbols = ['🌟', '💎', '🔥', '⚡', '💜', '🎯', '🍀', '🌈', '🌸', '🌺', '🌙', '☀️', '🎈', '🎁', '🎪', '🍎', '🍌', '🍇', '🍓', '🍑', '🍉', '🥝', '🍍', '🥥'];

// 打砖块颜色配置
export const BrickColors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
