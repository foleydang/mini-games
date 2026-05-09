import { sys } from 'cc';

export class ShareManager {
    // 分享当前游戏成绩
    static shareGame(gameName: string, score: number) {
        if (sys.platform === sys.Platform.WECHAT_GAME) {
            // @ts-ignore
            wx.shareAppMessage({
                title: `我在${gameName}得了${score}分，来挑战我吧！`,
                imageUrl: '', // 可以设置分享图片
                query: `game=${gameName}&score=${score}`
            });
        }
    }
    
    // 获取分享参数
    static getShareQuery(): { game?: string; score?: number } {
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
    }
    
    // 邀请好友
    static inviteFriend() {
        if (sys.platform === sys.Platform.WECHAT_GAME) {
            // @ts-ignore
            wx.shareAppMessage({
                title: '来和我一起玩小游戏合集吧！',
                imageUrl: ''
            });
        }
    }
}
