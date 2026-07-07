// 叠叠消 - 羊了个羊风格多层堆叠消除游戏
import { drawRoundRect, drawText, drawGradientBg, Storage, RankData } from '../common/utils.js';
import { getBackButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';
import { Levels } from '../common/config.js';

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
    this.soundEnabled = true;

    // 关卡（羊了个羊风格：只有2关）
    this.currentLevel = Math.min(level, 1);
    this.score = 0;

    // 布局参数
    this.cardSize = 70;
    this.slotSize = 80;
    this.slotGap = 10;
    this.slotY = 0;
    this.gridStartY = 0;

    this.init();
  }

  init() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    
    // 计算布局
    this.slotY = height - safeBottom - 150;
    this.gridStartY = safeTop + 280;

    this.generateLevel(this.currentLevel);
    this.draw();
    this.startLoop();
  }

  generateLevel(levelIndex) {
    // 羊了个羊风格：第1关超简单，第2关超难
    const configs = [
      // 第1关：2层，3x4网格，4种图案，很容易
      { layers: 2, rows: 3, cols: 4, emojiCount: 4, name: '新手村' },
      // 第2关：4层，5x6网格，8种图案，很难
      { layers: 4, rows: 5, cols: 6, emojiCount: 8, name: '地狱模式' }
    ];
    
    const config = configs[levelIndex];
    const { layers, rows, cols, emojiCount } = config;

    // 计算总牌数（必须是3的倍数）
    let totalTiles = layers * rows * cols;
    totalTiles = Math.floor(totalTiles / 3) * 3;

    // 生成牌类型（每种图案3的倍数张）
    const types = [];
    const pairsPerEmoji = Math.floor(totalTiles / 3 / emojiCount);
    
    for (let e = 0; e < emojiCount; e++) {
      for (let p = 0; p < pairsPerEmoji; p++) {
        types.push(e, e, e);
      }
    }

    // 填充剩余位置
    while (types.length < totalTiles) {
      types.push(types.length % emojiCount);
    }

    // 打乱
    this.shuffleArray(types);

    // 生成牌堆 - 使用更紧凑的布局
    this.tiles = [];
    const { width } = this.designSize;
    
    const layerOffsetX = 20;
    const layerOffsetY = 15;
    const cardGap = 8;
    
    const gridWidth = cols * (this.cardSize + cardGap) + (layers - 1) * layerOffsetX;
    const startX = (width - gridWidth) / 2;

    let typeIndex = 0;
    for (let layer = 0; layer < layers; layer++) {
      const layerX = startX + layer * layerOffsetX;
      const layerY = this.gridStartY + layer * layerOffsetY;
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (typeIndex >= types.length) break;
          
          this.tiles.push({
            type: types[typeIndex],
            layer: layer,
            row: r,
            col: c,
            x: layerX + c * (this.cardSize + cardGap),
            y: layerY + r * (this.cardSize + cardGap),
            removed: false
          });
          typeIndex++;
        }
      }
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
      }
    }
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
    drawGradientBg(ctx, width, height, '#fff5eb', '#ffcba4');

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

    // 游戏结束覆盖层
    if (this.gameWon) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '🎉 通关！', width / 2, height / 2 - 80, { fontSize: 56, color: '#fbbf24', bold: true });
      drawText(ctx, `分数: ${this.score}`, width / 2, height / 2 - 10, { fontSize: 36, color: '#fff' });
      
      if (this.currentLevel === 0) {
        drawText(ctx, '准备好挑战地狱模式了吗？', width / 2, height / 2 + 50, { fontSize: 28, color: '#fbbf24' });
      } else {
        drawText(ctx, '你是真正的高手！', width / 2, height / 2 + 50, { fontSize: 28, color: '#fbbf24' });
      }
      
      drawHint(ctx, this.designSize, '点击返回');
    } else if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '失败了 😢', width / 2, height / 2 - 80, { fontSize: 56, color: '#ef4444', bold: true });
      drawText(ctx, `分数: ${this.score}`, width / 2, height / 2 - 10, { fontSize: 36, color: '#fff' });
      drawText(ctx, '收集槽已满，再试一次吧！', width / 2, height / 2 + 50, { fontSize: 28, color: '#fbbf24' });
      drawHint(ctx, this.designSize, '点击返回');
    }
  }

  drawActionButtons() {
    const ctx = this.ctx;
    const { width } = this.designSize;
    const btnY = this.gridStartY - 60;
    const btnHeight = 44;
    const btnWidth = 120;
    const gap = 20;

    // 撤销按钮
    this.undoBtn = { x: width / 2 - btnWidth - gap - btnWidth / 2, y: btnY, width: btnWidth, height: btnHeight };
    this.drawStyledButton(ctx, this.undoBtn.x, this.undoBtn.y, btnWidth, btnHeight, '↩ 撤销', '#8b5cf6');

    // 洗牌按钮
    this.shuffleBtn = { x: width / 2 - btnWidth / 2, y: btnY, width: btnWidth, height: btnHeight };
    this.drawStyledButton(ctx, this.shuffleBtn.x, this.shuffleBtn.y, btnWidth, btnHeight, '🔄 洗牌', '#3b82f6');

    // 重试按钮
    this.retryBtn = { x: width / 2 + gap + btnWidth / 2, y: btnY, width: btnWidth, height: btnHeight };
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

    // 从底层到顶层绘制
    for (let layer = 0; layer <= maxLayer; layer++) {
      const layerTiles = this.tiles.filter(t => !t.removed && t.layer === layer);

      for (const tile of layerTiles) {
        const clickable = this.isTileClickable(tile);
        const layerRatio = (layer + 1) / (maxLayer + 1);

        // 上层牌更大更亮
        const scale = 0.75 + 0.25 * layerRatio;
        const alpha = 0.5 + 0.5 * layerRatio;
        const size = this.cardSize * scale;

        const cx = tile.x + this.cardSize / 2;
        const cy = tile.y + this.cardSize / 2;
        const drawX = cx - size / 2;
        const drawY = cy - size / 2;

        ctx.globalAlpha = alpha;

        // 阴影效果
        if (clickable) {
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 2;
        }

        // 牌背景
        const bgColor = clickable ? '#ffffff' : '#e5e7eb';
        const borderColor = clickable ? '#e85d04' : '#9ca3af';
        drawRoundRect(ctx, drawX, drawY, size, size, 10, bgColor, borderColor, clickable ? 2.5 : 1);

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Emoji
        const emoji = EMOJIS[tile.type];
        ctx.font = `${Math.floor(size * 0.55)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(emoji, cx, cy);

        ctx.globalAlpha = 1;
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
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') {
      RankData.save(this.gameId, this.score);
      this.onEnd({ score: this.score, passed: false });
      return;
    }
    if (btn === 'soundBtn') {
      this.soundEnabled = !this.soundEnabled;
      this.draw();
      return;
    }

    if (this.gameOver || this.gameWon) {
      RankData.save(this.gameId, this.score);
      this.onEnd({ score: this.score, passed: this.gameWon });
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

    // 点击牌（从顶层开始）
    const maxLayer = Math.max(...this.tiles.filter(t => !t.removed).map(t => t.layer), 0);

    for (let layer = maxLayer; layer >= 0; layer--) {
      const layerTiles = this.tiles.filter(t => !t.removed && t.layer === layer);

      for (const tile of layerTiles) {
        const scale = 0.75 + 0.25 * ((layer + 1) / (maxLayer + 1));
        const size = this.cardSize * scale;
        const cx = tile.x + this.cardSize / 2;
        const cy = tile.y + this.cardSize / 2;
        const drawX = cx - size / 2;
        const drawY = cy - size / 2;

        if (pos.x >= drawX && pos.x <= drawX + size &&
            pos.y >= drawY && pos.y <= drawY + size) {
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
    const loop = () => {
      if (this.gameOver || this.gameWon) return;
      this.draw();
      requestAnimationFrame(loop);
    };
    loop();
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}
  update() {}
  destroy() {}
}

export default SheepGame;
