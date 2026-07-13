/**
 * 统一的关卡结算遮罩(自绘画布)
 * 各关卡游戏在结束时创建实例,在自身 draw() 末尾调用 result.draw(ctx),
 * 在 onTouchStart 里把坐标交给 result.onTouchStart(pos),根据返回值处理:
 *   'next'   → 进入下一关
 *   'replay' → 通关且已是最后一关,重玩本关
 *   'retry'  → 失败重试本关
 *   'back'   → 返回主菜单
 */
import { drawRoundRect, drawText } from './utils.js';

export default class LevelResult {
  // opts: { win, score, scoreLabel, levelName, hasNext, primaryColor }
  constructor(designSize, opts = {}) {
    this.designSize = designSize;
    this.win = !!opts.win;
    this.score = opts.score;
    this.scoreLabel = opts.scoreLabel || '得分';
    this.levelName = opts.levelName || '';
    this.hasNext = !!opts.hasNext;
    this.primary = opts.primaryColor || '#8b5cf6';
    // 通关星级(1~3),默认满星;失败不显示
    this.stars = this.win ? Math.max(1, Math.min(3, opts.stars != null ? opts.stars : 3)) : 0;

    if (this.win && this.hasNext) this.primaryText = '下一关 →';
    else if (this.win) this.primaryText = '再玩一次';
    else this.primaryText = '重试';

    this.backBtn = null;
    this.mainBtn = null;
  }

  draw(ctx) {
    const { width, height } = this.designSize;

    const c1 = this.win ? this.primary : '#fee2e6';
    const c2 = this.win ? this._lighten(this.primary, 46) : '#fda4af';
    const accent = this.win ? this.primary : '#fb7185';

    ctx.save();
    // 遮罩:带主题色的柔和径向渐变,比纯黑更耐看
    const og = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, Math.max(width, height) * 0.72);
    og.addColorStop(0, this._rgba(accent, 0.34));
    og.addColorStop(1, 'rgba(17, 24, 39, 0.68)');
    ctx.fillStyle = og;
    ctx.fillRect(0, 0, width, height);

    const cardW = Math.min(500, width - 96);
    const cardH = this.win ? 362 : 320;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;
    const radius = 34;

