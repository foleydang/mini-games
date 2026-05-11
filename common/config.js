/**
 * 游戏配置 - 8款精选小游戏
 */
export const Games = [
  {
    id: 'match3',
    name: '消消乐',
    shortName: '消',
    desc: '三消宝石得高分',
    shape: 'star'  // 六角星形
  },
  {
    id: 'snake',
    name: '贪吃蛇',
    shortName: '蛇',
    desc: '灵活躲避快成长',
    shape: 'wave'  // 波浪形
  },
  {
    id: '2048',
    name: '2048',
    shortName: '2K',
    desc: '合并数字大挑战',
    shape: 'number'  // 数字形
  },
  {
    id: 'tetris',
    name: '方块',
    shortName: '方',
    desc: '经典消除不陌生',
    shape: 'block'  // 方块形
  },
  {
    id: 'flappy',
    name: '飞鸟',
    shortName: '飞',
    desc: '穿越障碍看反应',
    shape: 'bird'  // 鸟形
  },
  {
    id: 'breakout',
    name: '打砖块',
    shortName: '打',
    desc: '击碎砖块真解压',
    shape: 'brick'  // 砖块形
  },
  {
    id: 'memory',
    name: '翻牌',
    shortName: '翻',
    desc: '记忆配对练脑子',
    shape: 'card'  // 卡片形
  },
  {
    id: 'bounce',
    name: '弹球',
    shortName: '弹',
    desc: '反弹跳跃得高分',
    shape: 'ball'  // 圆球形
  }
];

export const Levels = {
  match3: [
    { grid: 6, colors: 4, moves: 15, target: 1000 },
    { grid: 6, colors: 5, moves: 20, target: 2000 },
    { grid: 7, colors: 5, moves: 25, target: 3000 },
    { grid: 8, colors: 6, moves: 30, target: 5000 }
  ]
};