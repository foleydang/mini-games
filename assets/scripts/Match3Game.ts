import { _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, tween, Tween, Input, input, EventTouch, MathUtil } from 'cc';
import { GameController } from './GameController';
import { StorageManager } from './StorageManager';
const { ccclass, property } = _decorator;

/**
 * 消消乐游戏组件
 * 支持触摸滑动交换、连消动画、关卡进度
 */
@ccclass('Match3Game')
export class Match3Game extends Component {
    
    @property(Node)
    gridRoot: Node = null!;  // 格子根节点
    
    @property(Node)
    uiRoot: Node = null!;    // UI根节点
    
    private gridSize: number = 6;
    private cellSize: number = 50;
    private gems: number[][] = [];  // 格子数据
    private gemNodes: Node[][] = []; // 格子节点
    private selectedGem: { row: number; col: number } | null = null;
    private score: number = 0;
    private moves: number = 15;
    private target: number = 1000;
    private colors: number = 4;
    private isAnimating: boolean = false;
    
    private touchStartPos: Vec3 = new Vec3();
    private touchStartCell: { row: number; col: number } | null = null;
    
    start() {
        this.initGame();
        this.setupTouchEvents();
    }
    
    initGame(level: any = { grid: 6, colors: 4, moves: 15, target: 1000 }) {
        this.gridSize = level.grid;
        this.colors = level.colors;
        this.moves = level.moves;
        this.target = level.target;
        this.score = 0;
        this.selectedGem = null;
        this.isAnimating = false;
        
        // 计算格子大小
        const visibleSize = this.getVisibleSize();
        this.cellSize = Math.min(
            (visibleSize.width - 40) / this.gridSize,
            (visibleSize.height - 200) / this.gridSize,
            55
        );
        
        // 初始化格子数据
        this.gems = [];
        this.gemNodes = [];
        
        for (let row = 0; row < this.gridSize; row++) {
            this.gems[row] = [];
            this.gemNodes[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                this.gems[row][col] = MathUtil.randomRangeInt(0, this.colors);
            }
        }
        
        // 清除初始匹配
        while (this.findMatches().length > 0) {
            this.clearMatches();
            this.fillGems();
        }
        
        // 创建格子节点
        this.createGridNodes();
        this.updateUI();
    }
    
    getVisibleSize() {
        // 获取可视区域大小
        return { width: 360, height: 640 };
    }
    
