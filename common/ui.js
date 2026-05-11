/**
 * 游戏UI组件 - 按钮在顶部（更大更容易点击）
 */
import { Colors, drawButton, drawText, drawRoundRect } from './utils.js';

// 返回按钮 - 左上角（240x100）
export function getBackButton(designSize) {
  const { width, height, safeTop, safeBottom } = designSize;
  return {
    x: 30,
    y: safeTop + 100,
    width: 160,  // 2/3 of 240
    height: 67
  };
}

// 分享按钮 - 返回按钮右边（240x100）
export function getShareButton(designSize) {
  const { width, height, safeTop, safeBottom } = designSize;
  const backBtn = getBackButton(designSize);
  return {
    x: backBtn.x + backBtn.width + 20,
    y: backBtn.y,
    width: 160,  // 2/3 of 240
    height: 67
  };
}

// 音效按钮 - 右上角（280x100）
export function getSoundButton(designSize) {
  const { width, height, safeTop, safeBottom } = designSize;
  return {
    x: width - 220,
    y: safeTop + 100,
    width: 187,  // 2/3 of 280
    height: 67
  };
}

// 绘制底部按钮栏
export function drawBottomButtons(ctx, designSize, backButtonLabel, soundEnabled = true) {
  const backBtn = getBackButton(designSize);
  const shareBtn = getShareButton(designSize);
  const soundBtn = getSoundButton(designSize);

  drawButton(ctx, backBtn.x, backBtn.y, backBtn.width, backBtn.height,
             backButtonLabel || '← 返回', Colors.danger, { fontSize: 40, radius: 18 });

  drawButton(ctx, shareBtn.x, shareBtn.y, shareBtn.width, shareBtn.height,
             '分享', Colors.success, { fontSize: 40, radius: 18 });

  drawButton(ctx, soundBtn.x, soundBtn.y, soundBtn.width, soundBtn.height,
             soundEnabled ? '🔊' : '🔇', Colors.info, { fontSize: 40, radius: 18 });

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

// 绘制提示文字
export function drawHint(ctx, designSize, text) {
  const { width, height, safeBottom } = designSize;
  drawText(ctx, text, width / 2, height - safeBottom - 38, {
    fontSize: 22,
    color: Colors.textMuted
  });
}
