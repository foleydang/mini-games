// 叠叠消 - 多层堆叠消除游戏
import { Colors, drawRoundRect, drawButton, drawText, drawGradientBg, Storage, RankData } from '../common/utils.js';
import { getBackButton, getShareButton, getSoundButton, drawBottomButtons, checkBottomButtons, drawHint } from '../common/ui.js';
import { Levels } from '../common/config.js';

const EMOJIS = ['🍜', '🍕', '🍔', '🍟', '🧁', '🍩', '🍺', '🍵', '🍦', '🍫', '🥤', '🍗'];

class SheepGame {
  constructor(canvas, ctx, designSize, onEnd) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.designSize = designSize;
    this.onEnd = onEnd;
    this.gameId = 'sheep';

    // 游戏状态
    this.tiles = [];          // 所有牌 { type, layer, col, row, x, y, removed }
    this.slot = [];           // 收集槽（最多7个）
    this.undoStack = [];      // 撤销栈
    this.gameOver = false;
    this.gameWon = false;
    this.animating = false;
    this.animTiles = [];      // 动画中的牌
    this.animProgress = 0;

    // 按钮配置
    this.backButton = getBackButton(designSize);
    this.shareButton = getShareButton(designSize);
    this.soundButton = getSoundButton(designSize);
    this.soundEnabled = true;

    // 当前关卡
    this.currentLevel = 0;
    this.score = 0;

    // 牌布局参数
    this.cardWidth = 80;
    this.cardHeight = 80;
    this.slotWidth = 90;
    this.slotHeight = 90;
    this.slotY = 0; // will be calculated
    this.gridStartX = 0;
    this.gridStartY = 0;

