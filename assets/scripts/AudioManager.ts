import { AudioClip, AudioSource, resources } from 'cc';

export class AudioManager {
    private static instance: AudioManager;
    private audioSource: AudioSource;
    private soundEnabled: boolean = true;
    
    static getInstance(): AudioManager {
        if (!this.instance) {
            this.instance = new AudioManager();
        }
        return this.instance;
    }
    
    init(audioSource: AudioSource) {
        this.audioSource = audioSource;
    }
    
    playSound(name: string) {
        if (!this.soundEnabled) return;
        // 播放音效（预留，需要添加音频资源）
        console.log('播放音效:', name);
    }
    
    playBGM(name: string) {
        if (!this.soundEnabled) return;
        console.log('播放背景音乐:', name);
    }
    
    setSoundEnabled(enabled: boolean) {
        this.soundEnabled = enabled;
    }
}
