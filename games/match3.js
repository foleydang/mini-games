// 消消乐游戏 - 特殊道具 / 连击 / 手感反馈(粒子·飘字·震屏·缓动) / 死局重排 / 闲置提示
import { Colors, drawRoundRect, drawButton, drawText, drawGradientBg, Storage, RankData, completeLevel, saveLevelStars } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';
import { audioManager } from '../common/audio.js';
import { Levels } from '../common/config.js';
import LevelResult from '../common/level-result.js';

// 各阶段动画时长(秒)
const SWAP_DUR = 0.16;
const REMOVE_DUR = 0.26;
const FALL_DUR = 0.30;
const HINT_DELAY = 4.5;        // 闲置多少秒后给出提示
const GRAVITY = 1600;          // 粒子重力(设计像素/秒^2)
const MAX_PARTICLES = 180;

class Match3Game {
  constructor(canvas, ctx, designSize, onEnd, level = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'match3';
    this.currentLevel = level;

    this.levels = Levels.match3;
    this.currentLevel = Math.max(0, Math.min(level, this.levels.length - 1));
    this.applyLevelConfig();
    this.cellSize = 85;

    this.grid = [];
    this.special = [];          // 'none'|'row'|'col'|'bomb'|'color'
    this.selected = null;
    this.dragStart = null;      // { row, col, sx, sy } 滑动交换起点
    this.pendingDetonate = null;// 单点特殊道具待引爆 { row, col }
    this.score = 0;

    // 阶段状态机
    this.phase = 'idle';        // idle|swap|swapback|removing|falling|over
    this.result = null;         // 统一结算遮罩
    this.swapAnim = null;
    this.removeAnim = null;
    this.fallAnim = null;

    // 连击 & 效果
    this.comboCount = 0;
    this.particles = [];
    this.floaters = [];
    this.banner = null;         // { text, life, maxLife }
    this.shake = 0;
    this.idleTime = 0;
    this.hint = null;           // { a:{r,c}, b:{r,c} }
    this.hintPulse = 0;

    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);
    this.soundEnabled = audioManager.soundEnabled;
    this.buttons = null;

    this.gemTypes = [
      { color: '#e5566d', shape: 'circle' },
      { color: '#3cb98a', shape: 'diamond' },
      { color: '#4a95dd', shape: 'star' },
      { color: '#edad4a', shape: 'square' },
      { color: '#ec7ba6', shape: 'heart' },
      { color: '#8b6fd4', shape: 'hexagon' }
    ];

    this.running = false;
    this.lastT = null;

