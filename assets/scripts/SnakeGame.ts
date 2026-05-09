import { _decorator, Component, Node, Vec3, UITransform, Sprite, Color, Label, tween, Tween, Input, input, EventTouch, EventKeyboard, KeyCode, director, math } from 'cc';
import { GameController } from './GameController';
import { StorageManager } from './StorageManager';
const { ccclass, property } = _decorator;

@ccclass('SnakeGame')
export class SnakeGame extends Component {
    @property(Node) gameArea: Node = null!;
    @property(Node) uiRoot: Node = null!;
    
    private gridWidth: number = 15;
    private gridHeight: number = 20;
    private cellSize: number = 20;
    private snake: { x: number; y: number }[] = [];
    private direction: { x: number; y: number } = { x: 0, y: 1 };
    private food: { x: number; y: number } = { x: 0, y: 0 };
    private score: number = 0;
    private gameOver: boolean = false;
    private moveInterval: number = 0.15;
    
    start() {
        this.initGame();
        this.schedule(this.updateGame, this.moveInterval);
    }
    
    initGame() {
        const visibleSize = this.getVisibleSize();
        this.cellSize = Math.min((visibleSize.width - 40) / this.gridWidth, (visibleSize.height - 200) / this.gridHeight);
        
        this.snake = [{ x: 7, y: 10 }, { x: 7, y: 9 }, { x: 7, y: 8 }];
        this.direction = { x: 0, y: 1 };
        this.score = 0;
        this.gameOver = false;
        this.generateFood();
        this.render();
    }
    
    getVisibleSize() {
        const canvas = director.getScene().getChildByName('Canvas');
        return canvas.getComponent(UITransform).contentSize;
    }
    
    updateGame() {
        if (this.gameOver) return;
        this.moveSnake();
    }
    
    moveSnake() {
        const head = { ...this.snake[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;
        
        if (head.x < 0 || head.x >= this.gridWidth || head.y < 0 || head.y >= this.gridHeight) {
            this.gameOver = true;
            return;
        }
        
        this.snake.unshift(head);
        
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.generateFood();
        } else {
            this.snake.pop();
        }
        
        this.render();
    }
    
    generateFood() {
        do {
            this.food = {
                x: Math.floor(Math.random() * this.gridWidth),
                y: Math.floor(Math.random() * this.gridHeight)
            };
        } while (this.snake.some(s => s.x === this.food.x && s.y === this.food.y));
    }
    
    render() {
        this.gameArea.removeAllChildren();
        
        this.snake.forEach((segment, i) => {
            const node = this.createCell(i === 0 ? new Color(78, 205, 196) : new Color(129, 236, 236), segment.x, segment.y);
            this.gameArea.addChild(node);
        });
        
        const foodNode = this.createCell(new Color(255, 107, 107), this.food.x, this.food.y);
        this.gameArea.addChild(foodNode);
    }
    
    createCell(color: Color, x: number, y: number): Node {
        const node = new Node('Cell');
        const sprite = node.addComponent(Sprite);
        sprite.color = color;
        const transform = node.addComponent(UITransform);
        transform.width = this.cellSize - 2;
        transform.height = this.cellSize - 2;
        node.position = new Vec3(
            (x - this.gridWidth / 2 + 0.5) * this.cellSize,
            (y - this.gridHeight / 2 + 0.5) * this.cellSize,
            0
        );
        return node;
    }
}