    this.init();
  }

  init() {
    const { width, height, safeTop, safeBottom } = this.designSize;
    this.currentLevel = Storage.load('sheep_level') || 0;
    if (this.currentLevel >= Levels.sheep.length) this.currentLevel = 0;

    // 计算布局
    this.slotY = height - safeBottom - 130;
    this.gridStartY = safeTop + 280 + 55;  // 棋盘下移，给标题和按钮更多空间

    this.generateLevel(this.currentLevel);
    this.draw();
  }

  generateLevel(levelIndex) {
    const config = Levels.sheep[levelIndex];
    const { layers, cols, rows, emojiCount } = config;

    // 确保每种图案出现3的倍数次（这样才能消除完）
    const emojis = EMOJIS.slice(0, emojiCount);
    const totalSlots = layers * cols * rows;

    // 计算每种图案需要几组（每组3张）
    const groupsPerEmoji = Math.floor(totalSlots / 3 / emojiCount);
    // 剩余位置用额外组填充
    const remainder = totalSlots - groupsPerEmoji * 3 * emojiCount;
    const extraGroups = Math.floor(remainder / 3);

    // 生成牌类型列表
    const types = [];
    for (let e = 0; e < emojiCount; e++) {
      for (let g = 0; g < groupsPerEmoji; g++) {
        types.push(e, e, e);
      }
    }
    // 用前几种图案填充剩余
    for (let g = 0; g < extraGroups; g++) {
      types.push(g % emojiCount, g % emojiCount, g % emojiCount);
    }

    // 如果还有多余位置（理论上不应该），补齐
    while (types.length < totalSlots) {
      const t = types.length % emojiCount;
      types.push(t, t, t);
      totalSlots; // just in case
    }

    // 打乱顺序
    this.shuffleArray(types);

    // 生成牌堆
    this.tiles = [];
    const { width } = this.designSize;
    const overlapX = 30; // 层间偏移
    const overlapY = 25;

    // 计算网格起始位置使整体居中
    const totalGridWidth = cols * this.cardWidth + (layers - 1) * overlapX;
    this.gridStartX = (width - totalGridWidth) / 2;

    let typeIndex = 0;
    for (let layer = 0; layer < layers; layer++) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = this.gridStartX + c * this.cardWidth + layer * overlapX;
          const y = this.gridStartY + r * this.cardHeight + layer * overlapY;
          this.tiles.push({
            type: types[typeIndex] || 0,
            layer: layer,
            col: c,
            row: r,
            x: x,
            y: y,
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
    this.animating = false;
    this.score = 0;
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // 判断一张牌是否可以被点击（没有上层牌覆盖它）
  isTileClickable(tile) {
    if (tile.removed) return false;
    const tx = tile.x;
    const ty = tile.y;
    const tw = this.cardWidth;
    const th = this.cardHeight;

    for (const other of this.tiles) {
      if (other.removed || other.layer <= tile.layer) continue;
      // 检查是否重叠（部分覆盖也算）
      if (tx < other.x + tw && tx + tw > other.x &&
          ty < other.y + th && ty + th > other.y) {
        return false;
      }
    }
    return true;
  }

  // 点击一张牌
  pickTile(tile) {
    if (this.animating || this.gameOver || this.gameWon) return;
    if (!this.isTileClickable(tile)) return;
    if (this.slot.length >= 7) return;

    // 记录撤销信息
    this.undoStack.push({ tile, slotIndex: this.slot.length });

    tile.removed = true;
    this.slot.push({ type: tile.type, emoji: EMOJIS[tile.type] });

    // 检查是否有3张相同可消除
    this.checkAndRemoveMatches();

    // 检查游戏状态
    this.checkGameState();

    this.draw();
  }

  checkAndRemoveMatches() {
    // 统计收集槽中每种类型的数量
    while (true) {
      const typeCounts = {};
      for (const s of this.slot) {
        typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
      }

      let matchType = null;
      for (const [t, count] of Object.entries(typeCounts)) {
        if (count >= 3) {
          matchType = parseInt(t);
          break;
        }
      }

      if (matchType === null) break;

      // 移除3张匹配的牌
      const toRemove = [];
      for (let i = 0; i < this.slot.length && toRemove.length < 3; i++) {
        if (this.slot[i].type === matchType) {
          toRemove.push(i);
        }
      }

      // 从收集槽中移除
      this.slot = this.slot.filter((_, i) => !toRemove.includes(i));
      this.score += 10;

      // 清空撤销栈（消除后不可撤销之前的操作）
      this.undoStack = [];
    }
  }

  checkGameState() {
    // 检查是否通关
    const remaining = this.tiles.filter(t => !t.removed);
    if (remaining.length === 0 && this.slot.length === 0) {
      this.gameWon = true;
      // 保存进度
      if (this.currentLevel < Levels.sheep.length - 1) {
        Storage.save('sheep_level', this.currentLevel + 1);
      }
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

  // 撤销：把最近选的牌放回原位
  undo() {
    if (this.undoStack.length === 0 || this.animating || this.gameOver || this.gameWon) return;
    const last = this.undoStack.pop();
    last.tile.removed = false;
    // 从slot中移除该牌
    const slotIdx = this.slot.findIndex(s => s.type === last.tile.type);
    if (slotIdx !== -1) {
      this.slot.splice(slotIdx, 1);
    }
    this.draw();
  }

  // 洗牌：重新排列未消除的牌的类型
  shuffleTiles() {
    if (this.animating || this.gameOver || this.gameWon) return;

    const remaining = this.tiles.filter(t => !t.removed);
    const types = remaining.map(t => t.type);
    this.shuffleArray(types);
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].type = types[i];
    }
    // 洗牌后清空撤销栈
    this.undoStack = [];
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const { width, height, safeTop, safeBottom } = this.designSize;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawGradientBg(ctx, width, height, '#fff5eb', '#ffcba4');

    // 标题和关卡信息
    const levelName = Levels.sheep[this.currentLevel]?.name || '第' + (this.currentLevel + 1) + '关';
    drawText(ctx, '叠叠消', width / 2, safeTop + 80, { fontSize: 48, color: '#e85d04', bold: true });
    drawText(ctx, '关卡: ' + levelName + '  分数: ' + this.score, width / 2, safeTop + 140, { fontSize: 28, color: '#6c3410' });

    // 底部按钮（返回、分享、音效）
    this.buttons = drawBottomButtons(ctx, this.designSize, '← 返回', this.soundEnabled);

    // 绘制操作按钮（撤销、洗牌）
    this.drawActionButtons();

    // 绘制牌堆
    this.drawTiles();

    // 绘制收集槽
    this.drawSlot();

    // 游戏结束或通关覆盖层
    if (this.gameWon) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '🎉 通关！', width / 2, height / 2 - 60, { fontSize: 48, color: '#fff', bold: true });
      drawText(ctx, '分数: ' + this.score, width / 2, height / 2 + 10, { fontSize: 32, color: '#fff' });
      drawHint(ctx, this.designSize, '点击返回');
    } else if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      drawText(ctx, '失败了 😢', width / 2, height / 2 - 60, { fontSize: 48, color: '#fff', bold: true });
      drawText(ctx, '分数: ' + this.score, width / 2, height / 2 + 10, { fontSize: 32, color: '#fff' });
      drawHint(ctx, this.designSize, '点击返回');
    }
  }

  drawActionButtons() {
    const ctx = this.ctx;
    const { width } = this.designSize;

    // 撤销按钮 - 牌堆上方左侧
    const btnY = this.gridStartY - 55;
    this.undoBtn = {
      x: 50,
      y: btnY,
      width: 130,
      height: 44
    };
    drawButton(ctx, this.undoBtn.x, this.undoBtn.y, this.undoBtn.width, this.undoBtn.height,
               '↩ 撤销', '#8b5cf6', { fontSize: 24, radius: 12 });

    // 洗牌按钮 - 牌堆上方中间
    this.shuffleBtn = {
      x: width / 2 - 65,
      y: btnY,
      width: 130,
      height: 44
    };
    drawButton(ctx, this.shuffleBtn.x, this.shuffleBtn.y, this.shuffleBtn.width, this.shuffleBtn.height,
               '🔄 洗牌', '#3b82f6', { fontSize: 24, radius: 12 });

    // 重试按钮 - 牌堆上方右侧
    this.retryBtn = {
      x: width - 180,
      y: btnY,
      width: 130,
      height: 44
    };
    drawButton(ctx, this.retryBtn.x, this.retryBtn.y, this.retryBtn.width, this.retryBtn.height,
               '🔄 重试', '#ef4444', { fontSize: 24, radius: 12 });
  }

  drawTiles() {
    const ctx = this.ctx;
    const maxLayer = Math.max(...this.tiles.filter(t => !t.removed).map(t => t.layer), 0);

    // 先绘制下层（暗且小），再绘制上层（亮且大）
    for (let layer = 0; layer <= maxLayer; layer++) {
      const layerTiles = this.tiles.filter(t => !t.removed && t.layer === layer);

      for (const tile of layerTiles) {
        const clickable = this.isTileClickable(tile);
        const layerRatio = (layer + 1) / (maxLayer + 1);

        // 上层牌大且清晰，下层牌小且暗
        const scale = 0.7 + 0.3 * layerRatio;
        const alpha = 0.4 + 0.6 * layerRatio;
        const cw = this.cardWidth * scale;
        const ch = this.cardHeight * scale;

        // 牌的位置（以原始x,y为中心缩放）
        const cx = tile.x + this.cardWidth / 2;
        const cy = tile.y + this.cardHeight / 2;
        const drawX = cx - cw / 2;
        const drawY = cy - ch / 2;

        ctx.globalAlpha = alpha;

        // 牌背景
        if (clickable) {
          drawRoundRect(ctx, drawX, drawY, cw, ch, 10, '#ffffff', '#e85d04', 2);
        } else {
          drawRoundRect(ctx, drawX, drawY, cw, ch, 10, '#e5e7eb', '#9ca3af', 1);
        }

        // emoji图案
        const emoji = EMOJIS[tile.type];
        ctx.globalAlpha = alpha;
        ctx.font = `${Math.floor(cw * 0.55)}px sans-serif`;
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
    const slotStartX = (width - 7 * this.slotWidth - 6 * 8) / 2;
    const slotBgY = this.slotY - 10;
    const slotBgWidth = 7 * this.slotWidth + 6 * 8 + 20;
    const slotBgHeight = this.slotHeight + 20;
    drawRoundRect(ctx, slotStartX - 10, slotBgY, slotBgWidth, slotBgHeight, 16, '#3d1f0a', '#e85d04', 2);

    // 7个格子
    for (let i = 0; i < 7; i++) {
      const sx = slotStartX + i * (this.slotWidth + 8);
      const sy = this.slotY;
      drawRoundRect(ctx, sx, sy, this.slotWidth, this.slotHeight, 8, '#5a3015');

      if (i < this.slot.length) {
        const item = this.slot[i];
        // 牌背景
        drawRoundRect(ctx, sx + 4, sy + 4, this.slotWidth - 8, this.slotHeight - 8, 6, '#ffffff', '#e85d04', 2);
        // emoji
        ctx.font = `${Math.floor(this.slotWidth * 0.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(EMOJIS[item.type], sx + this.slotWidth / 2, sy + this.slotHeight / 2);
      }
    }
  }

  onTouchStart(pos) {
    const btn = checkBottomButtons(pos, this.buttons);
    if (btn === 'backBtn') {
      RankData.save(this.gameId, this.score);
      this.onEnd(this.score);
      return;
    }
    if (btn === 'soundBtn') {
      this.soundEnabled = !this.soundEnabled;
      this.draw();
      return;
    }

    if (this.gameOver || this.gameWon) {
      RankData.save(this.gameId, this.score);
      this.onEnd(this.score);
      return;
    }

    if (this.animating) return;

    // 检查撤销按钮
    if (this.undoBtn && pos.x >= this.undoBtn.x && pos.x <= this.undoBtn.x + this.undoBtn.width &&
        pos.y >= this.undoBtn.y && pos.y <= this.undoBtn.y + this.undoBtn.height) {
      this.undo();
      return;
    }

    // 检查洗牌按钮
    if (this.shuffleBtn && pos.x >= this.shuffleBtn.x && pos.x <= this.shuffleBtn.x + this.shuffleBtn.width &&
        pos.y >= this.shuffleBtn.y && pos.y <= this.shuffleBtn.y + this.shuffleBtn.height) {
      this.shuffleTiles();
      return;
    }

    // 检查重试按钮
    if (this.retryBtn && pos.x >= this.retryBtn.x && pos.x <= this.retryBtn.x + this.retryBtn.width &&
        pos.y >= this.retryBtn.y && pos.y <= this.retryBtn.y + this.retryBtn.height) {
      this.generateLevel(this.currentLevel);
      this.draw();
      return;
    }

    // 检查点击了哪张牌（从最上层开始检查）
    const maxLayer = Math.max(...this.tiles.filter(t => !t.removed).map(t => t.layer), 0);

    for (let layer = maxLayer; layer >= 0; layer--) {
      const layerTiles = this.tiles.filter(t => !t.removed && t.layer === layer);

      for (const tile of layerTiles) {
        const scale = 0.7 + 0.3 * ((layer + 1) / (maxLayer + 1));
        const cw = this.cardWidth * scale;
        const ch = this.cardHeight * scale;
        const cx = tile.x + this.cardWidth / 2;
        const cy = tile.y + this.cardHeight / 2;
        const drawX = cx - cw / 2;
        const drawY = cy - ch / 2;

        if (pos.x >= drawX && pos.x <= drawX + cw &&
            pos.y >= drawY && pos.y <= drawY + ch) {
          this.pickTile(tile);
          return;
        }
      }
    }
  }

  onTouchMove(pos) {}
  onTouchEnd(pos) {}

  update() {}

  destroy() {}
}

export default SheepGame;
