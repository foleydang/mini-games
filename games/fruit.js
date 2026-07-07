// 水果消消乐 - 窄桶 + 双斜坡 + 物理碰撞
import { drawText, Storage, RankData } from '../common/utils.js';
import { getBackButton, checkBottomButtons, drawHint } from '../common/ui.js';
import { playSound, SoundType, audioManager } from '../common/audio.js';

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
    this.level = level;

    const levelConfigs = [
      { maxFruits: 16, types: 4, radius: 36 },
      { maxFruits: 20, types: 5, radius: 34 },
      { maxFruits: 24, types: 6, radius: 32 },
      { maxFruits: 28, types: 7, radius: 30 },
      { maxFruits: 32, types: 8, radius: 28 }
    ];
    const cfg = levelConfigs[Math.min(level, levelConfigs.length - 1)];
    this.maxFruits = cfg.maxFruits;
    this.maxTypes = cfg.types;
    this.fruitRadius = cfg.radius;

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.scoreSaved = false;

    const { width, height, safeTop, safeBottom } = designSize;

    // 窄桶 - 只有一列水果宽
    this.bucketCenterX = width / 2;
    this.bucketHalfWidth = this.fruitRadius + 6;
    this.bucketLeft = this.bucketCenterX - this.bucketHalfWidth;
    this.bucketRight = this.bucketCenterX + this.bucketHalfWidth;
    // 桶高度：刚好4个水果（8倍半径），第4个水果顶部与桶口齐平
    this.bucketCapacity = 4;
    this.bucketBottom = height - safeBottom - 40;
    this.bucketTop = this.bucketBottom - this.fruitRadius * 2 * this.bucketCapacity;
    this.bucketHeight = this.bucketBottom - this.bucketTop;

    // 斜坡 - 非常平缓（~5度），从屏幕边缘到桶口，垂直落差仅14px
    this.slopeTopY = this.bucketTop - 14;
    this.slopeLeftStartX = 0;
    this.slopeRightStartX = width;

    this.fruits = []; // 所有水果统一在一个数组
    this.topFruits = []; // 待点击的水果
    this.particles = [];
    this.scorePopups = [];
    this.confirmBtn = null;
    this.quizBtn = null;
    this.quizBtn2 = null;

    // 锤子系统
    this.hammerCount = 3;
    this.hammerActive = false;
    this.showQuiz = false;
    this.quizData = null;
    this.quizResult = null;
    this.quizResultTimer = 0;
    this.quizPool = []; // 题库
    this.initQuizPool();

    this.backButton = getBackButton(designSize);
    this.buttons = null;

    this.generateTopFruits();
    audioManager.startBgMusic();

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
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
    
    // 保证每种偶数个
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

    // 随机放置在斜坡区域（左斜坡 + 右斜坡）
    const { width } = this.designSize;
    const padding = 15;
    const minGap = 8;
    
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const isLeft = i % 2 === 0;
      let placed = false;

      // 放置区域：斜坡上方（safeTop+130 到 slopeTopY-10），左右分区
      const { safeTop } = this.designSize;
      const areaTop = safeTop + 130;
      const areaBottom = this.slopeTopY - 10;
      
      for (let attempt = 0; attempt < 50; attempt++) {
        let x, y;
        if (isLeft) {
          x = 20 + this.fruitRadius + Math.random() * (this.bucketLeft - 40 - this.fruitRadius * 2);
          y = areaTop + Math.random() * (areaBottom - areaTop);
        } else {
          x = this.bucketRight + 20 + this.fruitRadius + Math.random() * (this.designSize.width - this.bucketRight - 40 - this.fruitRadius * 2);
          y = areaTop + Math.random() * (areaBottom - areaTop);
        }
        
        let overlap = false;
        for (const other of this.topFruits) {
          const dx = other.x - x;
          const dy = other.y - y;
          if (Math.sqrt(dx * dx + dy * dy) < this.fruitRadius * 2 + minGap) {
            overlap = true; break;
          }
        }
        
        if (!overlap) {
          this.topFruits.push({ x, y, type, emoji: FRUITS[type].emoji, color: FRUITS[type].color, radius: this.fruitRadius, removed: false });
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        const x = isLeft ? 20 + this.fruitRadius + Math.random() * (this.bucketLeft - 40 - this.fruitRadius * 2)
          : this.bucketRight + 20 + this.fruitRadius + Math.random() * (this.designSize.width - this.bucketRight - 40 - this.fruitRadius * 2);
        const y = areaTop + Math.random() * (areaBottom - areaTop);
        this.topFruits.push({ x, y, type, emoji: FRUITS[type].emoji, color: FRUITS[type].color, radius: this.fruitRadius, removed: false });
      }
    }
    
    this.totalFruits = this.topFruits.length;
    this.remainingFruits = this.totalFruits;
  }

  clickFruit(fruit) {
    if (fruit.removed) return;
    fruit.removed = true;
    playSound(SoundType.DROP);
    
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
      audioManager.stopBgMusic();
      this.draw();
      return;
    }

    const dt = Math.min((currentTime - this.lastTime) / 16.67, 2);
    this.lastTime = currentTime;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.animate);
  }

  update(dt) {
    // 水果互相碰撞
    for (let i = 0; i < this.fruits.length; i++) {
      for (let j = i + 1; j < this.fruits.length; j++) {
        this.resolveCollision(this.fruits[i], this.fruits[j]);
      }
    }

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
            f.vx += 0.08 * dt; // 左斜坡向右滑
          } else {
            f.vx -= 0.08 * dt; // 右斜坡向左滑
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
    }
  }

  checkOverflow() {
    // 基于计数：超过4个已稳定水果且无法消除 → 失败
    const settledCount = this.fruits.filter(f => f.settled).length;
    if (settledCount > 4) {
      this.gameOver = true;
      playSound(SoundType.GAME_OVER);
    }
  }

  onTouchStart(pos) {
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
      if (!this.scoreSaved) { RankData.save(this.gameId, this.score); this.scoreSaved = true; }
      this.onEnd({ score: this.score, passed: false });
      return;
    }

    // 已结束只处理按钮点击
    if (this.gameOver || this.gameWon) {
      if (btn === 'backBtn') {
        if (!this.scoreSaved) { RankData.save(this.gameId, this.score); this.scoreSaved = true; }
        this.onEnd({ score: this.score, passed: this.gameWon });
        return;
      }
      if (this.confirmBtn && pos.x >= this.confirmBtn.x && pos.x <= this.confirmBtn.x + this.confirmBtn.w &&
          pos.y >= this.confirmBtn.y && pos.y <= this.confirmBtn.y + this.confirmBtn.h) {
        if (!this.scoreSaved) { RankData.save(this.gameId, this.score); this.scoreSaved = true; }
        this.onEnd({ score: this.score, passed: this.gameWon });
        return;
      }
      return;
    }

    // 锤子栏按钮
    if (this.hammerBarBtns) {
      const { getQuiz, useHammer } = this.hammerBarBtns;
      if (this.hammerCount < 3 && getQuiz && pos.x >= getQuiz.x && pos.x <= getQuiz.x + getQuiz.w &&
          pos.y >= getQuiz.y && pos.y <= getQuiz.y + getQuiz.h) {
        this.showQuiz = true;
        this.quizData = this.getRandomQuiz();
        this.quizResult = null;
        return;
      }
      if (this.hammerCount > 0 && useHammer && pos.x >= useHammer.x && pos.x <= useHammer.x + useHammer.w &&
          pos.y >= useHammer.y && pos.y <= useHammer.y + useHammer.h) {
        this.hammerActive = !this.hammerActive;
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
      for (const f of this.topFruits) {
        if (f.removed) continue;
        const dx = pos.x - f.x;
        const dy = pos.y - f.y;
        if (Math.sqrt(dx * dx + dy * dy) <= f.radius + 20) {
          this.hammerCount--;
          this.hammerActive = false;
          this.remainingFruits--;
          playSound(SoundType.CLEAR);
          this.createParticles(f.x, f.y, f.color);
          this.scorePopups.push({ text: '🔨', x: f.x, y: f.y - 30, progress: 0 });
          f.removed = true;
          return;
        }
      }
      return;
    }

    // 点击水果
    let closest = null;
    let closestDist = Infinity;
    for (const f of this.topFruits) {
      if (f.removed) continue;
      const dx = pos.x - f.x;
      const dy = pos.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= f.radius + 15 && dist < closestDist) {
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
    const { width, height, safeTop } = this.designSize;

    // 暖色背景
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#fef9e7');
    bgGradient.addColorStop(0.4, '#fdebd0');
    bgGradient.addColorStop(0.7, '#fad7a1');
    bgGradient.addColorStop(1, '#e8c87a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 氛围装饰
    this.drawDecorations(ctx, width, height);

    // 标题
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    drawText(ctx, '🍎 水果消消乐', width / 2, safeTop + 40, { fontSize: 40, color: '#e65100', bold: true });
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 信息行
    drawText(ctx, `分数: ${this.score}`, width / 2 - 80, safeTop + 85, { fontSize: 24, color: '#bf360c', bold: true });
    
    const remaining = this.topFruits.filter(f => !f.removed).length + this.fruits.length;
    drawText(ctx, `剩余: ${remaining}`, width / 2 + 80, safeTop + 85, { fontSize: 24, color: '#bf360c', bold: true });
    
    if (this.combo > 1) {
      drawText(ctx, `🔥 连击 x${this.combo}`, width / 2, safeTop + 115, { fontSize: 22, color: '#d84315', bold: true });
    }

    // 锤子栏
    this.drawHammerBar(ctx, width, height);

    this.buttons = this.drawBackButton(ctx);

    // 绘制场景
    this.drawSlopes(ctx);
    this.drawBucket(ctx);

    // 顶部水果
    for (const f of this.topFruits) {
      if (f.removed) continue;
      this.drawFruit(f, 1, 1);
    }

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

    // 游戏结束弹窗
    if (this.gameWon || this.gameOver) {
      this.drawEndPopup(ctx, width, height, this.gameWon);
    }

    // 答题弹窗（最顶层）
    if (this.showQuiz) {
      this.drawQuizPopup(ctx, width, height);
    }
  }

  drawDecorations(ctx, width, height) {
    // 左侧装饰树
    ctx.save();
    ctx.globalAlpha = 0.15;
    // 树干
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(35, 120, 20, 100);
    // 树冠
    ctx.fillStyle = '#6B8E23';
    ctx.beginPath();
    ctx.arc(45, 110, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7BA428';
    ctx.beginPath();
    ctx.arc(35, 90, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8FBC8F';
    ctx.beginPath();
    ctx.arc(55, 95, 35, 0, Math.PI * 2);
    ctx.fill();

    // 右侧装饰树
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(width - 55, 130, 20, 90);
    ctx.fillStyle = '#6B8E23';
    ctx.beginPath();
    ctx.arc(width - 45, 120, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7BA428';
    ctx.beginPath();
    ctx.arc(width - 35, 100, 35, 0, Math.PI * 2);
    ctx.fill();

    // 飘落的叶子
    const leafPositions = [
      { x: 60, y: 180, s: 0.8, a: 0.12 },
      { x: 80, y: 250, s: 0.6, a: 0.1 },
      { x: width - 70, y: 200, s: 0.7, a: 0.12 },
      { x: width - 90, y: 280, s: 0.5, a: 0.08 },
      { x: 100, y: 320, s: 0.4, a: 0.06 },
      { x: width - 100, y: 350, s: 0.5, a: 0.07 },
    ];
    for (const leaf of leafPositions) {
      ctx.save();
      ctx.globalAlpha = leaf.a;
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(0.5);
      ctx.fillStyle = '#8FBC8F';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8 * leaf.s, 4 * leaf.s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 地上的小花
    const flowerPositions = [
      { x: 50, y: height - 20, c: '#f8bbd0', s: 1 },
      { x: 120, y: height - 15, c: '#fff9c4', s: 0.8 },
      { x: width - 60, y: height - 25, c: '#bbdefb', s: 0.9 },
      { x: width - 130, y: height - 18, c: '#f8bbd0', s: 0.7 },
      { x: 200, y: height - 22, c: '#e1bee7', s: 0.7 },
      { x: width - 200, y: height - 20, c: '#fff9c4', s: 0.8 },
    ];
    for (const flower of flowerPositions) {
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5;
        const px = flower.x + Math.cos(angle) * 6 * flower.s;
        const py = flower.y + Math.sin(angle) * 6 * flower.s;
        ctx.fillStyle = flower.c;
        ctx.beginPath();
        ctx.arc(px, py, 3 * flower.s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff9c4';
      ctx.beginPath();
      ctx.arc(flower.x, flower.y, 2.5 * flower.s, 0, Math.PI * 2);
      ctx.fill();
    }

    // 天空装饰 - 云朵
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#fff';
    const clouds = [
      { x: 80, y: 50, s: 1 },
      { x: 200, y: 35, s: 0.7 },
      { x: width - 100, y: 55, s: 0.9 },
      { x: width - 220, y: 40, s: 0.6 },
    ];
    for (const cloud of clouds) {
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, 25 * cloud.s, 0, Math.PI * 2);
      ctx.arc(cloud.x + 20 * cloud.s, cloud.y - 10 * cloud.s, 18 * cloud.s, 0, Math.PI * 2);
      ctx.arc(cloud.x + 40 * cloud.s, cloud.y, 22 * cloud.s, 0, Math.PI * 2);
      ctx.arc(cloud.x + 20 * cloud.s, cloud.y + 5 * cloud.s, 20 * cloud.s, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawSlopes(ctx) {
    const thick = 12;

    // 左斜坡：从屏幕左边缘到桶口，~5度
    ctx.fillStyle = '#d4a574';
    ctx.beginPath();
    ctx.moveTo(this.slopeLeftStartX, this.slopeTopY - thick);
    ctx.lineTo(this.slopeLeftStartX, this.slopeTopY + thick);
    ctx.lineTo(this.bucketLeft, this.bucketTop + thick);
    ctx.lineTo(this.bucketLeft, this.bucketTop - thick);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.slopeLeftStartX, this.slopeTopY);
    ctx.lineTo(this.bucketLeft, this.bucketTop);
    ctx.stroke();

    // 右斜坡
    ctx.fillStyle = '#d4a574';
    ctx.beginPath();
    ctx.moveTo(this.slopeRightStartX, this.slopeTopY - thick);
    ctx.lineTo(this.slopeRightStartX, this.slopeTopY + thick);
    ctx.lineTo(this.bucketRight, this.bucketTop + thick);
    ctx.lineTo(this.bucketRight, this.bucketTop - thick);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.slopeRightStartX, this.slopeTopY);
    ctx.lineTo(this.bucketRight, this.bucketTop);
    ctx.stroke();
  }

  drawBucket(ctx) {
    // 桶壁阴影
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    
    // 左桶壁
    ctx.fillStyle = '#5c2d0a';
    ctx.fillRect(this.bucketLeft - 8, this.bucketTop, 8, this.bucketHeight);
    
    // 右桶壁
    ctx.fillRect(this.bucketRight, this.bucketTop, 8, this.bucketHeight);
    
    // 桶底
    ctx.fillRect(this.bucketLeft - 8, this.bucketBottom, this.bucketHalfWidth * 2 + 16, 8);
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 桶内壁高光
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.bucketLeft, this.bucketTop);
    ctx.lineTo(this.bucketLeft, this.bucketBottom);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(this.bucketRight, this.bucketTop);
    ctx.lineTo(this.bucketRight, this.bucketBottom);
    ctx.stroke();

    // 桶口标记
    ctx.strokeStyle = 'rgba(230,81,0,0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(this.bucketLeft - 8, this.bucketTop);
    ctx.lineTo(this.bucketRight + 8, this.bucketTop);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawBackButton(ctx) {
    const { width, safeTop } = this.designSize;
    const btnX = width - 110;
    const btnY = safeTop + 18;
    const btnW = 90;
    const btnH = 38;

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeStyle = 'rgba(230,81,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.stroke();

    drawText(ctx, '← 返回', btnX + btnW / 2, btnY + btnH / 2, { fontSize: 18, color: '#e65100', bold: true });
    return { backBtn: { x: btnX, y: btnY, width: btnW, height: btnH } };
  }

  drawHammerBar(ctx, width, height) {
    const barY = height - 80;
    const barH = 50;
    const barW = width - 40;
    const barX = 20;

    // 背景条
    ctx.fillStyle = 'rgba(139,69,19,0.15)';
    this.roundRect(ctx, barX, barY, barW, barH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(139,69,19,0.3)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, barX, barY, barW, barH, 12);
    ctx.stroke();

    // 锤子按钮
    for (let i = 0; i < 3; i++) {
      const hx = barX + 40 + i * 80;
      const hy = barY + 25;
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (i < this.hammerCount) {
        ctx.fillText('🔨', hx, hy);
      } else {
        ctx.globalAlpha = 0.3;
        ctx.fillText('🔨', hx, hy);
        ctx.globalAlpha = 1;
      }
    }

    // 获取按钮
    const getBtn = barX + 100;
    const getBtnW = 160;
    const getBtnH = 36;
    const getBtnY = barY + 7;

    if (this.hammerCount < 3) {
      ctx.fillStyle = '#ff9800';
      ctx.strokeStyle = '#e65100';
      ctx.lineWidth = 2;
      this.roundRect(ctx, getBtn, getBtnY, getBtnW, getBtnH, 10);
      ctx.fill();
      ctx.stroke();
      drawText(ctx, '🎯 答题获取锤子', getBtn + getBtnW / 2, getBtnY + getBtnH / 2, { fontSize: 18, color: '#fff', bold: true });
    }

    // 使用锤子按钮
    const useBtn = getBtn + getBtnW + 20;
    const useBtnW = 120;
    if (this.hammerCount > 0) {
      ctx.fillStyle = this.hammerActive ? '#ef4444' : '#4caf50';
      ctx.strokeStyle = this.hammerActive ? '#b91c1c' : '#2e7d32';
      ctx.lineWidth = 2;
      this.roundRect(ctx, useBtn, getBtnY, useBtnW, getBtnH, 10);
      ctx.fill();
      ctx.stroke();
      drawText(ctx, this.hammerActive ? '🔨 取消' : '🔨 使用', useBtn + useBtnW / 2, getBtnY + getBtnH / 2, { fontSize: 18, color: '#fff', bold: true });
    }

    this.hammerBarBtns = {
      getQuiz: { x: getBtn, y: getBtnY, w: getBtnW, h: getBtnH },
      useHammer: { x: useBtn, y: getBtnY, w: useBtnW, h: getBtnH },
    };
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

  drawEndPopup(ctx, width, height, isWin) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, width, height);

    const cardW = 360;
    const cardH = 340;
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

    ctx.strokeStyle = isWin ? '#f59e0b' : '#ef4444';
    ctx.lineWidth = 3;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.stroke();

    const title = isWin ? '🎉 通关！' : '😢 失败了';
    const titleColor = isWin ? '#f59e0b' : '#ef4444';
    drawText(ctx, title, width / 2, cardY + 60, { fontSize: 48, color: titleColor, bold: true });
    drawText(ctx, `得分: ${this.score}`, width / 2, cardY + 120, { fontSize: 32, color: '#1a1a1a', bold: true });
    
    if (this.maxCombo > 1) {
      drawText(ctx, `最高连击: ${this.maxCombo}x 🔥`, width / 2, cardY + 160, { fontSize: 26, color: '#d84315' });
    }

    const btnW = 200;
    const btnH = 50;
    const btnX = (width - btnW) / 2;
    const btnY = cardY + cardH - 80;

    const btnGradient = ctx.createLinearGradient(0, btnY, 0, btnY + btnH);
    btnGradient.addColorStop(0, isWin ? '#f59e0b' : '#ef4444');
    btnGradient.addColorStop(1, isWin ? '#d97706' : '#dc2626');
    ctx.fillStyle = btnGradient;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 14);
    ctx.fill();

    drawText(ctx, '确 定', width / 2, btnY + btnH / 2, { fontSize: 24, color: '#fff', bold: true });
    this.confirmBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  drawFruit(fruit, alpha, scale) {
    const ctx = this.ctx;
    const r = fruit.radius * scale;

    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.font = `${Math.floor(r * 2)}px sans-serif`;
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
    audioManager.stopBgMusic();
  }
}

export default FruitGame;
