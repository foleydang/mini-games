# Yanten快乐屋 - Cocos Creator 小游戏合集

使用 Cocos Creator 3.x 开发的微信小游戏合集。

## 🎮 包含游戏

- **开心消消乐** - 经典三消游戏，关卡挑战
- **贪吃蛇** - 怀旧经典
- **2048** - 数字合并挑战
- **方块消消** - 俄罗斯方块风格

## 📥 快速开始

### 1. Clone 项目

```bash
git clone git@github.com:foleydang/mini-games-cocos.git
```

### 2. 打开 Cocos Creator

1. 打开 Cocos Creator（需要 3.8.0 或以上版本）
2. 点击「打开其他项目」
3. 选择 clone 下来的项目目录

### 3. 创建场景（首次使用）

项目打开后需要创建一个主场景：

1. 在 `assets/scenes` 目录右键 → 新建 → Scene
2. 命名为 `MainScene`
3. 双击打开场景
4. 在层级管理器中创建以下节点结构：

```
Canvas
├── Background (Sprite - 背景色)
├── UIRoot (空节点 - UI容器)
└── GameRoot (空节点 - 游戏容器)
```

5. 将 `GameController` 脚本挂载到 Canvas 节点
6. 将 UIRoot 和 GameRoot 拖到脚本的对应属性

### 4. 构建微信小游戏

1. 菜单 → 项目 → 构建发布
2. 选择发布平台：微信小游戏
3. 点击构建
4. 构建完成后点击「运行」

### 5. 在微信开发者工具中预览

构建后会自动打开微信开发者工具，可以预览和调试。

## 📁 项目结构

```
mini-games-cocos/
├── assets/
│   ├── scripts/              # TypeScript 脚本
│   │   ├── GameController.ts # 主控制器
│   │   ├── StorageManager.ts # 数据存储
│   │   ├── Match3Game.ts     # 消消乐
│   │   ├── SnakeGame.ts      # 贪吃蛇
│   │   ├── Game2048.ts       # 2048
│   │   └── TetrisGame.ts     # 方块消消
│   ├── scenes/               # 场景文件
│   └── resources/            # 资源文件
├── settings/                 # 项目设置
├── project.json              # 项目配置
└── README.md
```

## 🔧 技术特点

- ✅ TypeScript 开发
- ✅ 触摸事件系统（滑动、点击）
- ✅ Tween 动画系统
- ✅ 本地数据存储
- ✅ Safe Area 适配
- ✅ 关卡进度系统
- ✅ 签到奖励系统

## 📝 开发说明

### 添加新游戏

1. 在 `assets/scripts` 创建新的游戏脚本
2. 继承 `Component` 类
3. 在 `GameConfig.games` 中添加游戏配置
4. 在 `GameController.startGame()` 中加载对应场景

### 自定义主题颜色

修改 `GameController.COLORS` 常量：

```typescript
static readonly COLORS = {
    bgTop: new Color(248, 249, 250),    // 背景顶色
    bgBottom: new Color(233, 236, 239), // 背景底色
    accent: new Color(255, 107, 157),   // 强调色
    primary: new Color(196, 69, 105),   // 主色
    // ...
};
```

## 🚀 发布流程

1. 在 Cocos Creator 中构建微信小游戏
2. 微信开发者工具中预览调试
3. 点击「上传」提交代码
4. 在微信公众平台提交审核
5. 审核通过后发布

---

Made with ❤️ by 白执
