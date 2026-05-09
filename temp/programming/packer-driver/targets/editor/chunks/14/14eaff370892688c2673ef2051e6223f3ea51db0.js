System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, sys, ScoreManager, _crd;

  _export("ScoreManager", void 0);

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      sys = _cc.sys;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "b765eY41YhHXbHfyN4XFJ/1", "ScoreManager", undefined);

      __checkObsolete__(['sys']);

      _export("ScoreManager", ScoreManager = class ScoreManager {
        // 获取游戏最高分
        static getHighScore(gameId) {
          const scores = this.getAllScores();
          return scores[gameId] || 0;
        } // 保存游戏最高分


        static saveHighScore(gameId, score) {
          const scores = this.getAllScores();

          if (score > (scores[gameId] || 0)) {
            scores[gameId] = score;
            sys.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(scores));
          }
        } // 获取所有游戏分数


        static getAllScores() {
          const data = sys.localStorage.getItem(this.STORAGE_KEY);
          return data ? JSON.parse(data) : {};
        } // 获取排名


        static getRanking() {
          const scores = this.getAllScores();
          return Object.entries(scores).map(([game, score]) => ({
            game,
            score
          })).sort((a, b) => b.score - a.score);
        }

      });

      ScoreManager.STORAGE_KEY = 'game_scores';

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=14eaff370892688c2673ef2051e6223f3ea51db0.js.map