    this.init();
  }

  applyLevelConfig() {
    const cfg = this.levels[this.currentLevel] || this.levels[0];
    this.rows = cfg.rows;
    this.cols = cfg.cols;
    this.numColors = cfg.colors;
    this.moves = cfg.moves;
    this.target = cfg.target;
    this.levelName = cfg.name || `第${this.currentLevel + 1}关`;
  }

  init() {
    this.setupBoard();
    this.startLoop();
  }

  setupBoard() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    const areaTop = safeTop + 250;
    const areaBottom = height - safeBottom - 40;
    const availW = width - 60;
    const availH = areaBottom - areaTop;

    this.cellSize = Math.floor(Math.min(availW / this.cols, availH / this.rows));
    const gridWidth = this.cols * this.cellSize;
    const gridHeight = this.rows * this.cellSize;
    this.gridStartX = (width - gridWidth) / 2;
    this.gridStartY = areaTop + (availH - gridHeight) / 2;

    this.initGrid();
    if (!this.hasAnyMove()) this.reshuffle();
  }

  initGrid() {
    this.grid = [];
    this.special = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      this.special[r] = [];
      for (let c = 0; c < this.cols; c++) {
        let type;
        do {
          type = this.randType();
        } while (this.wouldMatch(r, c, type));
        this.grid[r][c] = type;
        this.special[r][c] = 'none';
      }
    }
  }

  randType() {
    return Math.floor(Math.random() * this.numColors);
  }

  wouldMatch(row, col, type) {
    if (col >= 2 && this.grid[row][col - 1] === type && this.grid[row][col - 2] === type) return true;
    if (row >= 2 && this.grid[row - 1] && this.grid[row - 1][col] === type && this.grid[row - 2][col] === type) return true;
    return false;
  }

  destroy() { this.running = false; }

  // ---------- 主循环 ----------
  startLoop() {
    this.running = true;
    this.lastT = null;
    const step = (t) => {
      if (!this.running) return;
      if (this.lastT == null) this.lastT = t;
      let dt = (t - this.lastT) / 1000;
      this.lastT = t;
      if (dt > 0.05) dt = 0.05;
      this.update(dt);
      this.draw();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  update(dt) {
    // 阶段推进
    if (this.phase === 'swap' || this.phase === 'swapback') {
      this.swapAnim.progress += dt / SWAP_DUR;
      if (this.swapAnim.progress >= 1) {
        this.swapAnim.progress = 1;
        if (this.phase === 'swap') this.onSwapComplete();
        else { this.swapAnim = null; this.settle(); }
      }
    } else if (this.phase === 'removing') {
      this.removeAnim.progress += dt / REMOVE_DUR;
      if (this.removeAnim.progress >= 1) { this.removeAnim.progress = 1; this.onRemoveComplete(); }
    } else if (this.phase === 'falling') {
      this.fallAnim.progress += dt / FALL_DUR;
      if (this.fallAnim.progress >= 1) { this.fallAnim.progress = 1; this.onFallComplete(); }
    } else if (this.phase === 'idle') {
      this.idleTime += dt;
      if (this.idleTime > HINT_DELAY && !this.hint) this.hint = this.findAnyMove();
    }

    this.hintPulse += dt;

    // 粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    // 飘字
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      if (f.life <= 0) { this.floaters.splice(i, 1); continue; }
      f.y += f.vy * dt;
    }
    // 连击横幅
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }
    // 震屏衰减
    if (this.shake > 0) {
      this.shake -= dt * 40;
      if (this.shake < 0) this.shake = 0;
    }
  }

  // ---------- 缓动 ----------
  easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  lerp(a, b, t) { return a + (b - a) * t; }

  cx(c) { return this.gridStartX + c * this.cellSize + this.cellSize / 2; }
  cy(r) { return this.gridStartY + r * this.cellSize + this.cellSize / 2; }

  comboMultiplier(n) {
    if (n <= 1) return 1;
    if (n === 2) return 1.5;
    if (n === 3) return 2;
    if (n === 4) return 2.5;
    return 3;
  }

  bannerWord(n) {
    const w = ['', '', '不错!', '很好!', '太棒了!', '超厉害!', '惊人连击!', '无敌!'];
    return w[Math.min(n, w.length - 1)];
  }

  // ---------- 绘制 ----------
  draw() {
    const ctx = this.ctx;
    const { width, safeTop, height } = this.designSize;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 全屏背景(不随震屏抖动)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#faf5ff');
    bgGradient.addColorStop(0.5, '#f3e8ff');
    bgGradient.addColorStop(1, '#e9d5ff');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // HUD
    drawText(ctx, '💎 消消乐', width / 2, safeTop + 75, { fontSize: 42, color: '#6b21a8', bold: true });
    drawText(ctx, `分数: ${this.score}/${this.target}  步数: ${this.moves}`, width / 2, safeTop + 128, { fontSize: 26, color: '#5b21b6' });
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);

    // 棋盘及以下随震屏抖动
    ctx.save();
    if (this.shake > 0) {
      const s = this.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    this.drawBoard();
    this.drawParticles();
    this.drawFloaters();
    ctx.restore();

    // 连击横幅(居中,不抖)
    if (this.banner) {
      const a = Math.min(1, this.banner.life / 0.4);
      const scale = 1 + (1 - Math.min(1, this.banner.life / this.banner.maxLife)) * 0.3;
      ctx.save();
      ctx.globalAlpha = a;
      drawText(ctx, this.banner.text, width / 2, this.gridStartY - 30,
        { fontSize: Math.round(40 * scale), color: '#f59e0b', bold: true });
      ctx.restore();
    }

    if (this.phase === 'over' && this.result) {
      this.result.draw(ctx);
    }
  }

  drawBoard() {
    const ctx = this.ctx;
    const gridWidth = this.cols * this.cellSize;
    const gridHeight = this.rows * this.cellSize;

    ctx.save();
    ctx.shadowColor = 'rgba(74,66,105,0.25)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, this.gridStartX - 10, this.gridStartY - 10, gridWidth + 20, gridHeight + 20, 16, '#42395f');
    ctx.restore();

    const gridBg = ctx.createLinearGradient(0, this.gridStartY, 0, this.gridStartY + gridHeight);
    gridBg.addColorStop(0, '#4b4270');
    gridBg.addColorStop(1, '#3a3252');
    ctx.fillStyle = gridBg;
    drawRoundRect(ctx, this.gridStartX - 6, this.gridStartY - 6, gridWidth + 12, gridHeight + 12, 12);
    ctx.fill();

    this.drawGemsWithAnimation();
  }

  drawGemsWithAnimation() {
    const ctx = this.ctx;
    const removeKeys = this.removeAnim ? this.removeAnim.keys : null;
    const fallMap = this.fallAnim ? this.fallAnim.map : null;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const type = this.grid[r][c];
        if (type < 0) continue;

        let x = this.cx(c);
        let y = this.cy(r);
        let alpha = 1;
        let scale = 1;

        if ((this.phase === 'swap' || this.phase === 'swapback') && this.swapAnim) {
          const pos = this.swapPos(r, c);
          if (pos) { x = pos.x; y = pos.y; }
        }

        if (removeKeys && removeKeys.has(r + ',' + c)) {
          const p = this.removeAnim.progress;
          alpha = 1 - p;
          scale = 1 - p * 0.5;
          if (p < 0.5) alpha = p < 0.25 ? 1 : 0.55;  // 闪烁
        }

        if (fallMap) {
          const fromRow = fallMap.get(r + ',' + c);
          if (fromRow !== undefined) {
            const startY = this.cy(fromRow);
            y = this.lerp(startY, y, this.easeOutBack(this.fallAnim.progress));
          }
        }

        const isSpecial = this.special[r][c] !== 'none';
        if (isSpecial) {
          if (this.phase !== 'removing') scale *= 1 + Math.sin(this.hintPulse * 4 + (r + c)) * 0.06;  // 呼吸
          this.drawSpecialGem(x, y, type, this.special[r][c], alpha, scale);
        } else {
          this.drawGemAt(x, y, type, alpha, scale);
        }
      }
    }

    // 选中高亮
    if (this.selected && this.phase === 'idle') {
      const x = this.cx(this.selected.col);
      const y = this.cy(this.selected.row);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, this.cellSize * 0.38 + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 闲置提示脉冲
    if (this.hint && this.phase === 'idle') {
      const pulse = 0.5 + 0.5 * Math.sin(this.hintPulse * 6);
      for (const cell of [this.hint.a, this.hint.b]) {
        const x = this.cx(cell.c);
        const y = this.cy(cell.r);
        ctx.save();
        ctx.globalAlpha = 0.35 + pulse * 0.5;
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, this.cellSize * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  swapPos(r, c) {
    const { a, b, back, progress } = this.swapAnim;
    const p = this.easeOutCubic(progress);
    const isA = a.r === r && a.c === c;
    const isB = b.r === r && b.c === c;
    if (!isA && !isB) return null;
    const pa = { x: this.cx(a.c), y: this.cy(a.r) };
    const pb = { x: this.cx(b.c), y: this.cy(b.r) };
    if (!back) {
      if (isA) return { x: this.lerp(pa.x, pb.x, p), y: this.lerp(pa.y, pb.y, p) };
      return { x: this.lerp(pb.x, pa.x, p), y: this.lerp(pb.y, pa.y, p) };
    } else {
      // 数据已还原,动画从对面滑回本位
      if (isA) return { x: this.lerp(pb.x, pa.x, p), y: this.lerp(pb.y, pa.y, p) };
      return { x: this.lerp(pa.x, pb.x, p), y: this.lerp(pa.y, pb.y, p) };
    }
  }

  drawGemAt(x, y, type, alpha = 1, scale = 1) {
    const ctx = this.ctx;
    const gem = this.gemTypes[type];
    const size = this.cellSize * 0.38 * scale;

    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(30,20,50,0.35)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    const gemGradient = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, size * 0.1, x, y, size);
    gemGradient.addColorStop(0, this.lightenColor(gem.color, 22));
    gemGradient.addColorStop(0.6, gem.color);
    gemGradient.addColorStop(1, this.darkenColor(gem.color, 18));
    ctx.fillStyle = gemGradient;
    ctx.beginPath();

    switch (gem.shape) {
      case 'circle':
        ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); break;
      case 'diamond':
        ctx.moveTo(x, y - size); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath(); ctx.fill(); break;
      case 'star':
        this.drawStar(ctx, x, y, size, 5); ctx.fill(); break;
      case 'square':
        drawRoundRect(ctx, x - size, y - size, size * 2, size * 2, 8, gem.color); break;
      case 'heart':
        this.drawHeart(ctx, x, y, size); ctx.fill(); break;
      case 'hexagon':
        this.drawHexagon(ctx, x, y, size); ctx.fill(); break;
    }

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;

    if (alpha > 0.5 && scale > 0.8) {
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // 特殊道具:换成独立的“能量宝石”外观(圆角方块 + 内部标识),整体不超出格子
  drawSpecialGem(x, y, type, kind, alpha = 1, scale = 1) {
    const ctx = this.ctx;
    const gem = this.gemTypes[type] || this.gemTypes[0];
    const size = this.cellSize * 0.4 * scale;

    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(30,20,50,0.35)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    // 容器:圆角方块(和普通宝石的形状族区分开)
    const grad = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, size * 0.1, x, y, size);
    if (kind === 'color') {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#ffcfe8');
      grad.addColorStop(1, '#8b6fd4');
    } else {
      grad.addColorStop(0, this.lightenColor(gem.color, 30));
      grad.addColorStop(0.6, gem.color);
      grad.addColorStop(1, this.darkenColor(gem.color, 18));
    }
    ctx.fillStyle = grad;
    drawRoundRect(ctx, x - size, y - size, size * 2, size * 2, size * 0.42);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 内部标识(全部限制在宝石内)
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = size * 0.16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (kind === 'row' || kind === 'col') {
      const L = size * 0.6, h = size * 0.32;
      ctx.beginPath();
      if (kind === 'row') {
        ctx.moveTo(x - L, y); ctx.lineTo(x + L, y);
        ctx.moveTo(x - L + h, y - h); ctx.lineTo(x - L, y); ctx.lineTo(x - L + h, y + h);
        ctx.moveTo(x + L - h, y - h); ctx.lineTo(x + L, y); ctx.lineTo(x + L - h, y + h);
      } else {
        ctx.moveTo(x, y - L); ctx.lineTo(x, y + L);
        ctx.moveTo(x - h, y - L + h); ctx.lineTo(x, y - L); ctx.lineTo(x + h, y - L + h);
        ctx.moveTo(x - h, y + L - h); ctx.lineTo(x, y + L); ctx.lineTo(x + h, y + L - h);
      }
      ctx.stroke();
    } else if (kind === 'bomb') {
      const rIn = size * 0.22, rOut = size * 0.68;
      for (let i = 0; i < 8; i++) {
        const ang = i * Math.PI / 4 + this.hintPulse * 1.2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * rIn, y + Math.sin(ang) * rIn);
        ctx.lineTo(x + Math.cos(ang) * rOut, y + Math.sin(ang) * rOut);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, size * 0.24, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'color') {
      const hues = ['#ff5c5c', '#ffb45c', '#ffe45c', '#5cff8a', '#5cc8ff', '#b45cff'];
      ctx.lineWidth = size * 0.22;
      const off = this.hintPulse;
      for (let i = 0; i < hues.length; i++) {
        ctx.strokeStyle = hues[i];
        ctx.beginPath();
        ctx.arc(x, y, size * 0.58, off + (i / hues.length) * Math.PI * 2, off + ((i + 1) / hues.length) * Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFloaters() {
    const ctx = this.ctx;
    for (const f of this.floaters) {
      const a = Math.min(1, f.life / 0.4);
      ctx.globalAlpha = a;
      drawText(ctx, f.text, f.x, f.y, { fontSize: f.size, color: f.color, bold: true });
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 颜色/形状辅助 ----------
  lightenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100));
    return `rgb(${r},${g},${b})`;
  }
  darkenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * percent / 100));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * percent / 100));
    return `rgb(${r},${g},${b})`;
  }
  drawStar(ctx, cx, cy, size, points) {
    const outerRadius = size, innerRadius = size * 0.4;
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  drawHeart(ctx, cx, cy, size) {
    ctx.moveTo(cx, cy + size * 0.3);
    ctx.bezierCurveTo(cx, cy - size * 0.5, cx - size, cy - size * 0.5, cx - size, cy + size * 0.1);
    ctx.bezierCurveTo(cx - size, cy + size, cx, cy + size, cx, cy + size);
    ctx.bezierCurveTo(cx, cy + size, cx + size, cy + size, cx + size, cy + size * 0.1);
    ctx.bezierCurveTo(cx + size, cy - size * 0.5, cx, cy - size * 0.5, cx, cy + size * 0.3);
    ctx.closePath();
  }
  drawHexagon(ctx, cx, cy, size) {
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 2;
      const px = cx + Math.cos(angle) * size;
      const py = cy + Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // ---------- 输入 ----------
  onTouchStart(pos) {
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') { this.running = false; this.onEnd({ score: this.score, passed: this.score >= this.target }); return; }
    if (btn === 'soundBtn') {
      audioManager.toggleSound();
      this.soundEnabled = audioManager.soundEnabled;
      return;
    }

    if (this.phase === 'over') {
      if (!this.result) return;
      const action = this.result.onTouchStart(pos);
      if (action === 'next') this.nextLevel();
      else if (action === 'replay' || action === 'retry') this.retry();
      else if (action === 'back') { this.running = false; this.onEnd({ score: this.score, passed: this.score >= this.target }); }
      return;
    }
    if (this.phase !== 'idle') return;

    this.idleTime = 0;
    this.hint = null;

    const col = Math.floor((pos.x - this.gridStartX) / this.cellSize);
    const row = Math.floor((pos.y - this.gridStartY) / this.cellSize);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) { this.selected = null; this.dragStart = null; return; }

    this.dragStart = { row, col, sx: pos.x, sy: pos.y };

    // 已有选中且相邻 → 交换(点两下的旧交互,含特殊道具组合)
    if (this.selected) {
      const dr = Math.abs(row - this.selected.row);
      const dc = Math.abs(col - this.selected.col);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        this.pendingDetonate = null;
        this.startSwap(this.selected.row, this.selected.col, row, col);
        return;
      }
    }

    // 点击特殊道具 → 记录待引爆(松手且未拖动/交换时引爆)
    if (this.special[row][col] !== 'none') {
      this.selected = null;
      this.pendingDetonate = { row, col };
    } else {
      this.selected = { row, col };
      this.pendingDetonate = null;
    }
  }

  onTouchMove(pos) {
    if (this.phase !== 'idle' || !this.dragStart) return;
    const dx = pos.x - this.dragStart.sx;
    const dy = pos.y - this.dragStart.sy;
    const threshold = this.cellSize * 0.4;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    // 已构成拖动 → 取消点击引爆
    this.pendingDetonate = null;
    let tr = this.dragStart.row, tc = this.dragStart.col;
    if (Math.abs(dx) > Math.abs(dy)) tc += dx > 0 ? 1 : -1;
    else tr += dy > 0 ? 1 : -1;

    const sr = this.dragStart.row, sc = this.dragStart.col;
    this.dragStart = null;
    if (tr < 0 || tr >= this.rows || tc < 0 || tc >= this.cols) return;
    this.selected = null;
    this.idleTime = 0;
    this.hint = null;
    this.startSwap(sr, sc, tr, tc);
  }

  onTouchEnd(pos) {
    this.dragStart = null;
    if (this.phase === 'idle' && this.pendingDetonate) {
      const { row, col } = this.pendingDetonate;
      this.pendingDetonate = null;
      if (this.special[row][col] !== 'none') this.detonateAt(row, col);
    }
  }

  // 单点引爆一个特殊道具(消耗一步)
  detonateAt(r, c) {
    if (this.special[r][c] === 'none') return;
    this.selected = null;
    this.idleTime = 0;
    this.hint = null;
    const sp = this.special[r][c];
    const clear = new Set([r + ',' + c]);
    const queue = [{ k: r + ',' + c, colorTarget: sp === 'color' ? this.grid[r][c] : null }];
    const activated = this.chainActivate(clear, queue, null);
    this.moves--;
    this.comboCount = 0;
    this.beginRemoval({ clear, newHosts: new Map(), activatedCount: activated });
  }

  // ---------- 交换 ----------
  startSwap(r1, c1, r2, c2) {
    this.selected = null;
    this.phase = 'swap';
    this.swapAnim = { a: { r: r1, c: c1 }, b: { r: r2, c: c2 }, progress: 0, back: false };
    audioManager.play('swap');
  }

  swapData(a, b) {
    const t = this.grid[a.r][a.c]; this.grid[a.r][a.c] = this.grid[b.r][b.c]; this.grid[b.r][b.c] = t;
    const s = this.special[a.r][a.c]; this.special[a.r][a.c] = this.special[b.r][b.c]; this.special[b.r][b.c] = s;
  }

  onSwapComplete() {
    const { a, b } = this.swapAnim;
    this.swapData(a, b);
    const plan = this.computePlan([a, b]);
    if (plan) {
      this.moves--;
      this.comboCount = 0;
      this.swapAnim = null;
      this.beginRemoval(plan);
    } else {
      // 无效交换,还原数据并回滚动画
      this.swapData(a, b);
      this.phase = 'swapback';
      this.swapAnim.progress = 0;
      this.swapAnim.back = true;
    }
  }

  // ---------- 匹配与特殊道具计算 ----------
  findRuns() {
    const runs = [];
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const t = this.grid[r][c];
        if (t < 0) { c++; continue; }
        let cc = c + 1;
        while (cc < this.cols && this.grid[r][cc] === t) cc++;
        const len = cc - c;
        if (len >= 3) {
          const cells = [];
          for (let k = c; k < cc; k++) cells.push({ r, c: k });
          runs.push({ dir: 'h', len, type: t, cells });
        }
        c = cc;
      }
    }
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const t = this.grid[r][c];
        if (t < 0) { r++; continue; }
        let rr = r + 1;
        while (rr < this.rows && this.grid[rr][c] === t) rr++;
        const len = rr - r;
        if (len >= 3) {
          const cells = [];
          for (let k = r; k < rr; k++) cells.push({ r: k, c });
          runs.push({ dir: 'v', len, type: t, cells });
        }
        r = rr;
      }
    }
    return runs;
  }

  pickHost(run, swapCells) {
    if (swapCells) {
      for (const cell of run.cells) {
        for (const sc of swapCells) {
          if (sc.r === cell.r && sc.c === cell.c) return cell.r + ',' + cell.c;
        }
      }
    }
    const mid = run.cells[Math.floor(run.cells.length / 2)];
    return mid.r + ',' + mid.c;
  }

  blastCells(r, c, sp, colorTarget) {
    const out = [];
    if (sp === 'row') {
      for (let cc = 0; cc < this.cols; cc++) out.push({ r, c: cc });
    } else if (sp === 'col') {
      for (let rr = 0; rr < this.rows; rr++) out.push({ r: rr, c });
    } else if (sp === 'bomb') {
      for (let rr = r - 1; rr <= r + 1; rr++)
        for (let cc = c - 1; cc <= c + 1; cc++)
          if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) out.push({ r: rr, c: cc });
    } else if (sp === 'color') {
      const target = (colorTarget != null && colorTarget >= 0) ? colorTarget : this.grid[r][c];
      for (let rr = 0; rr < this.rows; rr++)
        for (let cc = 0; cc < this.cols; cc++)
          if (this.grid[rr][cc] === target) out.push({ r: rr, c: cc });
    }
    return out;
  }

  // 特殊道具连锁引爆:从 queue 出发,引爆命中的其它特殊道具
  chainActivate(clear, queue, newHosts) {
    const activated = new Set();
    while (queue.length) {
      const { k, colorTarget } = queue.pop();
      if (activated.has(k)) continue;
      activated.add(k);
      const [r, c] = k.split(',').map(Number);
      const sp = this.special[r][c];
      if (sp === 'none') continue;
      const blast = this.blastCells(r, c, sp, colorTarget);
      for (const bc of blast) {
        const bk = bc.r + ',' + bc.c;
        clear.add(bk);
        if (this.special[bc.r][bc.c] !== 'none' && !activated.has(bk) && !(newHosts && newHosts.has(bk))) {
          queue.push({ k: bk, colorTarget: this.special[bc.r][bc.c] === 'color' ? this.grid[bc.r][bc.c] : null });
        }
      }
    }
    return activated.size;
  }

  // 两个特殊道具相邻交换 → 组合超级爆炸
  computeComboPlan(a, b) {
    const ka = this.special[a.r][a.c], kb = this.special[b.r][b.c];
    const cr = b.r, cc = b.c;   // 以落点为中心
    const clear = new Set();
    const add = (r, c) => { if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) clear.add(r + ',' + c); };
    const clearRow = (r) => { for (let c = 0; c < this.cols; c++) add(r, c); };
    const clearCol = (c) => { for (let r = 0; r < this.rows; r++) add(r, c); };
    const clearRect = (r, c, rad) => {
      for (let rr = r - rad; rr <= r + rad; rr++)
        for (let cc2 = c - rad; cc2 <= c + rad; cc2++) add(rr, cc2);
    };
    const isColor = (k) => k === 'color';
    const isBomb = (k) => k === 'bomb';

    add(a.r, a.c); add(b.r, b.c);

    if (isColor(ka) && isColor(kb)) {
      // 同色 + 同色 → 清屏
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) add(r, c);
    } else if (isColor(ka) || isColor(kb)) {
      // 同色 + X → 把某颜色全部按 X 效果引爆
      const otherKind = isColor(ka) ? kb : ka;
      const otherCell = isColor(ka) ? b : a;
      const target = this.grid[otherCell.r][otherCell.c];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c] === target) {
            if (isBomb(otherKind)) clearRect(r, c, 1);
            else if (otherKind === 'row') clearRow(r);
            else clearCol(c);
          }
        }
      }
    } else if (isBomb(ka) && isBomb(kb)) {
      clearRect(cr, cc, 2);       // 炸弹 + 炸弹 → 5×5
    } else if (isBomb(ka) || isBomb(kb)) {
      for (let d = -1; d <= 1; d++) { clearRow(cr + d); clearCol(cc + d); }  // 线 + 炸弹 → 粗十字
    } else {
      clearRow(cr); clearCol(cc); // 线 + 线 → 十字
    }

    // 引爆过程中命中的其它特殊道具(排除两端已消耗的组合块)
    const queue = [];
    for (const k of clear) {
      const [r, c] = k.split(',').map(Number);
      const isEndpoint = (r === a.r && c === a.c) || (r === b.r && c === b.c);
      if (this.special[r][c] !== 'none' && !isEndpoint) {
        queue.push({ k, colorTarget: this.special[r][c] === 'color' ? this.grid[r][c] : null });
      }
    }
    const activated = this.chainActivate(clear, queue, null);
    return { clear, newHosts: new Map(), activatedCount: activated + 2 };
  }

  computePlan(swapCells) {
    // 两端都是特殊道具 → 组合爆炸
    if (swapCells && swapCells.length === 2) {
      const [a, b] = swapCells;
      if (this.special[a.r][a.c] !== 'none' && this.special[b.r][b.c] !== 'none') {
        return this.computeComboPlan(a, b);
      }
    }

    const runs = this.findRuns();
    const newHosts = new Map();

    for (const run of runs) {
      let kind = null;
      if (run.len >= 5) kind = 'color';
      else if (run.len === 4) kind = (run.dir === 'h') ? 'row' : 'col';
      if (!kind) continue;
      newHosts.set(this.pickHost(run, swapCells), { kind, type: run.type });
    }
    // L/T 交叉 → 炸弹
    const hCells = new Set(), vCells = new Set();
    for (const run of runs) {
      for (const cell of run.cells) {
        const k = cell.r + ',' + cell.c;
        if (run.dir === 'h') hCells.add(k); else vCells.add(k);
      }
    }
    for (const k of hCells) {
      if (vCells.has(k)) {
        const [r, c] = k.split(',').map(Number);
        newHosts.set(k, { kind: 'bomb', type: this.grid[r][c] });
      }
    }

    const clear = new Set();
    for (const run of runs) for (const cell of run.cells) clear.add(cell.r + ',' + cell.c);

    const queue = [];
    const enqueue = (k, colorTarget) => queue.push({ k, colorTarget });

    if (swapCells) {
      for (const cell of swapCells) {
        const sp = this.special[cell.r][cell.c];
        if (sp !== 'none') {
          const k = cell.r + ',' + cell.c;
          clear.add(k);
          let ct = null;
          if (sp === 'color') {
            const other = swapCells.find(o => !(o.r === cell.r && o.c === cell.c));
            ct = other ? this.grid[other.r][other.c] : this.grid[cell.r][cell.c];
          }
          enqueue(k, ct);
        }
      }
    }
    for (const k of clear) {
      const [r, c] = k.split(',').map(Number);
      if (this.special[r][c] !== 'none' && !newHosts.has(k)) {
        enqueue(k, this.special[r][c] === 'color' ? this.grid[r][c] : null);
      }
    }

    const activatedCount = this.chainActivate(clear, queue, newHosts);

    for (const k of newHosts.keys()) clear.delete(k);
    if (clear.size === 0 && newHosts.size === 0) return null;
    return { clear, newHosts, activatedCount };
  }

  beginRemoval(plan) {
    this.comboCount++;
    const cells = [];
    for (const k of plan.clear) {
      const [r, c] = k.split(',').map(Number);
      cells.push({ row: r, col: c });
    }

    const mult = this.comboMultiplier(this.comboCount);
    const gained = Math.round(cells.length * 20 * mult);
    this.score += gained;

    this.spawnClearEffects(cells, gained);
    if (cells.length >= 5 || plan.activatedCount > 0) {
      this.shake = Math.min(14, 5 + cells.length * 0.6);
    }
    audioManager.play('clear', { rate: Math.min(1.8, 1 + (this.comboCount - 1) * 0.1) });

    this.removeAnim = {
      cells,
      keys: new Set(cells.map(c => c.row + ',' + c.col)),
      newHosts: plan.newHosts,
      progress: 0
    };
    this.phase = 'removing';
  }

  spawnClearEffects(cells, gained) {
    // 粒子
    for (const { row, col } of cells) {
      const type = this.grid[row][col];
      const color = type >= 0 ? this.gemTypes[type].color : '#ffffff';
      const gx = this.cx(col), gy = this.cy(row);
      const n = 4;
      for (let i = 0; i < n; i++) {
        if (this.particles.length >= MAX_PARTICLES) break;
        const ang = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 140;
        this.particles.push({
          x: gx, y: gy,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 60,
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.7,
          size: this.cellSize * 0.10,
          color
        });
      }
    }
    // 飘字(消除中心)
    let sx = 0, sy = 0;
    for (const c of cells) { sx += this.cx(c.col); sy += this.cy(c.row); }
    sx /= cells.length; sy /= cells.length;
    const combo = this.comboCount;
    this.floaters.push({
      x: sx, y: sy, vy: -80,
      life: 0.9, maxLife: 0.9,
      text: combo >= 2 ? `连击x${combo}  +${gained}` : `+${gained}`,
      color: combo >= 2 ? '#f59e0b' : '#fde68a',
      size: combo >= 2 ? 30 : 26
    });
    if (combo >= 2) {
      this.banner = { text: this.bannerWord(combo), life: 0.8, maxLife: 0.8 };
    }
  }

  onRemoveComplete() {
    for (const { row, col } of this.removeAnim.cells) {
      this.grid[row][col] = -1;
      this.special[row][col] = 'none';
    }
    for (const [k, info] of this.removeAnim.newHosts) {
      const [r, c] = k.split(',').map(Number);
      this.grid[r][c] = info.type;
      this.special[r][c] = info.kind;
    }
    this.removeAnim = null;
    this.buildFall();
  }

  buildFall() {
    const falling = [];
    for (let c = 0; c < this.cols; c++) {
      let empty = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] >= 0) {
          if (r !== empty) {
            falling.push({ toRow: empty, col: c, fromRow: r });
            this.grid[empty][c] = this.grid[r][c];
            this.special[empty][c] = this.special[r][c];
            this.grid[r][c] = -1;
            this.special[r][c] = 'none';
          }
          empty--;
        }
      }
      for (let r = empty; r >= 0; r--) {
        this.grid[r][c] = this.randType();
        this.special[r][c] = 'none';
        falling.push({ toRow: r, col: c, fromRow: -1 - (empty - r) });
      }
    }

    if (falling.length === 0) { this.afterFall(); return; }

    const map = new Map();
    for (const f of falling) map.set(f.toRow + ',' + f.col, f.fromRow);
    this.fallAnim = { gems: falling, map, progress: 0 };
    this.phase = 'falling';
    audioManager.play('drop');
  }

  onFallComplete() {
    this.fallAnim = null;
    this.afterFall();
  }

  afterFall() {
    const plan = this.computePlan(null);
    if (plan) this.beginRemoval(plan);
    else this.settle();
  }

  settle() {
    this.comboCount = 0;
    this.selected = null;
    if (this.score >= this.target) {
      audioManager.play('levelup');
      this.finish(true);
      return;
    }
    if (this.moves <= 0) {
      audioManager.play('gameover');
      this.finish(false);
      return;
    }
    if (!this.hasAnyMove()) this.reshuffle();
    this.phase = 'idle';
    this.idleTime = 0;
    this.hint = null;
  }

  finish(win) {
    this.phase = 'over';
    if (win) completeLevel(this.gameId, this.currentLevel);
    const hasNext = win && this.currentLevel < this.levels.length - 1;
    // 星级:达标倍率(得分相对目标分)
    const ratio = this.target > 0 ? this.score / this.target : 1;
    const stars = ratio >= 1.4 ? 3 : ratio >= 1.2 ? 2 : 1;
    if (win) saveLevelStars(this.gameId, this.currentLevel, stars);
    this.result = new LevelResult(this.designSize, {
      win,
      score: this.score,
      scoreLabel: '得分',
      levelName: this.levelName,
      hasNext,
      stars,
      primaryColor: '#8b5cf6'
    });
  }

  nextLevel() {
    this.currentLevel = Math.min(this.currentLevel + 1, this.levels.length - 1);
    this.restartLevel();
  }

  retry() {
    this.restartLevel();
  }

  restartLevel() {
    this.applyLevelConfig();
    this.result = null;
    this.score = 0;
    this.selected = null;
    this.dragStart = null;
    this.pendingDetonate = null;
    this.comboCount = 0;
    this.particles = [];
    this.floaters = [];
    this.banner = null;
    this.shake = 0;
    this.idleTime = 0;
    this.hint = null;
    this.phase = 'idle';
    this.swapAnim = null;
    this.removeAnim = null;
    this.fallAnim = null;
    this.setupBoard();
  }

  // ---------- 死局检测 / 重排 / 提示 ----------
  trySwapMatch(r1, c1, r2, c2) {
    const t = this.grid[r1][c1]; this.grid[r1][c1] = this.grid[r2][c2]; this.grid[r2][c2] = t;
    const has = this.findRuns().length > 0;
    const t2 = this.grid[r1][c1]; this.grid[r1][c1] = this.grid[r2][c2]; this.grid[r2][c2] = t2;
    return has;
  }

  hasAnyMove() {
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.special[r][c] !== 'none') return true;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols && this.trySwapMatch(r, c, r, c + 1)) return true;
        if (r + 1 < this.rows && this.trySwapMatch(r, c, r + 1, c)) return true;
      }
    }
    return false;
  }

  findAnyMove() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols && this.trySwapMatch(r, c, r, c + 1)) return { a: { r, c }, b: { r, c: c + 1 } };
        if (r + 1 < this.rows && this.trySwapMatch(r, c, r + 1, c)) return { a: { r, c }, b: { r: r + 1, c } };
      }
    }
    return null;
  }

  reshuffle() {
    const positions = [];
    const types = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.special[r][c] === 'none' && this.grid[r][c] >= 0) {
          positions.push({ r, c });
          types.push(this.grid[r][c]);
        }
      }
    }
    const assign = () => {
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      for (let i = 0; i < positions.length; i++) {
        this.grid[positions[i].r][positions[i].c] = types[i];
      }
    };
    let attempts = 0;
    do {
      assign();
      attempts++;
    } while ((this.findRuns().length > 0 || !this.hasAnyMove()) && attempts < 40);

    // 兜底:仍不可解则重建(避免死循环)
    if (this.findRuns().length > 0 || !this.hasAnyMove()) {
      for (const { r, c } of positions) {
        let type;
        do { type = this.randType(); } while (this.wouldMatch(r, c, type));
        this.grid[r][c] = type;
      }
    }

    const { width } = this.designSize;
    this.floaters.push({
      x: width / 2, y: this.gridStartY + (this.rows * this.cellSize) / 2, vy: -60,
      life: 1.0, maxLife: 1.0, text: '洗牌!', color: '#a78bfa', size: 40
    });
  }
}

export default Match3Game;
