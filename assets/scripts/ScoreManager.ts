import { sys } from 'cc';

export class ScoreManager {
    private static readonly STORAGE_KEY = 'game_scores';
    
    // 获取游戏最高分
    static getHighScore(gameId: string): number {
        const scores = this.getAllScores();
        return scores[gameId] || 0;
    }
    
    // 保存游戏最高分
    static saveHighScore(gameId: string, score: number) {
        const scores = this.getAllScores();
        if (score > (scores[gameId] || 0)) {
            scores[gameId] = score;
            sys.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(scores));
        }
    }
    
    // 获取所有游戏分数
    private static getAllScores(): { [key: string]: number } {
        const data = sys.localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    }
    
    // 获取排名
    static getRanking(): { game: string; score: number }[] {
        const scores = this.getAllScores();
        return Object.entries(scores)
            .map(([game, score]) => ({ game, score }))
            .sort((a, b) => b.score - a.score);
    }
}