    // 卡片投影 + 白色底
    ctx.shadowColor = this._rgba(accent, 0.4);
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 14;
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, radius, '#ffffff');
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const headerH = 128;
    ctx.save();
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.clip();

    // 卡片下半部淡淡的主题色映染,避免大片死白
    const bodyGrad = ctx.createLinearGradient(0, cardY + headerH, 0, cardY + cardH);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(1, this._rgba(accent, 0.07));
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(cardX, cardY + headerH, cardW, cardH - headerH);

    // 顶部渐变头部色带(斜向渐变)——失败用柔和珊瑚粉,不用深红
    const bandGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headerH);
    bandGrad.addColorStop(0, c1);
    bandGrad.addColorStop(1, c2);
    ctx.fillStyle = bandGrad;
    ctx.fillRect(cardX, cardY, cardW, headerH);

    // 色带顶部柔光高光
    const glossGrad = ctx.createLinearGradient(0, cardY, 0, cardY + headerH);
    glossGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
    glossGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glossGrad;
    ctx.fillRect(cardX, cardY, cardW, headerH);

    // 柔和装饰圆(泡泡感)
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.arc(cardX + cardW - 46, cardY + 20, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(cardX + 40, cardY + headerH - 8, 46, 0, Math.PI * 2);
    ctx.fill();

    // 小星点点缀
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', cardX + 44, cardY + 34);
    ctx.font = '12px sans-serif';
    ctx.fillText('✦', cardX + cardW - 70, cardY + headerH - 22);
    ctx.globalAlpha = 1;
    ctx.restore();

    // 标题(位于色带内,白色)
    const title = this.win ? '过关啦' : '再试一次';
    drawText(ctx, title, width / 2, cardY + 58, { fontSize: 44, color: '#ffffff', bold: true });
    if (this.levelName) {
      drawText(ctx, this.levelName, width / 2, cardY + 98, { fontSize: 20, color: 'rgba(255,255,255,0.92)' });
    }

    // 通关星级(横跨色带下边缘,像一枚奖章)
    let scoreLabelY = cardY + headerH + 40;
    let scoreNumY = cardY + headerH + 82;
    if (this.win) {
      this._drawStars(ctx, width / 2, cardY + headerH + 8, this.stars);
      scoreLabelY = cardY + headerH + 68;
      scoreNumY = cardY + headerH + 110;
    }

    // 分数(白色区域,纯文字)
    drawText(ctx, this.scoreLabel, width / 2, scoreLabelY, { fontSize: 20, color: '#9ca3af' });
    drawText(ctx, `${this.score}`, width / 2, scoreNumY, { fontSize: 46, color: accent, bold: true });

    // 底部两个按钮
    const gap = 22;
    const btnW = (cardW - 56 - gap) / 2;
    const btnH = 66;
    const btnY = cardY + cardH - 88;
    const leftX = cardX + 28;
    const rightX = leftX + btnW + gap;

    this.backBtn = { x: leftX, y: btnY, width: btnW, height: btnH };
    drawRoundRect(ctx, leftX, btnY, btnW, btnH, 20, '#eef1f5', this._rgba(accent, 0.18), 1.5);
    drawText(ctx, '返回', leftX + btnW / 2, btnY + btnH / 2, { fontSize: 27, color: '#6b7280', bold: true });

    // 主按钮:渐变 + 主题色微光
    this.mainBtn = { x: rightX, y: btnY, width: btnW, height: btnH };
    const btnGrad = ctx.createLinearGradient(rightX, btnY, rightX, btnY + btnH);
    btnGrad.addColorStop(0, this._lighten(this.win ? this.primary : '#fb7185', 22));
    btnGrad.addColorStop(1, accent);
    ctx.shadowColor = this._rgba(accent, 0.45);
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    drawRoundRect(ctx, rightX, btnY, btnW, btnH, 20, btnGrad);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    drawText(ctx, this.primaryText, rightX + btnW / 2, btnY + btnH / 2, { fontSize: 27, color: '#ffffff', bold: true });

    ctx.restore();
  }

  // 返回 'next' | 'replay' | 'retry' | 'back' | null
  onTouchStart(pos) {
    if (this.backBtn && this._hit(pos, this.backBtn)) return 'back';
    if (this.mainBtn && this._hit(pos, this.mainBtn)) {
      if (!this.win) return 'retry';
      return this.hasNext ? 'next' : 'replay';
    }
    return null;
  }

  _hit(pos, r) {
    return pos.x >= r.x && pos.x <= r.x + r.width && pos.y >= r.y && pos.y <= r.y + r.height;
  }

  // 将 #rrggbb 提亮,用于头部渐变的第二色
  _lighten(hex, amt = 40) {
    const rgb = this._toRgb(hex);
    if (!rgb) return hex;
    return `rgb(${Math.min(255, rgb.r + amt)}, ${Math.min(255, rgb.g + amt)}, ${Math.min(255, rgb.b + amt)})`;
  }

  _toRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
  }

  _rgba(hex, a) {
    const rgb = this._toRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
  }

  // 三颗星,中间略大,亮起 filled 颗;横跨色带下缘,做奖章感
  _drawStars(ctx, cx, cy, filled) {
    const gap = 46;
    const positions = [-1, 0, 1];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const x = cx + positions[i] * gap;
      const mid = i === 1;
      const size = mid ? 46 : 38;
      const on = i < filled;
      // 白色描边让星星浮在色带边缘上
      ctx.font = `${size}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('★', x, cy - (mid ? 6 : 0));
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      // 星芯
      ctx.font = `${size - 8}px sans-serif`;
      ctx.fillStyle = on ? '#fbbf24' : '#e5e7eb';
      ctx.fillText('★', x, cy - (mid ? 6 : 0));
    }
    ctx.restore();
  }
}
