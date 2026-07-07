// 测试所有功能是否正常工作
const fs = require('fs');

console.log('=== Mini-Games 优化测试 ===\n');

// 1. 检查关键文件是否存在
const requiredFiles = [
  'common/modern-ui.js',
  'common/level-selector.js', 
  'common/theme-manager.js',
  'common/config.js',
  'game.js'
];

console.log('1. 检查关键文件:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
  }
});

// 2. 检查游戏文件
console.log('\n2. 检查游戏文件:');
const gameFiles = [
  'games/match3.js',
  'games/breakout.js',
  'games/memory.js',
  'games/fruit.js',
  'games/sheep.js',
  'games/snake.js',
  'games/2048.js',
  'games/tetris.js',
  'games/flappy.js',
  'games/bounce.js'
];

gameFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
  }
});

// 3. 检查关键功能
console.log('\n3. 检查关键功能:');

// 检查 modern-ui.js 是否包含 drawModernTag
const modernUiContent = fs.readFileSync('common/modern-ui.js', 'utf8');
if (modernUiContent.includes('export function drawModernTag')) {
  console.log('✅ drawModernTag 函数已定义');
} else {
  console.log('❌ drawModernTag 函数未找到');
}

// 检查 level-selector.js 是否包含 drawModernTag
const levelSelectorContent = fs.readFileSync('common/level-selector.js', 'utf8');
if (levelSelectorContent.includes('drawModernTag')) {
  console.log('✅ level-selector.js 使用 drawModernTag');
} else {
  console.log('❌ level-selector.js 未使用 drawModernTag');
}

// 检查 game.js 是否包含 drawModernTag
const gameContent = fs.readFileSync('game.js', 'utf8');
if (gameContent.includes('drawModernTag')) {
  console.log('✅ game.js 使用 drawModernTag');
} else {
  console.log('❌ game.js 未使用 drawModernTag');
}

// 检查主题管理器
const themeManagerContent = fs.readFileSync('common/theme-manager.js', 'utf8');
if (themeManagerContent.includes('export const themeManager')) {
  console.log('✅ themeManager 已导出');
} else {
  console.log('❌ themeManager 未导出');
}

// 检查关卡游戏是否支持 level 参数
console.log('\n4. 检查关卡游戏是否支持 level 参数:');
const levelGames = ['match3', 'breakout', 'memory', 'fruit', 'sheep'];
levelGames.forEach(game => {
  const gameContent = fs.readFileSync(`games/${game}.js`, 'utf8');
  if (gameContent.includes('constructor(canvas, ctx, designSize, onEnd, level = 0)')) {
    console.log(`✅ ${game}.js 支持 level 参数`);
  } else {
    console.log(`❌ ${game}.js 不支持 level 参数`);
  }
});

console.log('\n=== 测试完成 ===');