# Mini-Games 语法检查工具

## 已添加的工具

### 1. 核心检查脚本：`scripts/lint.js`
使用 `acorn` 解析器检查所有 JavaScript 文件的 ES6+ 语法。

**使用方法：**
```bash
node scripts/lint.js
```

**功能：**
- 检查 20 个主要 JS 文件的语法
- 支持 ES6+ 语法（import/export、箭头函数、class 等）
- 输出详细的错误信息（文件名、行号、错误类型）
- 通过/失败状态码（0=通过，1=失败）

### 2. 预提交钩子：`.git/hooks/pre-commit`
每次 `git commit` 时自动运行语法检查。

**功能：**
- 自动阻止包含语法错误的提交
- 确保代码库始终保持语法正确

**测试钩子：**
```bash
# 创建一个测试文件（故意包含语法错误）
echo "function test() { " > test-syntax.js
git add test-syntax.js
git commit -m "test"  # 应该被阻止

# 清理
git reset HEAD test-syntax.js
rm test-syntax.js
```

### 3. 其他辅助脚本
- `scripts/pre-commit.sh` - 完整的预提交检查（语法 + 文件大小 + TODO）
- `scripts/simple-check.js` - 简化版检查
- `scripts/compile-check.js` - 编译检查脚本

## 本次修复的错误

### 1. `game.js` - 重复变量声明
**问题：** 在 `renderSettings()` 函数中重复声明了 `startX` 变量
**修复：** 将第二个 `startX` 改为 `toggleStartX`

### 2. `common/modern-ui.js` - 对象结构错误
**问题：** `ModernThemes` 对象中有重复的游戏主题条目（snake、2048、tetris 等），且对象结构混乱
**修复：** 
- 移除了重复的条目
- 正确组织 `gameThemes` 和 `themePresets` 对象结构
- 添加了缺失的 `2048` 和 `flappy` 主题到 `gameThemes`

### 3. `common/level-selector.js` - 方法位置错误
**问题：** `drawCard()` 方法被放在了类定义之外
**修复：** 将方法移回 `LevelSelector` 类内部

### 4. `games/memory.js` - 重复闭合括号
**问题：** 构造函数结束处有多余的 `}`
**修复：** 移除重复的闭合括号

### 5. `games/sheep.js` - 重复闭合括号
**问题：** 构造函数结束处有多余的 `}`
**修复：** 移除重复的闭合括号

## 工作流程

### 日常开发流程
1. 修改代码
2. 运行 `node scripts/lint.js` 检查语法
3. 修复任何错误
4. 提交代码（钩子会自动检查）

### 如果提交被阻止
1. 查看错误信息
2. 修复对应的文件和行号
3. 重新运行 `node scripts/lint.js` 确认修复
4. 再次尝试提交

## 依赖

- `acorn` - JavaScript 解析器（已添加到 `package.json`）

安装依赖：
```bash
npm install
```

## 注意事项

1. **不要禁用预提交钩子** - 它保护代码库免受语法错误影响
2. **定期检查** - 即使不提交，也建议定期运行 `node scripts/lint.js`
3. **新增文件** - 如果添加了新的 JS 文件，需要将其添加到 `scripts/lint.js` 的检查列表中

## 验证

运行以下命令验证所有工具正常工作：
```bash
node scripts/lint.js
# 应该输出：✅ 所有 20 个文件语法检查通过！
```
