// 叠叠消 - 羊了个羊风格多层堆叠消除游戏
import { drawRoundRect, drawText, drawGradientBg, Storage, RankData } from '../common/utils.js';
import { getBackButton, drawBottomButtons, checkBottomButtons } from '../common/ui.js';
import { Levels } from '../common/config.js';
import { audioManager } from '../common/audio.js';

const EMOJIS = ['🍜', '🍕', '🍔', '🍟', '🧁', '🍩', '🍺', '🍵', '🍦', '🍫', '🥤', '🍗'];

class SheepGame {
  constructor(canvas, ctx, designSize, onEnd, level = 0) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'sheep';

    // 游戏状态
    this.tiles = [];
    this.slot = [];
    this.undoStack = [];
    this.gameOver = false;
    this.gameWon = false;
    this.animating = false;
    this.matchedPairs = 0;
    this.totalPairs = 0;

    // 按钮
    this.backButton = getBackButton(designSize);
    this.soundEnabled = audioManager.soundEnabled;

    // 渲染循环控制(修复返回后循环继续绘制导致的闪屏)
    this.ended = false;
    this.rafId = null;

    // 关卡（羊了个羊风格：只有2关）
    this.currentLevel = Math.min(level, 1);
    this.score = 0;

    // 布局参数
    this.cardSize = 70;
    this.slotSize = 80;
    this.slotGap = 10;
    this.slotY = 0;

