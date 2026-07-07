#!/bin/bash

# Mini-Games 预提交检查脚本
# 在git commit前自动运行

echo "🚀 开始预提交检查..."

# 检查JavaScript语法
echo "🔍 检查JavaScript语法..."
node scripts/pre-commit.js
if [ $? -ne 0 ]; then
    echo "❌ JavaScript语法检查失败，请修复错误后再提交！"
    exit 1
fi

# 检查文件大小
echo "📏 检查文件大小..."
large_files=$(find . -name "*.js" -size +100k 2>/dev/null)
if [ ! -z "$large_files" ]; then
    echo "⚠️  发现较大的JS文件，可能影响性能："
    echo "$large_files"
fi

# 检查中文注释
echo "🔤 检查中文注释..."
js_files=$(find . -name "*.js" -not -path "./.git/*" -not -path "./node_modules/*")
chinese_files=$(grep -r "[\u4e00-\u9fff]" $js_files 2>/dev/null | head -5)
if [ ! -z "$chinese_files" ]; then
    echo "✅ 发现中文注释（正常）："
    echo "$chinese_files" | head -3
fi

# 检查TODO注释
echo "📝 检查TODO注释..."
todo_count=$(grep -r "TODO\|FIXME\|HACK" $js_files 2>/dev/null | wc -l)
if [ $todo_count -gt 0 ]; then
    echo "⚠️  发现 $todo_count 个TODO/FIXME注释，建议处理："
    grep -r "TODO\|FIXME\|HACK" $js_files 2>/dev/null | head -3
fi

echo "✅ 预提交检查通过！"
echo "📝 可以执行 git commit 了"

# 如果参数是 --auto-commit，则自动提交
if [ "$1" = "--auto-commit" ]; then
    echo "🚀 自动提交..."
    git add -A
    git commit -m "$(git log --oneline -1 | sed 's/^[a-f0-9]* //')-fix"
    echo "✅ 提交完成！"
fi