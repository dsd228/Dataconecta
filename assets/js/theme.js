// theme.js - Enhanced Theme Management System

class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.createThemeToggle();
        this.setupEventListeners();
        this.announceThemeChange();
    }

    getSystemTheme() {
        if (this.darkModeMediaQuery) {
            return this.darkModeMediaQuery.matches ? 'dark' : 'light';
        }
        return 'light';
    }

    getStoredTheme() {
        try {
            return localStorage.getItem('dataconecta-theme');
        } catch (e) {
            console.warn('localStorage not available, using system theme');
            return null;
        }
    }

    setStoredTheme(theme) {
        try {
            localStorage.setItem('dataconecta-theme', theme);
        } catch (e) {
            console.warn('Could not store theme preference');
        }
    }

    applyTheme(theme) {
        document.body.classList.remove('dark-mode', 'light-mode');
        document.body.classList.add(`${theme}-mode`);
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.setStoredTheme(theme);
        this.updateThemeToggle();
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        this.announceThemeChange();
    }

    createThemeToggle() {
        if (document.querySelector('.theme-toggle')) return;

        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle btn btn-outline-secondary ms-2';
        toggle.setAttribute('aria-label', 'Toggle theme');
        toggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
        
        // Insert into navbar
        const navbar = document.querySelector('.navbar-nav');
        if (navbar) {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.appendChild(toggle);
            navbar.appendChild(li);
        }
    }

    updateThemeToggle() {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            const icon = this.currentTheme === 'dark' ? 'bi-sun-fill' : 'bi-moon-fill';
            toggle.innerHTML = `<i class="bi ${icon}"></i>`;
            toggle.setAttribute('aria-label', `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`);
        }
    }

    setupEventListeners() {
        // Listen for system theme changes
        this.darkModeMediaQuery.addEventListener('change', (e) => {
            if (!this.getStoredTheme()) {
                this.applyTheme(e.matches ? 'dark' : 'light');
                this.announceThemeChange();
            }
        });

        // Theme toggle click handler
        document.addEventListener('click', (e) => {
            if (e.target.closest('.theme-toggle')) {
                this.toggleTheme();
            }
        });

        // Keyboard shortcut (Ctrl/Cmd + Shift + T)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    announceThemeChange() {
        // Announce theme change for screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = `Theme changed to ${this.currentTheme} mode`;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: this.currentTheme }
        }));
    }
}

// Initialize theme manager when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager = new ThemeManager();
    });
} else {
    window.themeManager = new ThemeManager();
}