System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, sys, ShareManager, _crd;

  _export("ShareManager", void 0);

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      sys = _cc.sys;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "7dfefS+ym1KQoMfMoUl4Y0h", "ShareManager", undefined);

      __checkObsolete__(['sys']);

      _export("ShareManager", ShareManager = class ShareManager {
        // 分享当前游戏成绩
        static shareGame(gameName, score) {
          if (sys.platform === sys.Platform.WECHAT_GAME) {
            // @ts-ignore
            wx.shareAppMessage({
              title: `我在${gameName}得了${score}分，来挑战我吧！`,
              imageUrl: '',
              // 可以设置分享图片
              query: `game=${gameName}&score=${score}`
            });
          }
        } // 获取分享参数


        static getShareQuery() {
          if (sys.platform === sys.Platform.WECHAT_GAME) {
            // @ts-ignore
            const options = wx.getLaunchOptionsSync();
            const query = options.query || {};
            return {
              game: query.game,
              score: parseInt(query.score) || 0
            };
          }

          return {};
        } // 邀请好友


        static inviteFriend() {
          if (sys.platform === sys.Platform.WECHAT_GAME) {
            // @ts-ignore
            wx.shareAppMessage({
              title: '来和我一起玩小游戏合集吧！',
              imageUrl: ''
            });
          }
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=6e50af6251b3cee823a8706e274113eae0820cc0.js.map