    this.init();
  }

  init() {
    const { width, height, safeTop, safeBottom } = this.designSize;

    this.slotSize = 80;
    this.slotGap = 10;

    // 底部收集槽
    this.slotY = height - safeBottom - 130;
    // 道具按钮行(撤销/洗牌/重试)紧贴收集槽上方
    this.propBtnY = this.slotY - 84;
    // 牌堆区域:顶部按钮栏(约 safeTop+230)下方 到 道具按钮上方
    this.pileTop = safeTop + 250;
    this.pileBottom = this.propBtnY - 20;

    this.generateLevel(this.currentLevel);
    this.draw();
    this.startLoop();
  }

  generateLevel(levelIndex) {
    const { width } = this.designSize;

    // 羊了个羊风格：每关由多层堆叠而成,越往上层牌越少,形成交错金字塔
    // layers 从底层到顶层,每项为 [rows, cols]
    const configs = [
      // 第1关：底层大、顶层小,3种图案,容易
      { layers: [[3, 4], [2, 3], [1, 2]], emojiCount: 4, name: '新手村' },
      // 第2关：更多层数与图案,很难
      { layers: [[5, 5], [4, 4], [3, 4], [2, 3], [1, 2]], emojiCount: 8, name: '地狱模式' }
    ];

    const config = configs[levelIndex];
    const { layers, emojiCount } = config;

    // 统计每层格子数,算出总牌数(向下取整到3的倍数)
    let rawTotal = 0;
    for (const [r, c] of layers) rawTotal += r * c;
    const totalTiles = Math.floor(rawTotal / 3) * 3;

    // 生成牌类型:每3张同型为一组,保证一定能三消
    const groups = totalTiles / 3;
    const types = [];
    for (let g = 0; g < groups; g++) {
      const e = g % emojiCount;
      types.push(e, e, e);
    }
    this.shuffleArray(types);

    // 计算牌尺寸:让最大一层能塞进牌堆区域
    const maxCols = Math.max(...layers.map(l => l[1]));
    const maxRows = Math.max(...layers.map(l => l[0]));
    const availW = width - 60;
    const availH = this.pileBottom - this.pileTop;
    this.cardSize = Math.floor(Math.min(availW / (maxCols + 0.5), availH / (maxRows + 0.5), 96));

    const spacing = this.cardSize;
    const centerX = width / 2;
    const centerY = (this.pileTop + this.pileBottom) / 2;
    const jitter = this.cardSize * 0.05;

    // 逐层生成,每层居中并交错半格,叠出交错金字塔
    this.tiles = [];
    let typeIndex = 0;
    for (let layer = 0; layer < layers.length; layer++) {
      const [rows, cols] = layers[layer];
      // 每层相对居中,交替偏移半格制造交错效果
      const offset = (layer % 2 === 0) ? 0 : spacing * 0.5;
      const startX = centerX - (cols * spacing) / 2 + offset * 0.5;
      const startY = centerY - (rows * spacing) / 2 + layer * spacing * 0.18;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (typeIndex >= types.length) break;
          this.tiles.push({
            type: types[typeIndex],
            layer: layer,
            x: startX + c * spacing + (Math.random() - 0.5) * jitter,
            y: startY + r * spacing + (Math.random() - 0.5) * jitter,
            removed: false
          });
          typeIndex++;
        }
      }
    }

    // 剩余未放置的牌(极少数)追加到顶层随机位置
    while (typeIndex < types.length) {
      this.tiles.push({
        type: types[typeIndex],
        layer: layers.length,
        x: centerX - spacing / 2 + (Math.random() - 0.5) * spacing * 2,
        y: centerY + (Math.random() - 0.5) * spacing,
        removed: false
      });
      typeIndex++;
    }

    this.slot = [];
    this.undoStack = [];
    this.gameOver = false;
    this.gameWon = false;
    this.matchedPairs = 0;
    this.totalPairs = totalTiles / 3;
    this.score = 0;
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  isTileClickable(tile) {
    if (tile.removed) return false;
    
    // 检查是否被上层牌覆盖
    for (const other of this.tiles) {
      if (other.removed || other.layer <= tile.layer) continue;
      
      // 检查是否重叠（考虑部分重叠）
      const overlapX = tile.x < other.x + this.cardSize && tile.x + this.cardSize > other.x;
      const overlapY = tile.y < other.y + this.cardSize && tile.y + this.cardSize > other.y;
      
      if (overlapX && overlapY) return false;
    }
    return true;
  }

  pickTile(tile) {
    if (this.animating || this.gameOver || this.gameWon) return;
    if (!this.isTileClickable(tile)) return;
    if (this.slot.length >= 7) return;

    // 记录撤销信息
    this.undoStack.push({ tile, slotIndex: this.slot.length });

    tile.removed = true;
    
    // 插入到slot中（相同类型相邻放置）
    let insertIndex = this.slot.length;
    for (let i = 0; i < this.slot.length; i++) {
      if (this.slot[i].type === tile.type) {
        insertIndex = i + 1;
      }
    }
    this.slot.splice(insertIndex, 0, { type: tile.type });

    this.checkAndRemoveMatches();
    this.checkGameState();
    this.draw();
  }

  checkAndRemoveMatches() {
    const typeCounts = {};
    for (const s of this.slot) {
      typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
    }

    for (const [type, count] of Object.entries(typeCounts)) {
      if (count >= 3) {
        // 移除3张匹配的牌
        const typeNum = parseInt(type);
        const toRemove = [];
        for (let i = 0; i < this.slot.length && toRemove.length < 3; i++) {
          if (this.slot[i].type === typeNum) {
            toRemove.push(i);
          }
        }

        this.slot = this.slot.filter((_, i) => !toRemove.includes(i));
        this.matchedPairs++;
        this.score += 30;
        this.undoStack = [];
        break;
      }
    }
  }

  checkGameState() {
    // 检查是否通关
    const remaining = this.tiles.filter(t => !t.removed);
    if (remaining.length === 0 && this.slot.length === 0) {
      this.gameWon = true;
      this.score += 100;
      this.showEndModal();
      return;
    }

    // 检查是否失败（收集槽满且无法消除）
    if (this.slot.length >= 7) {
      const typeCounts = {};
      for (const s of this.slot) {
        typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
      }

      let hasMatch = false;
      for (const count of Object.values(typeCounts)) {
        if (count >= 3) hasMatch = true;
      }

      if (!hasMatch) {
        this.gameOver = true;
        this.showEndModal();
      }
    }
  }

  showEndModal() {
    const isWin = this.gameWon;
    const isLastLevel = this.currentLevel >= 1;
    wx.showModal({
      title: isWin ? (isLastLevel ? '🎉 全部通关！' : '🎉 通关成功！') : '😢 挑战失败',
      content: isWin
        ? (isLastLevel ? '你是真正的高手！' : '准备好挑战地狱模式了吗？')
        : '收集槽满了，再试一次吧',
      confirmText: isWin && !isLastLevel ? '下一关' : (isWin ? '返回' : '重试'),
      cancelText: (isWin && !isLastLevel) || !isWin ? '返回' : undefined,
      showCancel: (isWin && !isLastLevel) || !isWin,
      success: (res) => {
        if (res.confirm) {
          if (isWin && !isLastLevel) {
            this.nextLevel();
          } else if (isWin) {
            this.exitGame();
          } else {
            this.retry();
          }
        } else {
          this.exitGame();
        }
      }
    });
  }

  undo() {
    if (this.undoStack.length === 0 || this.animating || this.gameOver || this.gameWon) return;
    
    const last = this.undoStack.pop();
    last.tile.removed = false;
    
    const slotIdx = this.slot.findIndex(s => s.type === last.tile.type);
    if (slotIdx !== -1) {
      this.slot.splice(slotIdx, 1);
    }
    
    this.draw();
  }

  shuffleTiles() {
    if (this.animating || this.gameOver || this.gameWon) return;

    const remaining = this.tiles.filter(t => !t.removed);
    const types = remaining.map(t => t.type);
    this.shuffleArray(types);
    
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].type = types[i];
    }
    
    this.undoStack = [];
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop, safeBottom } = this.designSize;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawGradientBg(ctx, width, height, '#fff5eb', '#ffe4c4', '#8b5cf6' + '08');

    // 标题和关卡信息
    const levelNames = ['新手村', '地狱模式'];
    const levelName = levelNames[this.currentLevel] || '第' + (this.currentLevel + 1) + '关';
    
    drawText(ctx, '叠叠消', width / 2, safeTop + 70, { fontSize: 48, color: '#e85d04', bold: true });
    drawText(ctx, levelName, width / 2, safeTop + 120, { fontSize: 32, color: '#6c3410', bold: true });
    
    // 进度显示
    const progressText = `已消除: ${this.matchedPairs}/${this.totalPairs}`;
    drawText(ctx, progressText, width / 2, safeTop + 165, { fontSize: 26, color: '#8b5a2b' });

    // 底部按钮
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);

    // 操作按钮
    this.drawActionButtons();

    // 牌堆
    this.drawTiles();

    // 收集槽
    this.drawSlot();

    // 游戏结束遮罩
    if (this.gameWon || this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, width, height);
    }
  }

  drawActionButtons() {
    const ctx = this.ctx;
    const { width } = this.designSize;
    const btnY = this.propBtnY;
    const btnHeight = 56;
    const btnWidth = 150;
    const gap = 24;
    const totalW = btnWidth * 3 + gap * 2;
    const startX = (width - totalW) / 2;

    // 撤销按钮
    this.undoBtn = { x: startX, y: btnY, width: btnWidth, height: btnHeight };
    this.drawStyledButton(ctx, this.undoBtn.x, this.undoBtn.y, btnWidth, btnHeight, '↩ 撤销', '#8b5cf6');

    // 洗牌按钮
    this.shuffleBtn = { x: startX + btnWidth + gap, y: btnY, width: btnWidth, height: btnHeight };
    this.drawStyledButton(ctx, this.shuffleBtn.x, this.shuffleBtn.y, btnWidth, btnHeight, '🔄 洗牌', '#3b82f6');

    // 重试按钮
    this.retryBtn = { x: startX + (btnWidth + gap) * 2, y: btnY, width: btnWidth, height: btnHeight };
    this.drawStyledButton(ctx, this.retryBtn.x, this.retryBtn.y, btnWidth, btnHeight, '🔁 重试', '#ef4444');
  }

  drawStyledButton(ctx, x, y, w, h, text, color) {
    // 阴影
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    
    drawRoundRect(ctx, x, y, w, h, 12, color);
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // 高光
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
    drawRoundRect(ctx, x, y, w, h / 2, 12, gradient);
    
    drawText(ctx, text, x + w / 2, y + h / 2, { fontSize: 22, color: '#fff', bold: true });
  }

  drawTiles() {
    const ctx = this.ctx;
    const maxLayer = Math.max(...this.tiles.filter(t => !t.removed).map(t => t.layer), 0);
    const size = this.cardSize;
    const inset = size * 0.06;

    // 从底层到顶层绘制,统一牌尺寸,靠阴影和遮罩体现层次
    for (let layer = 0; layer <= maxLayer; layer++) {
      const layerTiles = this.tiles.filter(t => !t.removed && t.layer === layer);

      for (const tile of layerTiles) {
        const clickable = this.isTileClickable(tile);
        const drawX = tile.x + inset;
        const drawY = tile.y + inset;
        const s = size - inset * 2;
        const cx = tile.x + size / 2;
        const cy = tile.y + size / 2;

        // 立体阴影(所有牌都有,营造堆叠厚度)
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        const bgColor = '#ffffff';
        const borderColor = clickable ? '#e85d04' : '#d1a17a';
        drawRoundRect(ctx, drawX, drawY, s, s, 12, bgColor, borderColor, clickable ? 3 : 1.5);

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Emoji
        const emoji = EMOJIS[tile.type];
        ctx.font = `${Math.floor(s * 0.58)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(emoji, cx, cy);

        // 被覆盖的牌加一层灰色遮罩,提示不可点击
        if (!clickable) {
          drawRoundRect(ctx, drawX, drawY, s, s, 12, 'rgba(120,120,120,0.45)');
        }
      }
    }
  }

  drawSlot() {
    const ctx = this.ctx;
    const { width } = this.designSize;

    // 收集槽背景
    const totalWidth = 7 * this.slotSize + 6 * this.slotGap + 20;
    const startX = (width - totalWidth) / 2;
    const bgY = this.slotY - 15;
    const bgHeight = this.slotSize + 30;

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    drawRoundRect(ctx, startX, bgY, totalWidth, bgHeight, 18, '#3d1f0a');
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 边框
    drawRoundRect(ctx, startX, bgY, totalWidth, bgHeight, 18, null, '#e85d04', 3);

    // 7个格子
    for (let i = 0; i < 7; i++) {
      const sx = startX + 10 + i * (this.slotSize + this.slotGap);
      const sy = this.slotY;

      drawRoundRect(ctx, sx, sy, this.slotSize, this.slotSize, 10, '#5a3015');

      if (i < this.slot.length) {
        const item = this.slot[i];
        
        // 牌背景带高光
        const gradient = ctx.createLinearGradient(sx, sy, sx, sy + this.slotSize);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#f3f4f6');
        drawRoundRect(ctx, sx + 5, sy + 5, this.slotSize - 10, this.slotSize - 10, 8, gradient, '#e85d04', 2);

        // Emoji
        ctx.font = `${Math.floor(this.slotSize * 0.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(EMOJIS[item.type], sx + this.slotSize / 2, sy + this.slotSize / 2);
      }
    }
  }

  onTouchStart(pos) {
    // 结算时点击无效
    if (this.gameOver || this.gameWon) return;

    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') {
      this.exitGame();
      return;
    }
    if (btn === 'soundBtn') {
      audioManager.toggleSound();
      this.soundEnabled = audioManager.soundEnabled;
      this.draw();
      return;
    }

    if (this.animating) return;

    // 操作按钮
    if (this.undoBtn && this.isPointInRect(pos, this.undoBtn)) {
      this.undo();
      return;
    }
    if (this.shuffleBtn && this.isPointInRect(pos, this.shuffleBtn)) {
      this.shuffleTiles();
      return;
    }
    if (this.retryBtn && this.isPointInRect(pos, this.retryBtn)) {
      this.generateLevel(this.currentLevel);
      this.draw();
      return;
    }

    // 点击牌（从顶层开始,命中第一张可点击的牌）
    const maxLayer = Math.max(...this.tiles.filter(t => !t.removed).map(t => t.layer), 0);
    const size = this.cardSize;

    for (let layer = maxLayer; layer >= 0; layer--) {
      const layerTiles = this.tiles.filter(t => !t.removed && t.layer === layer);

      for (const tile of layerTiles) {
        if (pos.x >= tile.x && pos.x <= tile.x + size &&
            pos.y >= tile.y && pos.y <= tile.y + size) {
          this.pickTile(tile);
          return;
        }
      }
    }
  }

  isPointInRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  startLoop() {
    this.ended = false;
    const loop = () => {
      if (this.ended || this.gameOver || this.gameWon) return;
      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  exitGame() {
    this.ended = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    RankData.save(this.gameId, this.score);
    this.onEnd({ score: this.score, passed: this.gameWon });
  }

  nextLevel() {
    this.currentLevel = Math.min(this.currentLevel + 1, 1);
    this.generateLevel(this.currentLevel);
    this.draw();
    this.startLoop();
  }

  retry() {
    this.generateLevel(this.currentLevel);
    this.draw();
    this.startLoop();
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}
  update() {}
  destroy() {
    this.ended = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}

export default SheepGame;
