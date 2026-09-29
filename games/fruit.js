// 接水果 - 窄桶 + 双斜坡 + 上方等待网格(整片下滚)
import { drawText, Colors, completeLevel, saveLevelStars, Storage, drawRoundRect } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, checkBottomButtons } from '../common/ui.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';
import { Levels } from '../common/config.js';
import LevelResult from '../common/level-result.js';

const FRUITS = [
  { emoji: '🍎', color: '#ff4757' },
  { emoji: '🍊', color: '#ff9f43' },
  { emoji: '🍇', color: '#a55eea' },
  { emoji: '🍓', color: '#ee5a6f' },
  { emoji: '🍋', color: '#feca57' },
  { emoji: '🍑', color: '#ffb8b8' },
  { emoji: '🥝', color: '#78e08f' },
  { emoji: '🫐', color: '#48dbfb' },
];

const GRAVITY = 0.18;
const MAX_VY = 10;
const BOUNCE = 0.25;
const FRICTION = 0.97;
const SLOPE_FRICTION = 0.92;

class FruitGame {
  constructor(canvas, ctx, designSize, onEnd, level = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'fruit';

    this.levels = Levels.fruit;
    this.currentLevel = Math.max(0, Math.min(level, this.levels.length - 1));

    this.result = null;

    // 题库(全局一次,跨关卡保留)
    this.quizPool = [];
    this.initQuizPool();

    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);
    this.buttons = null;