    createGridNodes() {
        this.gridRoot.removeAllChildren();
        
        const startX = -(this.gridSize * this.cellSize) / 2 + this.cellSize / 2;
        const startY = -(this.gridSize * this.cellSize) / 2 + this.cellSize / 2;
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const gemNode = this.createGemNode(row, col);
                gemNode.setPosition(new Vec3(
                    startX + col * this.cellSize,
                    startY + row * this.cellSize,
                    0
                ));
                this.gridRoot.addChild(gemNode);
                this.gemNodes[row][col] = gemNode;
            }
        }
    }
    
    createGemNode(row: number, col: number) {
        const node = new Node('gem_' + row + '_' + col);
        node.addComponent(UITransform).setContentSize(this.cellSize - 6, this.cellSize - 6);
        
        const sprite = node.addComponent(Sprite);
        sprite.color = GameController.COLORS.gems[this.gems[row][col]];
        
        // 存储格子信息
        node['gemRow'] = row;
        node['gemCol'] = col;
        
        return node;
    }
    
    setupTouchEvents() {
        this.gridRoot.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.gridRoot.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.gridRoot.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    }
    
    onTouchStart(event: EventTouch) {
        if (this.isAnimating) return;
        
        const pos = event.getUILocation();
        const localPos = this.gridRoot.getComponent(UITransform)?.convertToNodeSpaceAR(new Vec3(pos.x, pos.y, 0));
        if (!localPos) return;
        
        const cell = this.getCellFromPosition(localPos);
        if (cell) {
            this.touchStartPos = localPos;
            this.touchStartCell = cell;
            this.selectGem(cell.row, cell.col);
        }
    }
    
    onTouchMove(event: EventTouch) {
        if (this.isAnimating || !this.selectedGem || !this.touchStartCell) return;
        
        const pos = event.getUILocation();
        const localPos = this.gridRoot.getComponent(UITransform)?.convertToNodeSpaceAR(new Vec3(pos.x, pos.y, 0));
        if (!localPos) return;
        
        const dx = localPos.x - this.touchStartPos.x;
        const dy = localPos.y - this.touchStartPos.y;
        
        // 滑动距离足够大时触发交换
        if (Math.abs(dx) > this.cellSize * 0.3 || Math.abs(dy) > this.cellSize * 0.3) {
            let targetRow = this.selectedGem.row;
            let targetCol = this.selectedGem.col;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                targetCol += dx > 0 ? 1 : -1;
            } else {
                targetRow += dy > 0 ? 1 : -1;
            }
            
            if (this.isValidCell(targetRow, targetCol)) {
                this.trySwap(this.selectedGem.row, this.selectedGem.col, targetRow, targetCol);
                this.selectedGem = null;
                this.touchStartCell = null;
            }
        }
    }
    
    onTouchEnd(event: EventTouch) {
        if (this.isAnimating) return;
        
        // 如果没有滑动，检查是否点击了相邻格
        if (this.selectedGem && this.touchStartCell) {
            const pos = event.getUILocation();
            const localPos = this.gridRoot.getComponent(UITransform)?.convertToNodeSpaceAR(new Vec3(pos.x, pos.y, 0));
            if (localPos) {
                const cell = this.getCellFromPosition(localPos);
                if (cell && (cell.row !== this.selectedGem.row || cell.col !== this.selectedGem.col)) {
                    const dr = Math.abs(cell.row - this.selectedGem.row);
                    const dc = Math.abs(cell.col - this.selectedGem.col);
                    
                    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
                        this.trySwap(this.selectedGem.row, this.selectedGem.col, cell.row, cell.col);
                        this.selectedGem = null;
                    }
                }
            }
        }
        
        this.touchStartCell = null;
    }
    
    getCellFromPosition(pos: Vec3) {
        const startX = -(this.gridSize * this.cellSize) / 2;
        const startY = -(this.gridSize * this.cellSize) / 2;
        
        const col = Math.floor((pos.x - startX) / this.cellSize);
        const row = Math.floor((pos.y - startY) / this.cellSize);
        
        if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
            return { row, col };
        }
        return null;
    }
    
    isValidCell(row: number, col: number) {
        return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
    }
    
    selectGem(row: number, col: number) {
        // 清除之前的选中状态
        if (this.selectedGem) {
            this.updateGemAppearance(this.selectedGem.row, this.selectedGem.col, false);
        }
        
        // 如果点击的是同一个格子，取消选中
        if (this.selectedGem && this.selectedGem.row === row && this.selectedGem.col === col) {
            this.selectedGem = null;
            return;
        }
        
        // 选中新格子
        this.selectedGem = { row, col };
        this.updateGemAppearance(row, col, true);
    }
    
    updateGemAppearance(row: number, col: number, selected: boolean) {
        const node = this.gemNodes[row][col];
        if (node) {
            const scale = selected ? 1.2 : 1;
            tween(node)
                .to(0.1, { scale: new Vec3(scale, scale, 1) })
                .start();
        }
    }
    
    trySwap(r1: number, c1: number, r2: number, c2: number) {
        this.isAnimating = true;
        
        // 交换数据
        const temp = this.gems[r1][c1];
        this.gems[r1][c1] = this.gems[r2][c2];
        this.gems[r2][c2] = temp;
        
        // 交换节点（动画）
        this.swapGemNodes(r1, c1, r2, c2, () => {
            this.moves--;
            
            const matches = this.findMatches();
            if (matches.length > 0) {
                this.processMatches(() => {
                    this.isAnimating = false;
                    this.updateUI();
                    this.checkGameEnd();
                });
            } else {
                // 无效交换，换回来
                this.gems[r2][c2] = this.gems[r1][c1];
                this.gems[r1][c1] = temp;
                this.swapGemNodes(r1, c1, r2, c2, () => {
                    this.moves++;
                    this.isAnimating = false;
                });
            }
        });
    }
    
    swapGemNodes(r1: number, c1: number, r2: number, c2: number, callback: () => void) {
        const node1 = this.gemNodes[r1][c1];
        const node2 = this.gemNodes[r2][c2];
        
        const pos1 = node1.getPosition();
        const pos2 = node2.getPosition();
        
        tween(node1)
            .to(0.15, { position: pos2 })
            .start();
        
        tween(node2)
            .to(0.15, { position: pos1 })
            .call(callback)
            .start();
        
        // 更新节点引用
        this.gemNodes[r1][c1] = node2;
        this.gemNodes[r2][c2] = node1;
        node2['gemRow'] = r1;
        node2['gemCol'] = c1;
        node1['gemRow'] = r2;
        node1['gemCol'] = c2;
    }
    
    findMatches(): { row: number; col: number; direction: string }[] {
        const matches: { row: number; col: number; direction: string }[] = [];
        
        // 横向检查
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize - 2; col++) {
                if (this.gems[row][col] === this.gems[row][col + 1] && 
                    this.gems[row][col] === this.gems[row][col + 2]) {
                    matches.push({ row, col, direction: 'horizontal' });
                }
            }
        }
        
        // 纵向检查
        for (let row = 0; row < this.gridSize - 2; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.gems[row][col] === this.gems[row + 1][col] && 
                    this.gems[row][col] === this.gems[row + 2][col]) {
                    matches.push({ row, col, direction: 'vertical' });
                }
            }
        }
        
        return matches;
    }
    
    processMatches(callback: () => void) {
        const matches = this.findMatches();
        const toRemove = new Set<string>();
        
        matches.forEach(match => {
            if (match.direction === 'horizontal') {
                for (let i = 0; i < 3; i++) {
                    toRemove.add(match.row + ',' + (match.col + i));
                }
            } else {
                for (let i = 0; i < 3; i++) {
                    toRemove.add((match.row + i) + ',' + match.col);
                }
            }
        });
        
        this.score += toRemove.size * 10;
        
        // 删除动画
        const removePromises: Promise<void>[] = [];
        toRemove.forEach(key => {
            const [row, col] = key.split(',').map(Number);
            removePromises.push(this.removeGemAnimation(row, col));
        });
        
        Promise.all(removePromises).then(() => {
            // 清除数据
            toRemove.forEach(key => {
                const [row, col] = key.split(',').map(Number);
                this.gems[row][col] = -1;
            });
            
            // 下落填充
            this.dropGemsAnimation(() => {
                this.fillGemsAnimation(() => {
                    // 检查连消
                    if (this.findMatches().length > 0) {
                        this.processMatches(callback);
                    } else {
                        callback();
                    }
                });
            });
        });
    }
    
    removeGemAnimation(row: number, col: number): Promise<void> {
        return new Promise(resolve => {
            const node = this.gemNodes[row][col];
            if (node) {
                tween(node)
                    .to(0.2, { scale: new Vec3(0, 0, 0) })
                    .call(() => {
                        node.destroy();
                        resolve();
                    })
                    .start();
            } else {
                resolve();
            }
        });
    }
    
    dropGemsAnimation(callback: () => void) {
        // 让上面的宝石下落
        for (let col = 0; col < this.gridSize; col++) {
            let emptyRow = this.gridSize - 1;
            for (let row = this.gridSize - 1; row >= 0; row--) {
                if (this.gems[row][col] >= 0) {
                    if (row !== emptyRow) {
                        this.gems[emptyRow][col] = this.gems[row][col];
                        this.gems[row][col] = -1;
                        
                        // 移动节点
                        const node = this.gemNodes[row][col];
                        if (node) {
                            const startY = -(this.gridSize * this.cellSize) / 2 + emptyRow * this.cellSize + this.cellSize / 2;
                            tween(node)
                                .to(0.2, { position: new Vec3(node.getPosition().x, startY, 0) })
                                .start();
                            
                            this.gemNodes[emptyRow][col] = node;
                            node['gemRow'] = emptyRow;
                        }
                    }
                    emptyRow--;
                }
            }
        }
        
        setTimeout(callback, 250);
    }
    
    fillGemsAnimation(callback: () => void) {
        const startX = -(this.gridSize * this.cellSize) / 2 + this.cellSize / 2;
        const startY = -(this.gridSize * this.cellSize) / 2 + this.cellSize / 2;
        
        for (let col = 0; col < this.gridSize; col++) {
            for (let row = 0; row < this.gridSize; row++) {
                if (this.gems[row][col] === -1) {
                    this.gems[row][col] = MathUtil.randomRangeInt(0, this.colors);
                    
                    const gemNode = this.createGemNode(row, col);
                    gemNode.setPosition(new Vec3(startX + col * this.cellSize, startY + row * this.cellSize + 100, 0));
                    gemNode.scale = new Vec3(0, 0, 0);
                    this.gridRoot.addChild(gemNode);
                    this.gemNodes[row][col] = gemNode;
                    
                    tween(gemNode)
                        .to(0.2, { position: new Vec3(startX + col * this.cellSize, startY + row * this.cellSize, 0) })
                        .to(0.1, { scale: new Vec3(1, 1, 1) })
                        .start();
                }
            }
        }
        
        setTimeout(callback, 350);
    }
    
    clearMatches() {
        const matches = this.findMatches();
        matches.forEach(match => {
            if (match.direction === 'horizontal') {
                for (let i = 0; i < 3; i++) this.gems[match.row][match.col + i] = -1;
            } else {
                for (let i = 0; i < 3; i++) this.gems[match.row + i][match.col] = -1;
            }
        });
    }
    
    fillGems() {
        for (let col = 0; col < this.gridSize; col++) {
            let emptyRow = this.gridSize - 1;
            for (let row = this.gridSize - 1; row >= 0; row--) {
                if (this.gems[row][col] >= 0) {
                    if (row !== emptyRow) {
                        this.gems[emptyRow][col] = this.gems[row][col];
                        this.gems[row][col] = -1;
                    }
                    emptyRow--;
                }
            }
            for (let row = emptyRow; row >= 0; row--) {
                this.gems[row][col] = MathUtil.randomRangeInt(0, this.colors);
            }
        }
    }
    
    updateUI() {
        // 更新分数、步数显示
        if (this.uiRoot) {
            // 更新分数Label
            const scoreLabel = this.uiRoot.getChildByName('scoreLabel');
            if (scoreLabel) {
                scoreLabel.getComponent(Label)?.string = '得分: ' + this.score;
            }
            
            // 更新步数Label
            const movesLabel = this.uiRoot.getChildByName('movesLabel');
            if (movesLabel) {
                movesLabel.getComponent(Label)?.string = '步数: ' + this.moves;
            }
            
            // 更新进度条
            const progress = Math.min(this.score / this.target, 1);
            // 进度条动画...
        }
    }
    
    checkGameEnd() {
        if (this.score >= this.target) {
            this.onWin();
        } else if (this.moves <= 0) {
            this.onLose();
        }
    }
    
    onWin() {
        StorageManager.updateHighScore('match3', this.score);
        // 显示胜利界面
        console.log('游戏胜利！得分:', this.score);
    }
    
    onLose() {
        // 显示失败界面
        console.log('游戏失败');
    }
}
