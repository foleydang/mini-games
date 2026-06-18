/**
 * 音效管理器 - 微信小游戏音效系统 + 背景音乐 + 震动
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
  MATCH_PAIR: 'pair',
  HAMMER: 'hammer',
  MATH_CORRECT: 'math_correct',
  MATH_WRONG: 'math_wrong'
};

// 是否需要震动
const shouldVibrate = {
  click: false,
  success: true,
  fail: true,
  swap: false,
  match: true,
  drop: false,
  clear: true,
  move: false,
  gameover: true,
  levelup: true,
  flap: false,
  bounce: false,
  brick: true,
  card: false,
  pair: true,
  hammer: true,
  math_correct: true,
  math_wrong: true
};

// 震动强度
const vibrateType = {
  click: 'light',
  success: 'medium',
  fail: 'heavy',
  match: 'medium',
  clear: 'medium',
  gameover: 'heavy',
  levelup: 'medium',
  brick: 'medium',
  pair: 'medium',
  hammer: 'heavy',
  math_correct: 'medium',
  math_wrong: 'heavy'
};

class AudioManager {
  constructor() {
    this.enabled = true;
    this.musicEnabled = true;
    this.soundEnabled = true;
    this.lastVibrateTime = 0;
    this.minInterval = 100;
    this.bgMusic = null;
    this.bgMusicPlaying = false;

    this.initBgMusic();
  }

  initBgMusic() {
    try {
      this.bgMusic = wx.createInnerAudioContext();
      this.bgMusic.loop = true;
      this.bgMusic.volume = 0.3;
      // 背景音乐URL - 使用项目中自带的音频
      this.bgMusic.src = 'audio/bg.mp3';
      this.bgMusic.onError(() => {
        // 如果本地文件不存在，静默处理
        console.log('背景音乐加载失败，使用纯震动反馈');
      });
    } catch (e) {
      console.log('创建背景音乐失败');
    }
  }

  startBgMusic() {
    if (!this.musicEnabled || !this.bgMusic || this.bgMusicPlaying) return;
    try {
      this.bgMusic.play();
      this.bgMusicPlaying = true;
    } catch (e) {}
  }

  stopBgMusic() {
    if (!this.bgMusic || !this.bgMusicPlaying) return;
    try {
      this.bgMusic.stop();
      this.bgMusicPlaying = false;
    } catch (e) {}
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.startBgMusic();
    } else {
      this.stopBgMusic();
    }
    return this.musicEnabled;
  }

  play(type) {
    if (!this.enabled) return;

    // 震动反馈
    if (shouldVibrate[type]) {
      const now = Date.now();
      if (now - this.lastVibrateTime > this.minInterval) {
        this.lastVibrateTime = now;
        try {
          const vt = vibrateType[type] || 'light';
          if (vt === 'heavy') {
            wx.vibrateLong();
          } else {
            wx.vibrateShort({ type: vt });
          }
        } catch (e) {}
      }
    }

    // 音效播放 - 使用 wx.createInnerAudioContext 生成简短提示音
    if (this.soundEnabled) {
      try {
        const sfx = wx.createInnerAudioContext();
        // 根据音效类型使用不同频率的合成音
        // 微信小游戏不支持动态合成，但可以通过不同src实现
        // 这里我们主要依赖震动反馈，音效部分需要实际音频文件
        sfx.destroy(); // 暂时只用震动
      } catch (e) {}
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopBgMusic();
    } else if (this.musicEnabled) {
      this.startBgMusic();
    }
    return this.enabled;
  }
}

export const audioManager = new AudioManager();
export const playSound = (type) => audioManager.play(type);
export const toggleSound = () => audioManager.toggle();
export const toggleMusic = () => audioManager.toggleMusic();
