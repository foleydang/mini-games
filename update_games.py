import re

games = ['snake.js', '2048.js', 'tetris.js', 'flappy.js', 'breakout.js', 'memory.js', 'bounce.js']

for game_file in games:
    path = f'games/{game_file}'
    with open(path, 'r') as f:
        content = f.read()
    
    # 替换按钮位置定义（在constructor中）
    # 把所有按钮都放到左下角/右下角
    content = re.sub(
        r'this\.backButton\s*=\s*\{\s*x:\s*designSize\.width\s*-\s*140[^}]+\}',
        'this.backButton = { x: 25, y: 1000, width: 110, height: 48 }; // y动态计算',
        content
    )
    
    content = re.sub(
        r'this\.shareButton\s*=\s*\{\s*x:\s*20[^}]+safeTop\s*+\s*85[^}]+\}',
        'this.shareButton = { x: 150, y: 1000, width: 110, height: 48 }; // y动态计算',
        content
    )
    
    content = re.sub(
        r'this\.soundButton\s*=\s*\{\s*x:\s*designSize\.width\s*/\s*2\s*-\s*60[^}]+safeTop\s*+\s*85[^}]+\}',
        'this.soundButton = { x: designSize.width - 135, y: 1000, width: 110, height: 48 }; // y动态计算',
        content
    )
    
    # 在render函数开始处计算按钮位置
    if 'render()' in content:
        # 找到render函数位置并添加按钮计算
        render_start = content.find('render() {')
        if render_start > 0:
            # 在render开头添加按钮位置计算
            insert_pos = content.find('{', render_start) + 1
            calc_code = '\n    const { height, safeBottom } = this.designSize;\n    this.backButton.y = height - safeBottom - 65;\n    this.shareButton.y = height - safeBottom - 65;\n    this.soundButton.y = height - safeBottom - 65;\n'
            
            # 避免重复添加
            if 'backButton.y = height - safeBottom' not in content[insert_pos:insert_pos+200]:
                content = content[:insert_pos] + calc_code + content[insert_pos:]
    
    # 更新按钮绘制代码（左下角）
    content = re.sub(
        r'drawButton\(this\.ctx,\s*this\.backButton\.x,\s*this\.backButton\.y[^)]+\)',
        'drawButton(this.ctx, this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height, "← 返回", Colors.danger, { fontSize: 28, radius: 14 })',
        content
    )
    
    content = re.sub(
        r'drawButton\(this\.ctx,\s*this\.shareButton\.x,\s*this\.shareButton\.y[^)]+"分享[^)]+\)',
        'drawButton(this.ctx, this.shareButton.x, this.shareButton.y, this.shareButton.width, this.shareButton.height, "分享", Colors.success, { fontSize: 28, radius: 14 })',
        content
    )
    
    content = re.sub(
        r'drawButton\(this\.ctx,\s*this\.soundButton\.x,\s*this\.soundButton\.y[^)]+audioManager\.enabled[^)]+\)',
        'drawButton(this.ctx, this.soundButton.x, this.soundButton.y, this.soundButton.width, this.soundButton.height, audioManager.enabled ? "🔊" : "🔇", Colors.info, { fontSize: 28, radius: 14 })',
        content
    )
    
    with open(path, 'w') as f:
        f.write(content)
    
    print(f"Updated {game_file}")

print("All games updated!")
