System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, sys, StorageManager, _crd;

  _export("StorageManager", void 0);

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      sys = _cc.sys;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "f84e2fXVZdH16aSCNKHwQ8s", "StorageManager", undefined);

      /**
       * 本地存储管理器 - 处理用户数据、游戏进度、签到记录
       */
      __checkObsolete__(['sys']);

      _export("StorageManager", StorageManager = class StorageManager {
        /**
         * 获取用户数据
         */
        static getUserData() {
          try {
            const data = sys.localStorage.getItem(this.USER_DATA_KEY);

            if (data) {
              return JSON.parse(data);
            }
          } catch (e) {
            console.error('读取用户数据失败', e);
          }

          return this.getDefaultUserData();
        }
        /**
         * 保存用户数据
         */


        static saveUserData(data) {
          try {
            sys.localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(data));
          } catch (e) {
            console.error('保存用户数据失败', e);
          }
        }
        /**
         * 获取默认用户数据
         */


        static getDefaultUserData() {
          return {
            coins: 0,
            level: 1,
            exp: 0,
            lastSign: '',
            signDays: 0,
            totalSignDays: 0,
            achievements: [],
            gameRecords: {}
          };
        }
        /**
         * 获取关卡进度
         */


        static getLevelProgress(gameId) {
          try {
            const data = sys.localStorage.getItem(this.LEVEL_DATA_KEY + gameId);

            if (data) {
              return JSON.parse(data);
            }
          } catch (e) {
            console.error('读取关卡进度失败', e);
          }

          return {
            current: 1,
            unlocked: [1],
            scores: {},
            highScore: 0
          };
        }
        /**
         * 保存关卡进度
         */


        static saveLevelProgress(gameId, progress) {
          try {
            sys.localStorage.setItem(this.LEVEL_DATA_KEY + gameId, JSON.stringify(progress));
          } catch (e) {
            console.error('保存关卡进度失败', e);
          }
        }
        /**
         * 是否可以签到
         */


        static canSignIn() {
          const userData = this.getUserData();
          const today = new Date().toDateString();
          return userData.lastSign !== today;
        }
        /**
         * 执行签到
         */


        static doSignIn() {
          const userData = this.getUserData();

          if (!this.canSignIn()) {
            return {
              success: false
            };
          }

          const today = new Date().toDateString();
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          let newSignDays = userData.lastSign === yesterday ? userData.signDays + 1 : 1;
          if (newSignDays > 7) newSignDays = 1;
          const rewards = [{
            day: 1,
            coins: 10,
            icon: '🎁'
          }, {
            day: 2,
            coins: 20,
            icon: '💎'
          }, {
            day: 3,
            coins: 30,
            icon: '✨'
          }, {
            day: 4,
            coins: 50,
            icon: '🌟'
          }, {
            day: 5,
            coins: 80,
            icon: '💫'
          }, {
            day: 6,
            coins: 100,
            icon: '🔮'
          }, {
            day: 7,
            coins: 200,
            icon: '👑'
          }];
          const reward = rewards[newSignDays - 1];
          userData.lastSign = today;
          userData.signDays = newSignDays;
          userData.totalSignDays++;
          userData.coins += reward.coins;
          userData.exp += 5;
          this.saveUserData(userData);
          return {
            success: true,
            reward
          };
        }
        /**
         * 记录游戏游玩
         */


        static recordGamePlay(gameId) {
          const userData = this.getUserData();

          if (!userData.gameRecords[gameId]) {
            userData.gameRecords[gameId] = {
              plays: 0,
              highScore: 0
            };
          }

          userData.gameRecords[gameId].plays++;
          this.saveUserData(userData);
        }
        /**
         * 更新最高分
         */


        static updateHighScore(gameId, score) {
          const userData = this.getUserData();
          const progress = this.getLevelProgress(gameId);

          if (!userData.gameRecords[gameId]) {
            userData.gameRecords[gameId] = {
              plays: 0,
              highScore: 0
            };
          }

          if (score > userData.gameRecords[gameId].highScore) {
            userData.gameRecords[gameId].highScore = score;
          }

          if (score > progress.highScore) {
            progress.highScore = score;
          } // 增加金币和经验


          userData.coins += Math.floor(score / 10);
          userData.exp += score;
          this.saveUserData(userData);
          this.saveLevelProgress(gameId, progress);
        }

      });
      /**
       * 用户数据类型
       */


      StorageManager.USER_DATA_KEY = 'yanten_user_data';
      StorageManager.LEVEL_DATA_KEY = 'yanten_level_';

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=4f0c1bf556bace6d3c51049162c1da5e9f0e520c.js.map