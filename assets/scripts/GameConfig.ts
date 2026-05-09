import { Color } from 'cc';

export const GameConfig = {
    name: 'Yanten快乐屋',
    games: [
        { id: 'match3', name: '开心消消乐', icon: '🌟', color: new Color(255, 107, 107) },
        { id: 'snake', name: '贪吃蛇', icon: '🐍', color: new Color(78, 205, 196) },
        { id: '2048', name: '2048', icon: '🎯', color: new Color(255, 230, 109) },
        { id: 'tetris', name: '俄罗斯方块', icon: '🧩', color: new Color(170, 150, 218) }
    ]
};

export const COLORS = {
    bg: new Color(248, 249, 250),
    accent: new Color(255, 107, 157),
    primary: new Color(196, 69, 105),
    text: new Color(45, 52, 54),
    cardBg: new Color(255, 255, 255),
    gems: [
        new Color(255, 107, 107),  // 0 - Red
        new Color(78, 205, 196),   // 1 - Teal
        new Color(255, 230, 109),  // 2 - Yellow
        new Color(170, 150, 218),  // 3 - Purple
        new Color(107, 185, 255),  // 4 - Blue
        new Color(255, 165, 0),    // 5 - Orange
    ]
};
