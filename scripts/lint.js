#!/usr/bin/env node

/**
 * Mini-Games 语法检查脚本
 * 使用 acorn 解析器验证 ES6+ 语法，适配微信小游戏项目
 */

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

// 需要检查的文件
const jsFiles = [
  'game.js',
  'common/modern-ui.js',
  'common/level-selector.js',
  'common/theme-manager.js',
  'common/ui.js',
  'common/utils.js',
  'common/config.js',
  'common/gameBase.js',
  'common/audio.js',
  'common/userInfo.js',
  'games/2048.js',
  'games/bounce.js',
  'games/breakout.js',
  'games/flappy.js',
  'games/fruit.js',
  'games/match3.js',
  'games/memory.js',
  'games/sheep.js',
  'games/snake.js',
  'games/tetris.js'
];

let hasErrors = false;
let errorFiles = [];

console.log('🔍 语法检查中...\n');

jsFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  跳过不存在的文件: ${file}`);
    return;
  }

  try {
    const code = fs.readFileSync(filePath, 'utf8');
    
    // 使用 acorn 解析 ES6+ 模块语法
    acorn.parse(code, {
      ecmaVersion: 2020,
      sourceType: 'module',
      allowImportExportEverywhere: true
    });
    
    console.log(`✅ ${file}`);
    
  } catch (error) {
    hasErrors = true;
    errorFiles.push(file);
    
    const msg = error.message || error.toString();
    console.log(`❌ ${file}`);
    console.log(`   错误: ${msg}\n`);
  }
});

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.log(`\n❌ 发现 ${errorFiles.length} 个文件有语法错误:`);
  errorFiles.forEach(file => console.log(`   - ${file}`));
  console.log('\n请修复后重新提交！');
  process.exit(1);
} else {
  console.log(`\n✅ 所有 ${jsFiles.length} 个文件语法检查通过！`);
  process.exit(0);
}
