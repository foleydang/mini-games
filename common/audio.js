/**
 * 音效管理器 - 微信小游戏音效系统
 */

// 音效类型
export const SoundType = {
  CLICK: 'click',      // 点击
  SUCCESS: 'success',  // 成功/得分
  FAIL: 'fail',        // 失败/碰撞
  SWAP: 'swap',        // 消消乐交换
  MATCH: 'match',      // 消消乐匹配成功
  DROP: 'drop',        // 俄罗斯方块落地
  CLEAR: 'clear',      // 消除行
  MOVE: 'move',        // 移动
  GAME_OVER: 'gameover', // 游戏结束
  LEVEL_UP: 'levelup',   // 升级/过关
  FLAP: 'flap',        // 飞鸟跳跃
  BOUNCE: 'bounce',    // 弹球反弹
  BRICK: 'brick',      // 打砖块
  CARD: 'card',        // 翻牌
  MATCH_PAIR: 'pair'   // 配对成功
};

class AudioManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.6;
  }

  // 播放音效（使用振动反馈）
  play(type) {
    if (!this.enabled) return;
    
    try {
      const freq = this.getFrequency(type);
      if (freq > 1000) {
        wx.vibrateShort({ type: 'light' });
      } else if (freq > 600) {
        wx.vibrateShort({ type: 'medium' });
      } else {
        wx.vibrateShort({ type: 'heavy' });
      }
    } catch (e) {
      // 某些设备不支持振动
    }
  }

  getFrequency(type) {
    const frequencies = {
      click: 800,
      success: 1200,
      fail: 300,
      swap: 600,
      match: 1000,
      drop: 400,
      clear: 1500,
      move: 500,
      gameover: 200,
      levelup: 1800,
      flap: 700,
      bounce: 550,
      brick: 900,
      card: 650,
      pair: 1400
    };
    return frequencies[type] || 500;
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

export const audioManager = new AudioManager();
export const playSound = (type) => audioManager.play(type);
export const toggleSound = () => audioManager.toggle();
