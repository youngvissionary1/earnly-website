// Theme Management System
class ThemeManager {
  constructor() {
    this.themes = {
      default: {
        name: 'Default Dark',
        primary: '#6366f1',
        secondary: '#10b981',
        accent: '#f59e0b',
        danger: '#ef4444'
      },
      purple: {
        name: 'Purple Night',
        primary: '#8b5cf6',
        secondary: '#06b6d4',
        accent: '#f59e0b',
        danger: '#ef4444'
      },
      green: {
        name: 'Forest Green',
        primary: '#059669',
        secondary: '#0891b2',
        accent: '#d97706',
        danger: '#dc2626'
      },
      blue: {
        name: 'Ocean Blue',
        primary: '#0ea5e9',
        secondary: '#06b6d4',
        accent: '#f59e0b',
        danger: '#ef4444'
      },
      red: {
        name: 'Crimson Red',
        primary: '#dc2626',
        secondary: '#059669',
        accent: '#d97706',
        danger: '#b91c1c'
      }
    };
    
    this.currentTheme = localStorage.getItem('earnly_theme') || 'default';
    this.applyTheme(this.currentTheme);
  }

  getThemes() {
    return this.themes;
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  applyTheme(themeKey) {
    if (!this.themes[themeKey]) {
      themeKey = 'default';
    }

    const theme = this.themes[themeKey];
    const root = document.documentElement;

    // Apply CSS custom properties
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--danger', theme.danger);

    // Update current theme
    this.currentTheme = themeKey;
    localStorage.setItem('earnly_theme', themeKey);
  }

  switchTheme(themeKey) {
    this.applyTheme(themeKey);
  }
}

// Create global theme manager instance
const themeManager = new ThemeManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}