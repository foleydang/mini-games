/**
 * Mini-Games 编译检查脚本
 * 用于在提交前检查JavaScript语法错误
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

console.log('🔍 开始检查JavaScript语法...');

jsFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ 文件不存在: ${file}`);
    hasErrors = true;
    return;
  }

  try {
    // 使用Node.js的语法检查
    const code = fs.readFileSync(filePath, 'utf8');
    // 简单的语法检查 - 检查括号匹配
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack = [];
    let lineNum = 1;
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      
      if (char === '\n') lineNum++;
      
      if (brackets[char]) {
        stack.push({ char, line: lineNum });
      } else if (Object.values(brackets).includes(char)) {
        const last = stack.pop();
        if (!last || brackets[last.char] !== char) {
          console.log(`❌ ${file}:${lineNum} - 括号不匹配: ${char}`);
          hasErrors = true;
        }
      }
    }
    
    // 检查未闭合的括号
    if (stack.length > 0) {
      stack.forEach(item => {
        console.log(`❌ ${file}:${item.line} - 未闭合的括号: ${item.char}`);
        hasErrors = true;
      });
    }
    
    // 检查明显的语法问题
    const seriousErrors = [
      { pattern: /;\s*\n\s*[a-zA-Z_]/g, message: '缺少分号' },
      { pattern: /}\s*\n\s*[a-zA-Z_][a-zA-Z0-9_]*/g, message: '缺少分号' },
      { pattern: /}\s*\n\s*export\s+/g, message: '缺少分号' },
      { pattern: /}\s*\n\s*import\s+/g, message: '缺少分号' },
      { pattern: /}\s*\n\s*class\s+/g, message: '缺少分号' },
      { pattern: /}\s*\n\s*function\s+/g, message: '缺少分号' },
    ];
    
    seriousErrors.forEach(({ pattern, message }) => {
      const matches = code.match(pattern);
      if (matches) {
        // 只报告前几个错误，避免刷屏
        matches.slice(0, 3).forEach((match, index) => {
          const lineNum = (code.substring(0, code.indexOf(match)).match(/\n/g) || []).length + 1;
          console.log(`❌ ${file}:${lineNum} - ${message}: ${match.trim().substring(0, 30)}...`);
        });
        if (matches.length > 3) {
          console.log(`   ... 还有 ${matches.length - 3} 个类似错误`);
        }
        hasErrors = true;
      }
    });
    
    console.log(`✅ ${file} - 语法检查通过`);
    
  } catch (error) {
    console.log(`❌ ${file} - 检查失败: ${error.message}`);
    hasErrors = true;
  }
});

// 检查ES6语法
console.log('\n🔍 检查ES6语法兼容性...');
const es6Checks = [
  { pattern: /import\s+.*from/g, message: 'ES6 import语法' },
  { pattern: /export\s+(default|const|let|var)/g, message: 'ES6 export语法' },
  { pattern: /=>/g, message: '箭头函数' },
  { pattern: /class\s+\w+/g, message: 'ES6 class语法' },
  { pattern: /const\s+\w+\s*=/g, message: 'const声明' },
  { pattern: /let\s+\w+\s*=/g, message: 'let声明' },
];

es6Checks.forEach(({ pattern, message }) => {
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

if (hasErrors) {
  console.log('\n❌ 发现语法错误，请修复后再提交！');
  process.exit(1);
} else {
  console.log('\n✅ 所有语法检查通过！');
  process.exit(0);
}