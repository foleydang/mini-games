/**
 * 游戏UI组件 - 统一的按钮和布局
 */
import { Colors, drawButton, drawText, drawRoundRect } from './utils.js';

// 安全按钮位置计算 - 返回按钮在左下角（远离胶囊按钮）
export function getBackButton(designSize) {
  const { width, height, safeBottom } = designSize;
  return {
    x: 25,
    y: height - safeBottom - 65,
    width: 110,
    height: 48
  };
}

// 分享按钮 - 左下角第二个
export function getShareButton(designSize) {
  const { width, height, safeBottom } = designSize;
  const backBtn = getBackButton(designSize);
  return {
    x: backBtn.x + backBtn.width + 15,
    y: backBtn.y,
    width: 110,
    height: 48
  };
}

// 音效按钮 - 右下角
export function getSoundButton(designSize) {
  const { width, height, safeBottom } = designSize;
  return {
    x: width - 135,
    y: height - safeBottom - 65,
    width: 110,
    height: 48
  };
}

// 绘制底部按钮栏
export function drawBottomButtons(ctx, designSize, backButtonLabel, soundEnabled = true) {
  const backBtn = getBackButton(designSize);
  const shareBtn = getShareButton(designSize);
  const soundBtn = getSoundButton(designSize);

  // 返回按钮 - 左侧
  drawButton(ctx, backBtn.x, backBtn.y, backBtn.width, backBtn.height,
             backButtonLabel || '返回', Colors.danger, { fontSize: 28, radius: 14 });

  // 分享按钮 - 中间
  drawButton(ctx, shareBtn.x, shareBtn.y, shareBtn.width, shareBtn.height,
             '分享', Colors.success, { fontSize: 28, radius: 14 });

  // 音效按钮 - 右侧
  drawButton(ctx, soundBtn.x, soundBtn.y, soundBtn.width, soundBtn.height,
             soundEnabled ? '🔊' : '🔇', Colors.info, { fontSize: 28, radius: 14 });

  return { backBtn, shareBtn, soundBtn };
}

// 检测按钮点击
export function checkBottomButtons(pos, buttons) {
  for (const [name, btn] of Object.entries(buttons)) {
    if (pos.x >= btn.x && pos.x <= btn.x + btn.width &&
        pos.y >= btn.y && pos.y <= btn.y + btn.height) {
      return name;
    }
  }
  return null;
}

// 绘制游戏标题栏
export function drawGameHeader(ctx, designSize, title, score, extra = {}) {
  const { width, safeTop } = designSize;

  // 游戏标题
  drawText(ctx, title, width / 2, safeTop + 50, {
    fontSize: 48,
    color: extra.theme?.primary || Colors.primary,
    bold: true
  });

  // 分数显示
  if (score !== undefined) {
    drawText(ctx, `${score}`, width / 2 + 100, safeTop + 50, {
      fontSize: 38,
      color: Colors.textDark,
      bold: true
    });
  }

  // 关卡/额外信息
  if (extra.level) {
    drawText(ctx, extra.level, width / 2 - 100, safeTop + 50, {
      fontSize: 24,
      color: Colors.textLight
    });
  }
}

// 绘制提示文字
export function drawHint(ctx, designSize, text) {
  const { width, height, safeBottom } = designSize;
  drawText(ctx, text, width / 2, height - safeBottom - 38, {
    fontSize: 22,
    color: Colors.textMuted
  });
}
