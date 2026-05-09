import { _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, tween, Input, input, EventTouch, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Game2048')
export class Game2048 extends Component {
    @property(Node) gameArea: Node = null!;
    @property(Node) uiRoot: Node = null!;
    
    private gridSize: number = 4;
    private cellSize: number = 80;
    private board: number[][] = [];
    private score: number = 0;
    private bestScore: number = 0;
    private touchStartPos: Vec3 = new Vec3();
    
    start() {
        this.initGame();
        this.setupInput();
    }
    
    initGame() {
        const visibleSize = this.getVisibleSize();
        this.cellSize = Math.min((visibleSize.width - 60) / this.gridSize, 80);
        
        this.board = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.addRandomTile();
        this.addRandomTile();
        this.render();
    }
    
    getVisibleSize() {
        const canvas = director.getScene().getChildByName('Canvas');
        return canvas.getComponent(UITransform).contentSize;
    }
    
    setupInput() {
        this.node.on(Input.EventType.TOUCH_START, (e: EventTouch) => {
            this.touchStartPos = new Vec3(e.touch.getLocationX(), e.touch.getLocationY(), 0);
        });
        
        this.node.on(Input.EventType.TOUCH_END, (e: EventTouch) => {
            const endPos = new Vec3(e.touch.getLocationX(), e.touch.getLocationY(), 0);
            const dx = endPos.x - this.touchStartPos.x;
            const dy = endPos.y - this.touchStartPos.y;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 30) this.move(1, 0);
                else if (dx < -30) this.move(-1, 0);
            } else {
                if (dy > 30) this.move(0, 1);
                else if (dy < -30) this.move(0, -1);
            }
        });
    }
    
    move(dx: number, dy: number) {
        const newBoard = this.board.map(row => [...row]);
        let moved = false;
        
        for (let i = 0; i < this.gridSize; i++) {
            const line: number[] = [];
            for (let j = 0; j < this.gridSize; j++) {
                const x = dx === 1 ? this.gridSize - 1 - j : j;
                const y = dy === 1 ? this.gridSize - 1 - j : j;
                const val = dx !== 0 ? newBoard[i][x] : newBoard[y][i];
                if (val !== 0) line.push(val);
            }
            
            const merged: number[] = [];
            for (let k = 0; k < line.length; k++) {
                if (k < line.length - 1 && line[k] === line[k + 1]) {
                    merged.push(line[k] * 2);
                    this.score += line[k] * 2;
                    k++;
                    moved = true;
                } else {
                    merged.push(line[k]);
                }
            }
            
            while (merged.length < this.gridSize) {
                if (dx === 1 || dy === 1) merged.unshift(0);
                else merged.push(0);
            }
            
            for (let j = 0; j < this.gridSize; j++) {
                const x = dx === 1 ? this.gridSize - 1 - j : j;
                const y = dy === 1 ? this.gridSize - 1 - j : j;
                const newVal = dx !== 0 ? merged[j] : merged[j];
                if (dx !== 0) newBoard[i][x] = newVal;
                else newBoard[y][i] = newVal;
            }
        }
        
        if (moved || JSON.stringify(newBoard) !== JSON.stringify(this.board)) {
            this.board = newBoard;
            this.addRandomTile();
            this.render();
        }
    }
    
    addRandomTile() {
        const empty: [number, number][] = [];
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.board[i][j] === 0) empty.push([i, j]);
            }
        }
        if (empty.length > 0) {
            const [i, j] = empty[Math.floor(Math.random() * empty.length)];
            this.board[i][j] = Math.random() < 0.9 ? 2 : 4;
        }
    }
    
    render() {
        this.gameArea.removeAllChildren();
        
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const value = this.board[i][j];
                const node = this.createCell(value, j, i);
                this.gameArea.addChild(node);
            }
        }
    }
    
    createCell(value: number, x: number, y: number): Node {
        const node = new Node('Cell');
        const sprite = node.addComponent(Sprite);
        sprite.color = this.getColor(value);
        
        const transform = node.addComponent(UITransform);
        transform.width = this.cellSize - 8;
        transform.height = this.cellSize - 8;
        
        node.position = new Vec3(
            (x - this.gridSize / 2 + 0.5) * this.cellSize,
            (y - this.gridSize / 2 + 0.5) * this.cellSize,
            0
        );
        
        if (value > 0) {
            const label = node.addComponent(Label);
            label.string = value.toString();
            label.fontSize = value > 100 ? 32 : 40;
            label.color = value > 4 ? Color.WHITE : new Color(119, 110, 101);
        }
        
        return node;
    }
    
    getColor(value: number): Color {
        const colors: { [key: number]: Color } = {
            0: new Color(205, 193, 180),
            2: new Color(238, 228, 218),
            4: new Color(237, 224, 200),
            8: new Color(242, 177, 121),
            16: new Color(245, 149, 99),
            32: new Color(246, 124, 95),
            64: new Color(246, 94, 59),
            128: new Color(237, 207, 114),
            256: new Color(237, 204, 97),
            512: new Color(237, 200, 80),
            1024: new Color(237, 197, 63),
            2048: new Color(237, 194, 46)
        };
        return colors[value] || new Color(60, 58, 50);
    }
}
