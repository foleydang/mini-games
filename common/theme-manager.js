/**
 * 主题管理器
 * 提供主题切换、主题保存和主题预览功能
 */

import { ModernThemes } from './modern-ui.js';
import { Storage } from './utils.js';

export class ThemeManager {
  constructor() {
    this.currentTheme = 'default';
    this.currentGameTheme = 'match3';
    this.themes = ModernThemes;
    
    // 加载保存的主题
    this.loadSavedTheme();
  }
  
  /**
   * 加载保存的主题设置
   */
  loadSavedTheme() {
    const savedTheme = Storage.load('theme');
    if (savedTheme) {
      this.currentTheme = savedTheme;
    }
    
    const savedGameTheme = Storage.load('game_theme');
    if (savedGameTheme) {
      this.currentGameTheme = savedGameTheme;
    }
  }
  
  /**
   * 切换主题
   * @param {string} themeName - 主题名称
   */
  setTheme(themeName) {
    this.currentTheme = themeName;
    Storage.save('theme', themeName);
    return this.getCurrentTheme();
  }
  
  /**
   * 切换游戏主题
   * @param {string} gameThemeName - 游戏主题名称
   */
  setGameTheme(gameThemeName) {
    this.currentGameTheme = gameThemeName;
    Storage.save('game_theme', gameThemeName);
    return this.getCurrentGameTheme();
  }
  
  /**
   * 获取当前主题
   */
  getCurrentTheme() {
    if (this.currentTheme === 'default') {
      return ModernThemes.primary;
    }
    return ModernThemes.themePresets[this.currentTheme] || ModernThemes.primary;
  }
  
  /**
   * 获取当前游戏主题
   */
  getCurrentGameTheme() {
    return ModernThemes.gameThemes[this.currentGameTheme] || ModernThemes.gameThemes.match3;
  }
  
  /**
   * 获取所有可用主题
   */
  getAllThemes() {
    return [
      { id: 'default', name: '默认', icon: '🌟' },
      { id: 'dark', name: '深色', icon: '🌙' },
      { id: 'purple', name: '深紫', icon: '💜' },
      { id: 'green', name: '深绿', icon: '🌿' },
      { id: 'orange', name: '深橙', icon: '🍊' }
    ];
  }
  
  /**
   * 获取所有游戏主题
   */
  getAllGameThemes() {
    return Object.keys(ModernThemes.gameThemes).map(key => ({
      id: key,
      name: ModernThemes.gameThemes[key].themeName,
      icon: this.getGameThemeIcon(key)
    }));
  }
  
  /**
   * 获取游戏主题图标
   */
  getGameThemeIcon(gameId) {
    const iconMap = {
      match3: '💎',
      snake: '🐍',
      breakout: '🧱',
      bounce: '⚽',
      fruit: '🍎',
      memory: '🧠',
      sheep: '🐑',
      tetris: '🧩'
    };
    return iconMap[gameId] || '🎮';
  }
  
  /**
   * 应用主题到元素
   */
  applyThemeToElement(element, theme) {
    if (theme) {
      element.style.setProperty('--theme-primary', theme.primary);
      element.style.setProperty('--theme-secondary', theme.secondary);
      element.style.setProperty('--theme-bg', theme.bg);
      element.style.setProperty('--theme-surface', theme.surface);
      element.style.setProperty('--theme-text', theme.text);
      element.style.setProperty('--theme-text-secondary', theme.textSecondary);
    }
  }
}

// 创建全局主题管理器实例
export const themeManager = new ThemeManager();