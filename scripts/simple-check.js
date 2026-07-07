#!/usr/bin/env node

/**
 * 简化的JavaScript语法检查脚本
 * 只检查真正的语法错误，不检查代码风格
 */

const fs = require('fs');
const path = require('path');

// 需要检查的JavaScript文件列表
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

console.log('🔍 开始简化语法检查...');

jsFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ 文件不存在: ${file}`);
    hasErrors = true;
    return;
  }

  try {
    const code = fs.readFileSync(filePath, 'utf8');
    
    // 检查明显的语法错误
    const errors = [];
    
    // 检查未闭合的字符串
    const stringMatches = code.match(/(['"`])[\s\S]*?$/gm);
    if (stringMatches) {
      stringMatches.forEach((match, index) => {
        if (!match.match(/(['"`])[\s\S]*?\1/)) {
          const lineNum = (code.substring(0, code.indexOf(match)).match(/\n/g) || []).length + 1;
          errors.push(`${file}:${lineNum} - 未闭合的字符串`);
        }
      });
    }
    
    // 检查明显的括号不匹配（只检查简单情况）
    const openBrackets = (code.match(/\(/g) || []).length;
    const closeBrackets = (code.match(/\)/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push(`${file} - 圆括号不匹配 (开: ${openBrackets}, 闭: ${closeBrackets})`);
    }
    
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`${file} - 花括号不匹配 (开: ${openBraces}, 闭: ${closeBraces})`);
    }
    
    // 检查明显的语法错误
    const syntaxErrors = [
      // 检查函数定义后缺少分号
      { pattern: /function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}\s*[a-zA-Z_]/g, message: '函数定义后可能缺少分号或换行' },
      // 检查对象字面量后缺少分号
      { pattern: /\{[^}]*\}\s*[a-zA-Z_]/g, message: '对象字面量后可能缺少分号' },
      // 检查明显的语法错误
      { pattern: /;\s*\n\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\(/g, message: '可能缺少分号' },
    ];
    
    syntaxErrors.forEach(({ pattern, message }) => {
      const matches = code.match(pattern);
      if (matches) {
        matches.slice(0, 3).forEach((match, index) => {
          const lineNum = (code.substring(0, code.indexOf(match)).match(/\n/g) || []).length + 1;
          errors.push(`${file}:${lineNum} - ${message}`);
        });
      }
    });
    
    if (errors.length > 0) {
      console.log(`❌ ${file} 发现错误:`);
      errors.slice(0, 5).forEach(error => console.log(`  ${error}`));
      if (errors.length > 5) {
        console.log(`  ... 还有 ${errors.length - 5} 个错误`);
      }
      hasErrors = true;
    } else {
      console.log(`✅ ${file} - 语法检查通过`);
    }
    
  } catch (error) {
    console.log(`❌ ${file} - 检查失败: ${error.message}`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.log('\n❌ 发现语法错误，请修复后再提交！');
  process.exit(1);
} else {
  console.log('\n✅ 所有语法检查通过！');
  process.exit(0);
}