/**
 * 音效管理器 - 微信小游戏音效系统 + 背景音乐 + 震动 + 音效文件
 */

import { Storage } from './utils.js';

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

const shouldVibrate = {
  click: false, success: true, fail: true, swap: false, match: true,
  drop: false, clear: true, move: false, gameover: true, levelup: true,
  flap: false, bounce: false, brick: true, card: false, pair: true,
  hammer: true, math_correct: true, math_wrong: true
};

// 音效文件映射
const soundFiles = {
  drop: 'audio/drop.wav',
  clear: 'audio/clear.wav',
  click: 'audio/click.wav',
  hammer: 'audio/hammer.wav',
  gameover: 'audio/fail.wav',
  levelup: 'audio/win.wav',
  success: 'audio/clear.wav',
  match: 'audio/clear.wav',
  brick: 'audio/hammer.wav',
  pair: 'audio/clear.wav'
};

class AudioManager {
  constructor() {
    // 从 Storage 加载持久化配置（与 GameSettings 共用同一 key）
    const saved = Storage.load('gameSettings') || {};
    this.soundEnabled = saved.soundEnabled !== undefined ? saved.soundEnabled : true;
    this.musicEnabled = saved.musicEnabled !== undefined ? saved.musicEnabled : true;
    this.lastVibrateTime = 0;
    this.minInterval = 100;
    this.bgMusic = null;
    this.bgMusicPlaying = false;
    this.sfxPool = [];
    this.sfxIndex = 0;
    this.poolSize = 5;

    this.initBgMusic();
    this.initSfxPool();
  }

  // 兼容旧 API：enabled 返回 soundEnabled
  get enabled() { return this.soundEnabled; }
  set enabled(v) { this.soundEnabled = v; this.save(); }

  save() {
    const existing = Storage.load('gameSettings') || {};
    Storage.save('gameSettings', {
      ...existing,
      soundEnabled: this.soundEnabled,
      musicEnabled: this.musicEnabled
    });
  }

  initBgMusic() {
    try {
      this.bgMusic = wx.createInnerAudioContext();
      this.bgMusic.loop = true;
      this.bgMusic.volume = 0.3;
      this.bgMusic.src = 'audio/bg.wav';
      this.bgMusic.onError(() => {
        console.log('背景音乐加载失败');
      });
    } catch (e) {}
  }

  initSfxPool() {
    for (let i = 0; i < this.poolSize; i++) {
      try {
        const sfx = wx.createInnerAudioContext();
        sfx.volume = 0.5;
        this.sfxPool.push(sfx);
      } catch (e) {}
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
    this.save();
    if (this.musicEnabled) { this.startBgMusic(); }
    else { this.stopBgMusic(); }
    return this.musicEnabled;
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.save();
    return this.soundEnabled;
  }

  // 兼容旧 API
  toggle() { return this.toggleSound(); }

  play(type) {
    if (!this.soundEnabled) return;

    // 震动反馈
    if (shouldVibrate[type]) {
      const now = Date.now();
      if (now - this.lastVibrateTime > this.minInterval) {
        this.lastVibrateTime = now;
        try {
          if (type === 'gameover' || type === 'math_wrong') {
            wx.vibrateLong();
          } else if (type === 'hammer' || type === 'fail' || type === 'levelup') {
            wx.vibrateShort({ type: 'medium' });
          } else {
            wx.vibrateShort({ type: 'light' });
          }
        } catch (e) {}
      }
    }

    // 音效文件播放
    if (soundFiles[type]) {
      try {
        const sfx = this.sfxPool[this.sfxIndex % this.poolSize];
        this.sfxIndex++;
        sfx.stop();
        sfx.src = soundFiles[type];
        sfx.play();
      } catch (e) {}
    }
  }
}

export const audioManager = new AudioManager();
export const playSound = (type) => audioManager.play(type);
export const toggleSound = () => audioManager.toggleSound();
export const toggleMusic = () => audioManager.toggleMusic();