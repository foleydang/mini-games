import { _decorator, Component, Node, director, instantiate, Vec3, UITransform, Sprite, Color, Label, Button, Layout, tween, Widget, AudioSource, sys } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 游戏配置
 */
export const GameConfig = {
    name: 'Yanten快乐屋',
    games: [
        { id: 'match3', name: '开心消消乐', icon: '🌟', color: new Color(255, 107, 107) },
        { id: 'snake', name: '贪吃蛇', icon: '🐍', color: new Color(78, 205, 196) },
        { id: '2048', name: '2048', icon: '🎯', color: new Color(255, 230, 109) },
        { id: 'tetris', name: '方块消消', icon: '🧩', color: new Color(170, 150, 218) }
    ]
};

/**
 * 主游戏控制器 - 负责场景切换、UI管理
 */
@ccclass('GameController')
export class GameController extends Component {
    
    @property(Node)
    uiRoot: Node = null!;  // UI根节点
    
    @property(Node)
    gameRoot: Node = null!; // 游戏画面根节点
    
    private currentScreen: string = 'home';
    private currentGameId: string = '';
    
    // 颜色配置
    static readonly COLORS = {
        bgTop: new Color(248, 249, 250),
        bgBottom: new Color(233, 236, 239),
        accent: new Color(255, 107, 157),
        primary: new Color(196, 69, 105),
        text: new Color(45, 52, 54),
        textLight: new Color(255, 255, 255),
        cardBg: new Color(255, 255, 255),
        gems: [
            new Color(255, 107, 107),
            new Color(78, 205, 196),
            new Color(255, 230, 109),
            new Color(168, 230, 207),
            new Color(170, 150, 218),
            new Color(255, 140, 148)
        ]
    };
    
    onLoad() {
        // 设置适配
        this.setupSafeArea();
        // 初始化UI
        this.showHomeScreen();
    }
    
    setupSafeArea() {
        // 获取安全区域并适配
        const visibleSize = director.getVisibleSize();
        console.log('Visible size:', visibleSize);
    }
    
    showHomeScreen() {
        this.currentScreen = 'home';
        this.clearUI();
        this.createHomeUI();
    }
    
    clearUI() {
        if (this.uiRoot) {
            this.uiRoot.removeAllChildren();
        }
    }
    
    createHomeUI() {
        const userData = StorageManager.getUserData();
        
        // 标题
        const titleNode = this.createLabel('🎮 Yanten快乐屋', 28, GameController.COLORS.primary);
        titleNode.setPosition(new Vec3(0, 180, 0));
        this.uiRoot.addChild(titleNode);
        
        // 用户信息卡片
        const infoCard = this.createCard();
        infoCard.setPosition(new Vec3(0, 130, 0));
        this.uiRoot.addChild(infoCard);
        
        const coinsLabel = this.createLabel('💰 ' + userData.coins, 14, GameController.COLORS.accent);
        coinsLabel.setPosition(new Vec3(-120, 0, 0));
        infoCard.addChild(coinsLabel);
        
        const levelLabel = this.createLabel('Lv.' + userData.level, 14, GameController.COLORS.text);
        levelLabel.setPosition(new Vec3(0, 0, 0));
        infoCard.addChild(levelLabel);
        
        const signLabel = this.createLabel('🔥 连签' + userData.signDays + '天', 14, GameController.COLORS.text);
        signLabel.setPosition(new Vec3(120, 0, 0));
        infoCard.addChild(signLabel);
        
        // 签到按钮
        const canSign = StorageManager.canSignIn();
        const signBtn = this.createButton(canSign ? '📅 签到领奖励' : '✅ 今日已签到', () => {
            if (canSign) {
                StorageManager.doSignIn();
                this.showHomeScreen();
            }
        });
        signBtn.setPosition(new Vec3(0, 70, 0));
        this.uiRoot.addChild(signBtn);
        
        // 游戏列表
        GameConfig.games.forEach((game, index) => {
            const gameCard = this.createGameCard(game, userData.gameRecords[game.id] || { plays: 0 });
            gameCard.setPosition(new Vec3(0, -30 - index * 80, 0));
            this.uiRoot.addChild(gameCard);
            
            // 点击事件
            gameCard.on(Node.EventType.TOUCH_END, () => {
                this.selectGame(game.id);
            });
        });
    }
    
    createGameCard(game: any, record: any) {
        const card = this.createCard(280, 70);
        
        // 游戏图标背景
        const iconBg = new Node('iconBg');
        iconBg.addComponent(UITransform).setContentSize(50, 50);
        const sprite = iconBg.addComponent(Sprite);
        sprite.color = game.color;
        iconBg.setPosition(new Vec3(-100, 0, 0));
        card.addChild(iconBg);
        
        // 游戏名称
        const nameLabel = this.createLabel(game.name, 16, GameController.COLORS.text);
        nameLabel.setPosition(new Vec3(30, 10, 0));
        card.addChild(nameLabel);
        
        // 游玩次数
        if (record.plays > 0) {
            const playsLabel = this.createLabel(record.plays + '次', 11, GameController.COLORS.textLight);
            playsLabel.setPosition(new Vec3(110, 0, 0));
            card.addChild(playsLabel);
        }
        
        return card;
    }
    
