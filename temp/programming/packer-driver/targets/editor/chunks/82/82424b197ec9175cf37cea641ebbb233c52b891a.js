System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, AudioManager, _crd;

  _export("AudioManager", void 0);

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "18d4fzFxfxDrZcuRfZe6mH7", "AudioManager", undefined);

      __checkObsolete__(['AudioClip', 'AudioSource', 'resources']);

      _export("AudioManager", AudioManager = class AudioManager {
        constructor() {
          this.audioSource = void 0;
          this.soundEnabled = true;
        }

        static getInstance() {
          if (!this.instance) {
            this.instance = new AudioManager();
          }

          return this.instance;
        }

        init(audioSource) {
          this.audioSource = audioSource;
        }

        playSound(name) {
          if (!this.soundEnabled) return; // 播放音效（预留，需要添加音频资源）

          console.log('播放音效:', name);
        }

        playBGM(name) {
          if (!this.soundEnabled) return;
          console.log('播放背景音乐:', name);
        }

        setSoundEnabled(enabled) {
          this.soundEnabled = enabled;
        }

      });

      AudioManager.instance = void 0;

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=82424b197ec9175cf37cea641ebbb233c52b891a.js.map