    this.animate = this.animate.bind(this);
    this.setupLevel();
    this.startLoop();
  }

  applyLevelConfig() {
    const cfg = this.levels[this.currentLevel] || this.levels[0];
    this.maxFruits = cfg.maxFruits;
    this.maxTypes = cfg.types;
    this.fruitRadius = cfg.radius;
    this.levelName = cfg.name || `第${this.currentLevel + 1}关`;
  }

  // 依据当前关卡重建几何布局与牌面(可重复调用,用于换关/重试)
  setupLevel() {
    // 每关(含重玩/下一关)开始计时,保证上报耗时只统计本关
    this.gameStartTime = Date.now();
    this.applyLevelConfig();

    const { width, height, safeBottom } = this.designSize;

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.result = null;

    // 窄桶 - 只有一列水果宽，厚壁装饰
    this.bucketCenterX = width / 2;
    this.bucketHalfWidth = this.fruitRadius + 6;
    this.bucketLeft = this.bucketCenterX - this.bucketHalfWidth;
    this.bucketRight = this.bucketCenterX + this.bucketHalfWidth;
    this.bucketWallThick = 14;
    // 桶底部贴着屏幕最下方
    this.bucketCapacity = 4; // 桶最多容纳4个水果
    this.bucketBottom = height - safeBottom;
    this.bucketTop = this.bucketBottom - this.fruitRadius * 2 * this.bucketCapacity;
    this.bucketHeight = this.bucketBottom - this.bucketTop;

    // 斜坡 - 平缓（~10度），从屏幕边缘到桶口
    this.slopeTopY = this.bucketTop - 30;
    this.slopeLeftStartX = 0;
    this.slopeRightStartX = width;

    this.fruits = []; // 所有水果统一在一个数组
    this.topFruits = []; // 待点击的水果
    this.particles = [];
    this.scorePopups = [];
    this.quizBtn = null;
    this.quizBtn2 = null;

    // 锤子系统
    this.hammerCount = 3;
    this.hammerActive = false;
    this.showQuiz = false;
    this.quizData = null;
    this.quizResult = null;
    this.quizResultTimer = 0;

    this.generateTopFruits();
  }

  startLoop() {
    // 用 rAF 回调的时间戳做计时,不用 performance.now()——真机 iOS 无全局 performance,会导致构造崩溃
    this.lastTime = null;
    requestAnimationFrame(this.animate);
  }

  nextLevel() {
    this.currentLevel = Math.min(this.currentLevel + 1, this.levels.length - 1);
    this.setupLevel();
    this.startLoop();
  }

  retry() {
    this.setupLevel();
    this.startLoop();
  }

  initQuizPool() {
    this.quizPool = [
      { q: '什么东西越洗越脏？', a: '水', b: '毛巾', ans: 'a' },
      { q: '什么门永远关不上？', a: '球门', b: '玻璃门', ans: 'a' },
      { q: '什么布剪不断？', a: '瀑布', b: '丝绸', ans: 'a' },
      { q: '什么东西越热越爱出来？', a: '汗', b: '太阳', ans: 'a' },
      { q: '什么球不能踢？', a: '眼球', b: '足球', ans: 'a' },
      { q: '什么东西越晒越湿？', a: '冰', b: '衣服', ans: 'a' },
      { q: '什么马不能骑？', a: '河马', b: '木马', ans: 'a' },
      { q: '什么蛋不能吃？', a: '脸蛋', b: '鸡蛋', ans: 'a' },
      { q: '什么鸡没有翅膀？', a: '田鸡', b: '火鸡', ans: 'a' },
      { q: '什么东西越生气越大？', a: '气球', b: '肚子', ans: 'a' },
      { q: '什么书不能看？', a: '秘书', b: '小说', ans: 'a' },
      { q: '什么花不能摘？', a: '火花', b: '玫瑰', ans: 'a' },
      { q: '什么东西往上升永远不降？', a: '年龄', b: '气球', ans: 'a' },
      { q: '什么牛不吃草？', a: '蜗牛', b: '水牛', ans: 'a' },
      { q: '什么车最长？', a: '堵车', b: '火车', ans: 'a' },
      { q: '什么路最窄？', a: '冤家路窄', b: '小路', ans: 'a' },
      { q: '什么东西越大越丑？', a: '谎话', b: '大象', ans: 'a' },
      { q: '什么鱼不能吃？', a: '木鱼', b: '金鱼', ans: 'a' },
      { q: '什么杯不能喝？', a: '世界杯', b: '玻璃杯', ans: 'a' },
      { q: '什么床不能睡？', a: '河床', b: '木床', ans: 'a' },
      { q: '什么东西有头无脚？', a: '钉子', b: '蛇', ans: 'a' },
      { q: '什么牙不会掉？', a: '月牙', b: '假牙', ans: 'a' },
      { q: '什么鸟不会飞？', a: '鸵鸟', b: '风筝', ans: 'a' },
      { q: '什么东西越擦越小？', a: '橡皮', b: '铅笔', ans: 'a' },
      { q: '什么灯不能亮？', a: '拉登', b: '路灯', ans: 'a' },
      { q: '什么鬼不吓人？', a: '机灵鬼', b: '吸血鬼', ans: 'a' },
      { q: '什么猫不抓老鼠？', a: '熊猫', b: '野猫', ans: 'a' },
      { q: '什么东西越多越看不见？', a: '黑暗', b: '星星', ans: 'a' },
      { q: '什么腿不能走路？', a: '火腿', b: '桌子腿', ans: 'a' },
      { q: '什么水不能喝？', a: '薪水', b: '海水', ans: 'a' },
    ];
    this.shuffleArray(this.quizPool);
  }

  getRandomQuiz() {
    if (this.quizPool.length === 0) this.initQuizPool();
    const q = this.quizPool.pop();
    // 随机决定哪个选项是a哪个是b
    if (Math.random() > 0.5) {
      return { q: q.q, optA: q.a, optB: q.b, correct: 'A' };
    } else {
      return { q: q.q, optA: q.b, optB: q.a, correct: 'B' };
    }
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  generateTopFruits() {
    this.topFruits = [];

    // 保证每种偶数个（消除以对为单位）
    const types = [];
    const perType = Math.ceil(this.maxFruits / this.maxTypes);
    const evenPer = perType % 2 === 0 ? perType : perType + 1;

    for (let t = 0; t < this.maxTypes; t++) {
      for (let i = 0; i < evenPer; i++) types.push(t);
    }

    const total = Math.min(types.length, this.maxFruits);
    types.length = total % 2 === 0 ? total : total - 1;

    // 打乱
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    // 棋盘网格:居中多列 + 松散间距 + 随机分布(随机留空 + 轻微抖动)
    // 底部行(row==clearedRows)清空后整体下滚一行,顶部隐藏行随之露出
    const { width, safeTop } = this.designSize;
    this.colStep = this.fruitRadius * 2 + 26;
    this.rowStep = this.fruitRadius * 2 + 22;
    this.gridCols = Math.max(4, Math.min(6, Math.floor((width - 40) / this.colStep)));

    const gridWidth = this.gridCols * this.colStep;
    this.gridStartX = (width - gridWidth) / 2 + this.colStep / 2;

    // 可见横带(高位,与旧版位置一致),仅显示 visibleRows 行,其余行隐藏在上方
    this.waitVisibleTop = safeTop + 235;
    this.visibleRows = 4;
    this.waitBottomY = this.waitVisibleTop + this.fruitRadius + (this.visibleRows - 1) * this.rowStep;
    this.clearedRows = 0;

    // 生成足够多的行,把水果随机撒入格子(留白 → 随机分布观感)
    const count = types.length;
    const fillRatio = 0.72;
    const rows = Math.max(this.visibleRows, Math.ceil(count / (this.gridCols * fillRatio)));
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < this.gridCols; c++) cells.push({ r, c });
    }
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    for (let i = 0; i < count; i++) {
      const type = types[i];
      const { r, c } = cells[i];
      const jx = (Math.random() - 0.5) * 12;
      const jy = (Math.random() - 0.5) * 10;
      const f = {
        row: r, col: c, type,
        emoji: FRUITS[type].emoji, color: FRUITS[type].color,
        radius: this.fruitRadius, removed: false,
        jy, x: this.gridStartX + c * this.colStep + jx, y: 0, targetY: 0
      };
      f.targetY = this.computeTargetY(f);
      f.y = f.targetY;
      this.topFruits.push(f);
    }

    this.totalFruits = count;
    this.remainingFruits = count;

    // 归一化初始底行(跳过随机留空的底部行)
    this.advanceRows();
    for (const f of this.topFruits) f.y = this.computeTargetY(f);
  }

  // 某水果当前应处的 Y(随 clearedRows 整体下移)
  computeTargetY(f) {
    return this.waitBottomY - (f.row - this.clearedRows) * this.rowStep + (f.jy || 0);
  }

  // 底部行清空后整体下滚一行(连续空行一并跳过)
  advanceRows() {
    let guard = 0;
    while (guard++ < 2000) {
      if (!this.topFruits.some(f => !f.removed)) break;
      const bottomHas = this.topFruits.some(f => !f.removed && f.row === this.clearedRows);
      if (bottomHas) break;
      this.clearedRows++;
    }
  }

  // 每帧把等待水果的 y 平滑逼近 targetY(整片下滚动画)
  updateWaiting(dt) {
    const k = Math.min(1, 0.2 * dt);
    for (const f of this.topFruits) {
      if (f.removed) continue;
      f.targetY = this.computeTargetY(f);
      if (Math.abs(f.targetY - f.y) > 0.5) {
        f.y += (f.targetY - f.y) * k;
      } else {
        f.y = f.targetY;
      }
    }
  }

  clickFruit(fruit) {
    if (fruit.removed) return;
    fruit.removed = true;
    playSound(SoundType.DROP);

    this.advanceRows();

    this.fruits.push({
      x: fruit.x,
      y: fruit.y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 0,
      type: fruit.type,
      emoji: fruit.emoji,
      color: fruit.color,
      radius: fruit.radius,
      settled: false,
      inBucket: false,
      trail: []
    });
  }

  animate(currentTime) {
    if (this.gameOver || this.gameWon) {
      this.draw();
      return;
    }

    if (this.lastTime == null) this.lastTime = currentTime;
    const dt = Math.min((currentTime - this.lastTime) / 16.67, 2);
    this.lastTime = currentTime;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.animate);
  }

  update(dt) {
    // 水果互相碰撞（掉落中的水果之间）
    for (let i = 0; i < this.fruits.length; i++) {
      for (let j = i + 1; j < this.fruits.length; j++) {
        this.resolveCollision(this.fruits[i], this.fruits[j]);
      }
    }

    // 掉落水果与等待区水果碰撞（等待区视为静态障碍，只推开掉落方，不穿过）
    for (const f of this.fruits) {
      if (f.settled) continue;
      for (const w of this.topFruits) {
        if (w.removed) continue;
        this.resolveCollisionStatic(f, w);
      }
    }

    // 等待区整片下滚
    this.updateWaiting(dt);

    // 更新每个水果
    for (const f of this.fruits) {
      if (f.settled) continue;
      
      // 轨迹
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > 4) f.trail.shift();

      // 重力
      f.vy = Math.min(f.vy + GRAVITY * dt, MAX_VY);
      f.y += f.vy * dt;
      f.x += (f.vx || 0) * dt;
      
      // 判断是否在桶内（X范围内且Y在桶口以下）
      const inBucketX = f.x > this.bucketLeft && f.x < this.bucketRight;
      const inBucketY = f.y > this.bucketTop;
      
      if (inBucketX && inBucketY) {
        // 桶内 - 水平约束，只允许垂直运动
        f.inBucket = true;
        f.vx *= 0.5;
        f.x = Math.max(this.bucketLeft + f.radius, Math.min(this.bucketRight - f.radius, f.x));
        
        // 桶底
        if (f.y + f.radius >= this.bucketBottom) {
          f.y = this.bucketBottom - f.radius;
          if (Math.abs(f.vy) > 2) {
            f.vy = -f.vy * BOUNCE;
          } else {
            f.vy = 0; f.vx = 0;
            f.settled = true;
            this.checkElimination();
          }
        }
        
        // 检查是否停在其他水果上
        this.trySettleOnOther(f);
      } else if (inBucketX && !inBucketY) {
        // 在桶正上方但还没进入桶口
        f.inBucket = false;
        f.vx *= 0.5;
        f.x = Math.max(this.bucketLeft + f.radius, Math.min(this.bucketRight - f.radius, f.x));
        // 尝试停在桶口的水果上
        this.trySettleOnOther(f);
      } else {
        // 斜坡区域
        f.vx *= SLOPE_FRICTION;
        
        // 斜坡碰撞
        this.collideSlope(f, 
          this.slopeLeftStartX, this.slopeTopY, 
          this.bucketLeft, this.bucketTop, 1);
        this.collideSlope(f, 
          this.slopeRightStartX, this.slopeTopY, 
          this.bucketRight, this.bucketTop, -1);
        
        // 斜坡滑动：检测水果是否在斜坡上，施加向桶方向的力
        if (f.y > this.slopeTopY - f.radius && f.y < this.bucketTop + f.radius) {
          if (f.x < this.bucketCenterX) {
            f.vx += 0.15 * dt; // 左斜坡向右滑
          } else {
            f.vx -= 0.15 * dt; // 右斜坡向左滑
          }
        }
        
        // 边界
        if (f.x - f.radius < 5) {
          f.x = 5 + f.radius;
          f.vx = Math.abs(f.vx) * 0.5;
        }
        if (f.x + f.radius > this.designSize.width - 5) {
          f.x = this.designSize.width - 5 - f.radius;
          f.vx = -Math.abs(f.vx) * 0.5;
        }
        
        // 掉出底部
        if (f.y > this.bucketBottom + 50) {
          f.y = this.bucketBottom;
          f.settled = true;
        }
      }
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2 * dt;
      p.life -= 0.025 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 分数弹窗
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      this.scorePopups[i].progress += 0.03 * dt;
      if (this.scorePopups[i].progress >= 1) this.scorePopups.splice(i, 1);
    }

    this.checkWin();
    this.checkOverflow();
  }

  collideSlope(fruit, x1, y1, x2, y2, normalDir) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return;
    
    let t = ((fruit.x - x1) * dx + (fruit.y - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    const distX = fruit.x - closestX;
    const distY = fruit.y - closestY;
    const dist = Math.sqrt(distX * distX + distY * distY);
    
    if (dist < fruit.radius && dist > 0) {
      const nx = distX / dist;
      const ny = distY / dist;
      const overlap = fruit.radius - dist;
      
      fruit.x += nx * overlap;
      fruit.y += ny * overlap;
      
      // 反弹
      const vn = fruit.vx * nx + fruit.vy * ny;
      if (vn < 0) {
        fruit.vx -= (1 + BOUNCE) * vn * nx;
        fruit.vy -= (1 + BOUNCE) * vn * ny;
      }
    }
  }

  trySettleOnOther(f) {
    for (const other of this.fruits) {
      if (other === f || !other.settled) continue;
      const dy = other.y - f.y;
      const dist = Math.abs(f.y - other.y);
      if (dist < f.radius + other.radius + 4 && dy > 0 && Math.abs(f.x - other.x) < f.radius + other.radius) {
        f.y = other.y - f.radius - other.radius;
        f.inBucket = true; // 即使物理上在桶口上方，也算在桶堆里
        if (Math.abs(f.vy) > 2) {
          f.vy = -f.vy * BOUNCE;
        } else {
          f.vy = 0; f.vx = 0;
          f.settled = true;
          this.checkElimination();
        }
        break;
      }
    }
  }

  resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;
    
    if (dist < minDist && dist > 0.1) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      
      // 分离
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
      
      // 速度交换
      const dvx = b.vx - a.vx;
      const dvy = b.vy - a.vy;
      const dvDotN = dvx * nx + dvy * ny;
      
      if (dvDotN < 0) {
        const impulse = dvDotN * 0.5;
        a.vx += impulse * nx;
        a.vy += impulse * ny;
        b.vx -= impulse * nx;
        b.vy -= impulse * ny;
      }
      
      // 如果一个已稳定，让另一个弹开
      if (a.settled && !b.settled) {
        b.vy = -Math.abs(b.vy) * 0.3;
      } else if (b.settled && !a.settled) {
        a.vy = -Math.abs(a.vy) * 0.3;
      }
    }
  }

  resolveCollisionStatic(a, b) {
    // b 视为不动障碍，只把 a 推开 + 反弹，避免 a 穿过 b
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;
    if (dist < minDist && dist > 0.1) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      a.x += nx * overlap;
      a.y += ny * overlap;
      const vDotN = a.vx * nx + a.vy * ny;
      if (vDotN < 0) {
        a.vx -= vDotN * nx * 1.4;
        a.vy -= vDotN * ny * 1.4;
      }
    }
  }

  checkElimination() {
    let found = true;
    while (found) {
      found = false;
      // 从底部往上检查相邻水果
      const bucketFruits = this.fruits
        .filter(f => f.settled && f.inBucket)
        .sort((a, b) => b.y - a.y); // 按Y从大到小（底部在上）
      
      for (let i = 0; i < bucketFruits.length - 1; i++) {
        const a = bucketFruits[i];
        const b = bucketFruits[i + 1];
        
        if (a.type === b.type) {
          // 消除
          this.combo++;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          const gain = 10 * this.combo;
          this.score += gain;
          this.remainingFruits -= 2;
          
          playSound(SoundType.CLEAR);
          this.createParticles(a.x, a.y, a.color);
          this.createParticles(b.x, b.y, b.color);
          this.scorePopups.push({
            text: `+${gain}`,
            x: this.bucketCenterX,
            y: Math.min(a.y, b.y) - 30,
            progress: 0
          });
          
          // 移除
          this.fruits = this.fruits.filter(f => f !== a && f !== b);
          
          // 让上方的水果落下
          for (const f of this.fruits) {
            if (f.settled && f.inBucket && f.y < Math.max(a.y, b.y)) {
              f.settled = false;
              f.vy = 1;
            }
          }
          
          found = true;
          break;
        }
      }
    }
  }

  createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color, life: 1, size: 4 + Math.random() * 4
      });
    }
  }

  checkWin() {
    const hasTop = this.topFruits.some(f => !f.removed);
    const hasFalling = this.fruits.some(f => !f.settled);
    const hasBucket = this.fruits.some(f => f.settled);
    if (!hasTop && !hasFalling && !hasBucket) {
      this.gameWon = true;
      playSound(SoundType.LEVEL_UP);
      this.showEndModal();
    }
  }

  checkOverflow() {
    // 基于计数：超过4个已稳定水果且无法消除 → 失败
    const settledCount = this.fruits.filter(f => f.settled).length;
    if (settledCount > 4) {
      this.gameOver = true;
      playSound(SoundType.GAME_OVER);
      this.showEndModal();
    }
  }

  showEndModal() {
    const isWin = this.gameWon;
    const hasNext = isWin && this.currentLevel < this.levels.length - 1;
    // 星级:本关最大连击,放宽阈值让3星可达(奖励手感,不惩罚稳扎稳打)
    const stars = this.maxCombo >= 3 ? 3 : this.maxCombo >= 1 ? 2 : 1;
    if (isWin) {
      completeLevel(this.gameId, this.currentLevel, { timeMs: this.gameStartTime ? Date.now() - this.gameStartTime : 0, stars });
      saveLevelStars(this.gameId, this.currentLevel, stars);
    }
    this.result = new LevelResult(this.designSize, {
      win: isWin,
      score: this.score,
      scoreLabel: '得分',
      levelName: this.levelName,
      hasNext,
      stars,
      primaryColor: '#e65100'
    });
  }

  onTouchStart(pos) {
    // 结算遮罩优先处理
    if ((this.gameOver || this.gameWon) && this.result) {
      const action = this.result.onTouchStart(pos);
      if (action === 'next') this.nextLevel();
      else if (action === 'replay' || action === 'retry') this.retry();
      else if (action === 'back') this.onEnd({ score: this.score, passed: this.gameWon });
      return;
    }

    // 答题弹窗点击
    if (this.showQuiz) {
      if (this.quizResult && this.quizResult === 'correct') {
        // 正确后关闭
        this.showQuiz = false;
        this.quizData = null;
        this.quizResult = null;
        return;
      }
      if (this.quizResult && this.quizResult === 'wrong') {
        // 错误后关闭（不获得锤子）
        this.showQuiz = false;
        this.quizData = null;
        this.quizResult = null;
        return;
      }
      if (this.quizBtn && pos.x >= this.quizBtn.x && pos.x <= this.quizBtn.x + this.quizBtn.w &&
          pos.y >= this.quizBtn.y && pos.y <= this.quizBtn.y + this.quizBtn.h) {
        this.onQuizAnswer('A');
        return;
      }
      if (this.quizBtn2 && pos.x >= this.quizBtn2.x && pos.x <= this.quizBtn2.x + this.quizBtn2.w &&
          pos.y >= this.quizBtn2.y && pos.y <= this.quizBtn2.y + this.quizBtn2.h) {
        this.onQuizAnswer('B');
        return;
      }
      return;
    }

    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') {
      this.gameOver = true;
      this.onEnd({ score: this.score, passed: false });
      return;
    }
    if (btn === 'soundBtn') {
      audioManager.toggle();
      return;
    }

    // 锤子图标按钮
    if (this.hammerIconBtn) {
      const hb = this.hammerIconBtn;
      if (pos.x >= hb.x && pos.x <= hb.x + hb.w &&
          pos.y >= hb.y && pos.y <= hb.y + hb.h) {
        if (this.hammerActive) {
          this.hammerActive = false;
        } else if (this.hammerCount > 0) {
          this.hammerActive = true;
        } else {
          this.showQuiz = true;
          this.quizData = this.getRandomQuiz();
          this.quizResult = null;
        }
        return;
      }
    }

    // 锤子模式：点击水果消除
    if (this.hammerActive && this.hammerCount > 0) {
      // 点击桶内水果
      for (const f of this.fruits) {
        if (!f.settled) continue;
        const dx = pos.x - f.x;
        const dy = pos.y - f.y;
        if (Math.sqrt(dx * dx + dy * dy) <= f.radius + 20) {
          this.hammerCount--;
          this.hammerActive = false;
          this.combo = 0;
          this.remainingFruits--;
          playSound(SoundType.CLEAR);
          this.createParticles(f.x, f.y, f.color);
          this.scorePopups.push({ text: '🔨', x: f.x, y: f.y - 30, progress: 0 });
          this.fruits = this.fruits.filter(f2 => f2 !== f);
          // 上方水果落下来
          for (const ff of this.fruits) {
            if (ff.settled && ff.inBucket && ff.y < f.y) {
              ff.settled = false;
              ff.vy = 1;
            }
          }
          return;
        }
      }
      // 点击未放置的水果
      // 锤子只能消除桶里的，不能消除空中的
      return;
    }

    // 点击等待区:取可见区内最近的水果(随机分布,任意可见水果可点)
    let closest = null;
    let closestDist = Infinity;
    for (const f of this.topFruits) {
      if (f.removed) continue;
      if (f.y < this.waitVisibleTop - this.fruitRadius) continue; // 隐藏在上方,不可点
      const dx = pos.x - f.x;
      const dy = pos.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= f.radius + 14 && dist < closestDist) {
        closest = f;
        closestDist = dist;
      }
    }
    if (closest) this.clickFruit(closest);
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  onQuizAnswer(choice) {
    if (!this.quizData) return;
    if (choice === this.quizData.correct) {
      this.quizResult = 'correct';
      this.hammerCount = Math.min(this.hammerCount + 1, 3);
      playSound(SoundType.LEVEL_UP);
    } else {
      this.quizResult = 'wrong';
      playSound(SoundType.GAME_OVER);
    }
  }

  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop, safeBottom } = this.designSize;

    // 天空 → 草地渐变（清新果园）
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, '#6ec0f0');
    skyGradient.addColorStop(0.4, '#aee3ff');
    skyGradient.addColorStop(0.62, '#d8f5cf');
    skyGradient.addColorStop(1, '#7ec850');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    // 草地条带
    const grassY = height - safeBottom - 56;
    const grassGrad = ctx.createLinearGradient(0, grassY, 0, height);
    grassGrad.addColorStop(0, '#76c83e');
    grassGrad.addColorStop(1, '#4f9a2e');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, grassY, width, height - grassY);
    // 草尖锯齿
    ctx.fillStyle = '#5fb33a';
    for (let i = 0; i < width; i += 26) {
      ctx.beginPath();
      ctx.moveTo(i, grassY + 6);
      ctx.lineTo(i + 13, grassY - 9);
      ctx.lineTo(i + 26, grassY + 6);
      ctx.closePath();
      ctx.fill();
    }

    // 氛围装饰
    this.drawDecorations(ctx, width, height);

    // 标题
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    drawText(ctx, '🍎 接水果', width / 2, safeTop + 38, { fontSize: 36, color: '#c4390a', bold: true });
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 信息行（下移避开标题）
    drawText(ctx, `分数: ${this.score}`, width / 2 - 70, safeTop + 92, { fontSize: 22, color: '#a3330a', bold: true });

    const remaining = this.topFruits.filter(f => !f.removed).length + this.fruits.length;
    drawText(ctx, `剩余: ${remaining}`, width / 2 + 70, safeTop + 92, { fontSize: 22, color: '#a3330a', bold: true });

    if (this.combo > 1) {
      drawText(ctx, `🔥 连击 x${this.combo}`, width / 2, safeTop + 122, { fontSize: 20, color: '#d84315', bold: true });
    }

    // 锤子图标（桶左边）
    this.drawHammerIcon(ctx, this.bucketLeft - this.bucketWallThick - 46, this.bucketBottom - 54);

    // 标准按钮栏
    this.buttons = this.drawButtons(ctx, safeTop);

    // 绘制场景
    this.drawSlopes(ctx);
    this.drawBucket(ctx);

    // 等待区水果（裁剪到可见区，超出上方的行被隐藏，随下滚逐渐露出）
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.waitVisibleTop, width, this.waitBottomY + this.fruitRadius + 4 - this.waitVisibleTop);
    ctx.clip();
    for (const f of this.topFruits) {
      if (f.removed) continue;
      this.drawFruit(f, 1, 1);
    }
    ctx.restore();

    // 掉落水果（带轨迹）
    for (const f of this.fruits) {
      // 轨迹
      for (let i = 0; i < f.trail.length; i++) {
        const t = f.trail[i];
        ctx.globalAlpha = (i + 1) / f.trail.length * 0.2;
        ctx.font = `${Math.floor(f.radius * 1.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.emoji, t.x, t.y);
      }
      ctx.globalAlpha = 1;
      this.drawFruit(f, 1, 1);
    }

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 分数弹窗
    for (const sp of this.scorePopups) {
      ctx.globalAlpha = 1 - sp.progress;
      drawText(ctx, sp.text, sp.x, sp.y - sp.progress * 35, { fontSize: 36, color: '#e65100', bold: true });
    }
    ctx.globalAlpha = 1;

    // 答题弹窗
    if (this.showQuiz) {
      this.drawQuizPopup(ctx, width, height);
    }

    // 游戏结束统一结算遮罩（最顶层）
    if ((this.gameWon || this.gameOver) && this.result) {
      this.result.draw(ctx);
    }
  }

  drawDecorations(ctx, width, height) {
    ctx.save();
    // 太阳
    const sunX = width - 95, sunY = 95;
    ctx.fillStyle = 'rgba(255,226,122,0.35)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(sunX + Math.cos(a) * 38, sunY + Math.sin(a) * 38);
      ctx.lineTo(sunX + Math.cos(a) * 52, sunY + Math.sin(a) * 52);
      ctx.stroke();
    }
    // 云朵
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const clouds = [
      { x: 90, y: 80, s: 1 },
      { x: 250, y: 58, s: 0.7 },
      { x: width - 200, y: 72, s: 0.85 }
    ];
    for (const cloud of clouds) {
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, 26 * cloud.s, 0, Math.PI * 2);
      ctx.arc(cloud.x + 22 * cloud.s, cloud.y - 12 * cloud.s, 20 * cloud.s, 0, Math.PI * 2);
      ctx.arc(cloud.x + 44 * cloud.s, cloud.y, 24 * cloud.s, 0, Math.PI * 2);
      ctx.arc(cloud.x + 22 * cloud.s, cloud.y + 6 * cloud.s, 22 * cloud.s, 0, Math.PI * 2);
      ctx.fill();
    }
    // 草地小花
    const flowers = [
      { x: 50, y: height - 18, c: '#ff8fab', s: 1 },
      { x: 130, y: height - 12, c: '#fff176', s: 0.8 },
      { x: width - 60, y: height - 22, c: '#ce93d8', s: 0.9 },
      { x: width - 140, y: height - 14, c: '#ff8fab', s: 0.7 }
    ];
    for (const fl of flowers) {
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * 2 * i / 5;
        ctx.fillStyle = fl.c;
        ctx.beginPath();
        ctx.arc(fl.x + Math.cos(a) * 5 * fl.s, fl.y + Math.sin(a) * 5 * fl.s, 2.5 * fl.s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff176';
      ctx.beginPath();
      ctx.arc(fl.x, fl.y, 2 * fl.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawSlopes(ctx) {
    const thick = 12;
    const drawOne = (startX, bucketX, dir) => {
      // 草绿斜坡主体（上亮下深）
      const g = ctx.createLinearGradient(0, this.slopeTopY - thick, 0, this.slopeTopY + thick);
      g.addColorStop(0, '#8ee05a');
      g.addColorStop(1, '#4a9a2a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(startX, this.slopeTopY - thick);
      ctx.lineTo(startX, this.slopeTopY + thick);
      ctx.lineTo(bucketX, this.bucketTop + thick);
      ctx.lineTo(bucketX, this.bucketTop - thick);
      ctx.closePath();
      ctx.fill();
      // 草叶纹理
      ctx.fillStyle = '#6fc03a';
      const steps = 8;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const px = startX + (bucketX - startX) * t;
        const py = this.slopeTopY - thick + (this.bucketTop - this.slopeTopY) * t;
        ctx.beginPath();
        ctx.moveTo(px - 3, py + 4);
        ctx.lineTo(px, py - 6);
        ctx.lineTo(px + 3, py + 4);
        ctx.closePath();
        ctx.fill();
      }
    };
    drawOne(this.slopeLeftStartX, this.bucketLeft, 1);
    drawOne(this.slopeRightStartX, this.bucketRight, -1);
  }

  drawBucket(ctx) {
    const thick = this.bucketWallThick;
    const outerL = this.bucketLeft - thick;
    const outerR = this.bucketRight + thick;
    const bodyTop = this.bucketTop;
    const bodyH = this.bucketHeight;

    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // 篮身：暖蜜色渐变（上亮下暗）
    const wallGrad = ctx.createLinearGradient(outerL, bodyTop, this.bucketLeft, bodyTop);
    wallGrad.addColorStop(0, '#c98a3e');
    wallGrad.addColorStop(1, '#e8b063');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(outerL, bodyTop, thick, bodyH);
    const wallGradR = ctx.createLinearGradient(this.bucketRight, bodyTop, outerR, bodyTop);
    wallGradR.addColorStop(0, '#e8b063');
    wallGradR.addColorStop(1, '#c98a3e');
    ctx.fillStyle = wallGradR;
    ctx.fillRect(this.bucketRight, bodyTop, thick, bodyH);

    // 篮底
    ctx.fillStyle = '#8a5a26';
    ctx.fillRect(outerL, this.bucketBottom, this.bucketHalfWidth * 2 + thick * 2, thick);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 竖向编织纹（篮壁）
    ctx.strokeStyle = 'rgba(120,72,20,0.4)';
    ctx.lineWidth = 2;
    for (let x = outerL + 4; x < this.bucketLeft; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, bodyTop + 4);
      ctx.lineTo(x, this.bucketBottom);
      ctx.stroke();
    }
    for (let x = this.bucketRight + 4; x < outerR; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, bodyTop + 4);
      ctx.lineTo(x, this.bucketBottom);
      ctx.stroke();
    }

    // 篮口厚边沿（奶油色 rim，双线）
    ctx.fillStyle = '#f3d9a0';
    ctx.beginPath();
    ctx.moveTo(outerL - 3, bodyTop - 6);
    ctx.lineTo(outerR + 3, bodyTop - 6);
    ctx.lineTo(outerR + 1, bodyTop + 4);
    ctx.lineTo(outerL - 1, bodyTop + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a97530';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 内壁阴影
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(this.bucketLeft, bodyTop, this.bucketRight - this.bucketLeft, 5);
  }

  drawButtons(ctx, safeTop) {
    const backBtn = this.backButton;
    const shareBtn = this.shareButton;
    const soundBtn = this.soundButton;

    this.drawCustomBtn(ctx, backBtn.x, backBtn.y, backBtn.width, backBtn.height, '← 返回', Colors.danger);
    this.drawCustomBtn(ctx, shareBtn.x, shareBtn.y, shareBtn.width, shareBtn.height, '分享', Colors.success);
    this.drawCustomBtn(ctx, soundBtn.x, soundBtn.y, soundBtn.width, soundBtn.height,
      audioManager.enabled ? '🔊' : '🔇', Colors.info);

    return { backBtn, shareBtn, soundBtn };
  }

  drawCustomBtn(ctx, x, y, w, h, text, color) {
    ctx.fillStyle = color;
    this.roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    drawText(ctx, text, x + w / 2, y + h / 2, { fontSize: 32, color: '#fff', bold: true });
  }

  drawHammerIcon(ctx, cx, cy) {
    // 锤子按钮（功能按钮：视觉半径 r 同时决定点击热区 hammerIconBtn）
    const r = 30;
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = this.hammerActive ? 'rgba(239,68,68,0.95)' : 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = this.hammerActive ? '#b91c1c' : '#e65100';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = `${Math.round(r * 1.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔨', cx, cy - 1);

    // 数量角标
    if (this.hammerCount > 0) {
      ctx.fillStyle = '#e65100';
      ctx.beginPath();
      ctx.arc(cx + r - 6, cy - r + 6, 12, 0, Math.PI * 2);
      ctx.fill();
      drawText(ctx, `${this.hammerCount}`, cx + r - 6, cy - r + 6, { fontSize: 16, color: '#fff', bold: true });
    } else {
      drawText(ctx, '答题', cx, cy + r + 14, { fontSize: 13, color: '#e65100', bold: true });
    }

    this.hammerIconBtn = { x: cx - r, y: cy - r, w: r * 2, h: r * 2 + 18 };
  }

  drawQuizPopup(ctx, width, height) {
    if (!this.quizData) return;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, width, height);

    const cardW = 380;
    const cardH = 380;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    const cardGradient = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
    cardGradient.addColorStop(0, '#fff8e1');
    cardGradient.addColorStop(1, '#ffe0b2');
    ctx.fillStyle = cardGradient;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 3;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.stroke();

    drawText(ctx, '🧠 脑筋急转弯', width / 2, cardY + 45, { fontSize: 32, color: '#e65100', bold: true });
    drawText(ctx, '答对获得 1 把锤子！', width / 2, cardY + 80, { fontSize: 22, color: '#bf360c' });

    // 问题文本（自动换行）
    const maxLineW = cardW - 60;
    const lineH = 28;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = this.quizData.q.split('');
    let line = '';
    let lines = [];
    for (const ch of words) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxLineW && line.length > 0) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    const textStartY = cardY + 130;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], width / 2, textStartY + i * lineH);
    }

    // 选项按钮
    const btnW = 150;
    const btnH = 50;
    const btnGap = 20;
    const btnY = cardY + cardH - 110;

    // A选项
    const btnAX = width / 2 - btnW - btnGap / 2;
    ctx.fillStyle = '#4caf50';
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnAX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.stroke();
    drawText(ctx, `A: ${this.quizData.optA}`, btnAX + btnW / 2, btnY + btnH / 2, { fontSize: 20, color: '#fff', bold: true });

    // B选项
    const btnBX = width / 2 + btnGap / 2;
    ctx.fillStyle = '#2196f3';
    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnBX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.stroke();
    drawText(ctx, `B: ${this.quizData.optB}`, btnBX + btnW / 2, btnY + btnH / 2, { fontSize: 20, color: '#fff', bold: true });

    this.quizBtn = { x: btnAX, y: btnY, w: btnW, h: btnH };
    this.quizBtn2 = { x: btnBX, y: btnY, w: btnW, h: btnH };

    // 结果提示
    if (this.quizResult) {
      const resultY = btnY + btnH + 20;
      const isCorrect = this.quizResult === 'correct';
      drawText(ctx, isCorrect ? '✅ 正确！获得 1 把锤子' : '❌ 错误！再试试', width / 2, resultY, { fontSize: 22, color: isCorrect ? '#2e7d32' : '#e53935', bold: true });
    }
  }

  drawFruit(fruit, alpha, scale) {
    const ctx = this.ctx;
    const r = fruit.radius * scale;
    ctx.globalAlpha = alpha;

    // 用水果自己的 emoji 图形，加深色投影让相邻水果边缘可感
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#000';
    ctx.font = `${Math.floor(r * 1.9)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fruit.emoji, fruit.x, fruit.y);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  destroy() {
    this.gameOver = true;
  }
}

export default FruitGame;
