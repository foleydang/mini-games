#!/usr/bin/env node

/**
 * Mini-Games 预提交检查脚本
 * 专门为微信小游戏设计的语法检查
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

console.log('🔍 开始预提交检查（微信小游戏专用）...');

jsFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ 文件不存在: ${file}`);
    hasErrors = true;
    return;
  }

  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const errors = [];
    
    // 检查真正的语法错误
    // 1. 检查未闭合的字符串
    const stringLines = code.split('\n');
    for (let i = 0; i < stringLines.length; i++) {
      const line = stringLines[i];
      // 检查是否有未闭合的字符串（排除注释）
      const stringMatch = line.match(/(['"`])[^'"`]*$/);
      if (stringMatch && !line.trim().startsWith('//')) {
        // 检查下一行是否继续字符串
        if (i + 1 < stringLines.length) {
          const nextLine = stringLines[i + 1];
          if (!nextLine.match(/^[^'"`]*\1/) && !nextLine.trim().startsWith('//')) {
            errors.push(`第${i + 1}行: 未闭合的字符串`);
          }
        }
      }
    }
    
    // 2. 检查明显的语法错误
    const syntaxErrors = [
      // 检查函数定义后直接跟变量（缺少分号或换行）
      { pattern: /function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}\s*[a-zA-Z_][a-zA-Z0-9_]*/g, message: '函数定义后缺少分号或换行' },
      // 检查对象字面量后直接跟变量（缺少分号）
      { pattern: /\{[^}]*\}\s*[a-zA-Z_][a-zA-Z0-9_]*/g, message: '对象字面量后缺少分号' },
      // 检查明显的语法错误
      { pattern: /;\s*\n\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\(/g, message: '可能缺少分号' },
    ];
    
    syntaxErrors.forEach(({ pattern, message }) => {
      const matches = code.match(pattern);
      if (matches) {
        matches.slice(0, 3).forEach((match, index) => {
          const lineNum = (code.substring(0, code.indexOf(match)).match(/\n/g) || []).length + 1;
          errors.push(`第${lineNum}行: ${message}`);
        });
      }
    });
    
    // 3. 检查括号匹配
    const openBrackets = (code.match(/\(/g) || []).length;
    const closeBrackets = (code.match(/\)/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push(`圆括号不匹配 (开: ${openBrackets}, 闭: ${closeBrackets})`);
    }
    
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`花括号不匹配 (开: ${openBraces}, 闭: ${closeBraces})`);
    }
    
    if (errors.length > 0) {
      console.log(`❌ ${file} 发现错误:`);
      errors.slice(0, 3).forEach(error => console.log(`  ${error}`));
      if (errors.length > 3) {
        console.log(`  ... 还有 ${errors.length - 3} 个错误`);
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

// 检查ES6兼容性（小程序支持）
console.log('\n🔍 检查ES6语法兼容性...');
const es6Features = [
  { pattern: /import\s+.*from/g, message: 'ES6 import语法' },
  { pattern: /export\s+(default|const|let|var)/g, message: 'ES6 export语法' },
  { pattern: /=>/g, message: '箭头函数' },
  { pattern: /class\s+\w+/g, message: 'ES6 class语法' },
  { pattern: /const\s+\w+\s*=/g, message: 'const声明' },
  { pattern: /let\s+\w+\s*=/g, message: 'let声明' },
];

es6Features.forEach(({ pattern, message }) => {
  let found = false;
  jsFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf8');
      if (pattern.test(code)) {
        found = true;
      }
    }
  });
  
  if (found) {
    console.log(`✅ 发现${message} - 小程序支持ES6`);
  }
});

// 检查文件大小
console.log('\n📏 检查文件大小...');
large_files = [];
jsFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.size > 100 * 1024) { // 100KB
      large_files.push(`${file} (${Math.round(stats.size / 1024)}KB)`);
    }
  }
});

if (large_files.length > 0) {
  console.log('⚠️  发现较大的JS文件，可能影响性能：');
  large_files.forEach(file => console.log(`  ${file}`));
}

// 检查TODO注释
console.log('\n📝 检查TODO注释...');
todo_count = 0;
jsFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const code = fs.readFileSync(filePath, 'utf8');
    const todos = code.match(/TODO\|FIXME\|HACK/g);
    if (todos) {
      todo_count += todos.length;
    }
  }
});

if (todo_count > 0) {
  console.log(`⚠️  发现 ${todo_count} 个TODO/FIXME注释，建议处理：`);
}

if (hasErrors) {
  console.log('\n❌ 发现语法错误，请修复后再提交！');
  process.exit(1);
} else {
  console.log('\n✅ 预提交检查通过！');
  process.exit(0);
}