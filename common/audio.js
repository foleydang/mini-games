/**
 * 音效管理器 - 微信小游戏音效系统（优化震动）
 */

// 音效类型
export const SoundType = {
  CLICK: 'click',
  SUCCESS: 'success',
  FAIL: 'fail',
  SWAP: 'swap',
  MATCH: 'match',
  DROP: 'drop',
  CLEAR: 'clear',
  MOVE: 'move',
  GAME_OVER: 'gameover',
  LEVEL_UP: 'levelup',
  FLAP: 'flap',
  BOUNCE: 'bounce',
  BRICK: 'brick',
  CARD: 'card',
  MATCH_PAIR: 'pair'
};

// 是否需要震动（高频操作不震动）
const shouldVibrate = {
  click: false,      // 点击太频繁，不震动
  success: true,
  fail: true,
  swap: false,       // 交换频繁，不震动
  match: true,       // 匹配成功震动
  drop: false,       // 落地频繁
  clear: true,       // 消除震动
  move: false,       // 移动频繁
  gameover: true,
  levelup: true,
  flap: false,       // 飞跃频繁
  bounce: false,     // 反弹频繁
  brick: true,       // 打砖块震动
  card: false,
  pair: true
};

class AudioManager {
  constructor() {
    this.enabled = true;
    this.lastVibrateTime = 0;
    this.minInterval = 100; // 震动最小间隔100ms
  }

  play(type) {
    if (!this.enabled) return;
    
    // 只对重要事件震动，且限制频率
    if (shouldVibrate[type]) {
      const now = Date.now();
      if (now - this.lastVibrateTime > this.minInterval) {
        this.lastVibrateTime = now;
        try {
          wx.vibrateShort({ type: 'light' });
        } catch (e) {}
      }
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

export const audioManager = new AudioManager();
export const playSound = (type) => audioManager.play(type);
export const toggleSound = () => audioManager.toggle();
