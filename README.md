# Yanten快乐屋 - 微信小游戏合集

使用微信小游戏原生开发方式开发的8款精选小游戏合集。

## 🎮 包含游戏

| 游戏 | 描述 | 特色 |
|------|------|------|
| **消消乐** | 三消宝石得高分 | 六角星形图标 |
| **贪吃蛇** | 灵活躲避快成长 | 波浪形图标 |
| **2048** | 合并数字大挑战 | 数字形图标 |
| **方块** | 经典消除不陌生 | 方块形图标 |
| **飞鸟** | 穿越障碍看反应 | 鸟形图标 |
| **打砖块** | 击碎砖块真解压 | 砖块形图标 |
| **翻牌** | 记忆配对考眼力 | 卡片形图标 |
| **弹球** | 控制角度得高分 | 圆形图标 |

## 📦 项目结构

```
mini-games/
├── game.js          # 主入口（游戏选择、切换）
├── game.json        # 游戏配置
├── project.config.json  # 微信开发者工具配置
├── common/
│   ├── config.js    # 游戏列表配置
│   └── utils.js     # 公共工具（绘图、粒子、存储）
└── games/           # 游戏模块（待添加）
    ├── match3.js    # 消消乐
    ├── snake.js     # 贪吃蛇
    ├── 2048.js      # 2048
    ├── tetris.js    # 方块
    ├── flappy.js    # 飞鸟
    ├── breakout.js  # 打砖块
    ├── memory.js    # 翻牌
    └── bounce.js    # 弹球
```

## 📥 快速开始

### 1. 导入微信开发者工具

1. 打开微信开发者工具
2. 选择「小游戏」项目
3. 导入本项目目录

### 2. 配置AppID

在 `project.config.json` 中修改：
```json
{
  "appid": "你的小游戏AppID"
}
```

### 3. 预览测试

点击「预览」或「真机调试」测试游戏

## 🔧 技术特点

- ✅ 微信小游戏原生开发（纯JavaScript）
- ✅ Canvas 2D绘图引擎
- ✅ 触摸事件系统（滑动、点击）
- ✅ 粒子动画系统
- ✅ 本地数据存储（wx.setStorageSync）
- ✅ 分享功能（wx.shareAppMessage）
- ✅ 渐变背景、圆角按钮、游戏卡片
- ✅ 包体体积优化（< 1MB）

## 📝 开发说明

### 添加新游戏

1. 在 `games/` 创建新的游戏脚本（如 `newgame.js`）
2. 导出游戏类：`export default class NewGame { ... }`
3. 在 `common/config.js` 的 `Games` 数组中添加配置：
```javascript
{
  id: 'newgame',
  name: '新游戏',
  shortName: '新',
  desc: '游戏描述',
  shape: 'circle'  // 图标形状
}
```
4. 在 `game.js` 中导入：`import NewGame from './games/newgame.js'`

### 自定义主题颜色

修改 `common/utils.js` 中的 `Colors` 常量：

```javascript
export const Colors = {
  bgTop: '#f8f9fa',     // 背景顶色
  bgBottom: '#e9ecef',  // 背景底色
  accent: '#ff6b9d',    // 强调色
  primary: '#c44569',   // 主色
  // ...
};
```

## 🚀 发布流程

1. 在微信开发者工具中预览调试
2. 点击「上传」提交代码
3. 在微信公众平台提交审核
4. 审核通过后发布

---

Made with ❤️ by 白执