    selectGame(gameId: string) {
        this.currentGameId = gameId;
        this.showLevelSelectScreen();
    }
    
    showLevelSelectScreen() {
        this.currentScreen = 'levelSelect';
        this.clearUI();
        this.createLevelSelectUI();
    }
    
    createLevelSelectUI() {
        const game = GameConfig.games.find(g => g.id === this.currentGameId);
        if (!game) return;
        
        // 标题
        const titleNode = this.createLabel('🎯 ' + game.name, 22, GameController.COLORS.primary);
        titleNode.setPosition(new Vec3(0, 180, 0));
        this.uiRoot.addChild(titleNode);
        
        // 关卡按钮
        const levels = this.getLevelsForGame(this.currentGameId);
        const progress = StorageManager.getLevelProgress(this.currentGameId);
        
        levels.forEach((level, index) => {
            const col = index % 4;
            const row = Math.floor(index / 4);
            const x = -90 + col * 60;
            const y = 100 - row * 70;
            
            const unlocked = this.currentGameId !== 'match3' || progress.unlocked.includes(level.id);
            
            const levelBtn = this.createLevelButton(level, unlocked);
            levelBtn.setPosition(new Vec3(x, y, 0));
            this.uiRoot.addChild(levelBtn);
            
            if (unlocked) {
                levelBtn.on(Node.EventType.TOUCH_END, () => {
                    this.startGame(this.currentGameId, level);
                });
            }
        });
        
        // 返回按钮
        const backBtn = this.createButton('返回大厅', () => this.showHomeScreen());
        backBtn.setPosition(new Vec3(0, -180, 0));
        this.uiRoot.addChild(backBtn);
    }
    
    getLevelsForGame(gameId: string) {
        switch (gameId) {
            case 'match3': return [
                { id: 1, name: '初识', target: 1000, moves: 15 },
                { id: 2, name: '入门', target: 2000, moves: 18 },
                { id: 3, name: '小试', target: 3000, moves: 20 },
                { id: 4, name: '进阶', target: 5000, moves: 22 },
                { id: 5, name: '挑战', target: 8000, moves: 25 },
                { id: 6, name: '高手', target: 10000, moves: 28 }
            ];
            case 'snake': return [
                { id: 1, name: '简单' },
                { id: 2, name: '普通' },
                { id: 3, name: '困难' }
            ];
            case '2048': return [
                { id: 1, name: '经典' },
                { id: 2, name: '挑战' },
                { id: 3, name: '极限' }
            ];
            case 'tetris': return [
                { id: 1, name: '初级' },
                { id: 2, name: '中级' },
                { id: 3, name: '高级' }
            ];
            default: return [];
        }
    }
    
    createLevelButton(level: any, unlocked: boolean) {
        const btn = new Node('levelBtn');
        btn.addComponent(UITransform).setContentSize(50, 50);
        const bg = btn.addComponent(Sprite);
        bg.color = unlocked ? GameController.COLORS.cardBg : new Color(200, 200, 200);
        
        const idLabel = this.createLabel(String(level.id), 20, unlocked ? GameController.COLORS.text : new Color(150, 150, 150));
        btn.addChild(idLabel);
        
        const nameLabel = this.createLabel(level.name, 11, GameController.COLORS.text);
        nameLabel.setPosition(new Vec3(0, -20, 0));
        btn.addChild(nameLabel);
        
        if (!unlocked) {
            const lockLabel = this.createLabel('🔒', 18, new Color(100, 100, 100));
            lockLabel.setPosition(new Vec3(0, 0, 0));
            btn.addChild(lockLabel);
        }
        
        return btn;
    }
    
    startGame(gameId: string, level: any) {
        // 清除UI，启动具体游戏
        this.clearUI();
        
        // 根据游戏类型创建对应的游戏实例
        // 这里会动态加载对应的游戏脚本
        director.loadScene('GameScene', () => {
            console.log('Game scene loaded');
        });
    }
    
    // UI 创建辅助方法
    createLabel(text: string, fontSize: number, color: Color) {
        const node = new Node('label');
        node.addComponent(UITransform);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.color = color;
        return node;
    }
    
    createCard(width: number = 280, height: number = 36) {
        const card = new Node('card');
        card.addComponent(UITransform).setContentSize(width, height);
        const sprite = card.addComponent(Sprite);
        sprite.color = GameController.COLORS.cardBg;
        return card;
    }
    
    createButton(text: string, callback: () => void) {
        const btn = new Node('button');
        btn.addComponent(UITransform).setContentSize(180, 50);
        
        const bg = btn.addComponent(Sprite);
        bg.color = GameController.COLORS.accent;
        
        const label = this.createLabel(text, 16, GameController.COLORS.textLight);
        btn.addChild(label);
        
        btn.on(Node.EventType.TOUCH_END, callback);
        return btn;
    }
}
