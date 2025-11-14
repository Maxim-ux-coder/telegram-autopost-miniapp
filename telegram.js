// ===== TELEGRAM WEB APP INITIALIZATION =====

class TelegramApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.user = null;
        this.initData = null;
        this.init();
    }

    init() {
        // Expand app to full height
        this.tg.expand();
        
        // Enable closing confirmation
        this.tg.enableClosingConfirmation();
        
        // Get init data
        this.initData = this.tg.initData;
        this.user = this.tg.initDataUnsafe.user;
        
        // Set theme
        this.applyTheme();
        
        // Setup main button
        this.setupMainButton();
        
        // Setup back button
        this.setupBackButton();
        
        // Listen to theme changes
        this.tg.onEvent('themeChanged', () => this.applyTheme());
        
        // Setup viewport changes
        this.tg.onEvent('viewportChanged', () => this.handleViewportChange());
        
        console.log('Telegram Web App initialized:', {
            version: this.tg.version,
            platform: this.tg.platform,
            user: this.user
        });
    }

    applyTheme() {
        const theme = this.tg.colorScheme;
        document.documentElement.setAttribute('data-theme', theme);
        
        // Apply Telegram theme colors
        const root = document.documentElement;
        const params = this.tg.themeParams;
        
        if (params.bg_color) {
            root.style.setProperty('--bg-primary', params.bg_color);
        }
        if (params.secondary_bg_color) {
            root.style.setProperty('--bg-secondary', params.secondary_bg_color);
        }
        if (params.text_color) {
            root.style.setProperty('--text-primary', params.text_color);
        }
        if (params.hint_color) {
            root.style.setProperty('--text-secondary', params.hint_color);
        }
        if (params.button_color) {
            root.style.setProperty('--accent-primary', params.button_color);
        }
    }

    setupMainButton() {
        this.tg.MainButton.setText('Պլանավորել');
        this.tg.MainButton.color = this.tg.themeParams.button_color;
        this.tg.MainButton.textColor = this.tg.themeParams.button_text_color;
    }

    setupBackButton() {
        this.tg.BackButton.onClick(() => {
            // Handle back button click
            const currentPage = document.querySelector('.page.active');
            if (currentPage && currentPage.id !== 'dashboard-page') {
                this.navigateTo('dashboard');
            } else {
                this.tg.close();
            }
        });
    }

    showMainButton(text, callback) {
        this.tg.MainButton.setText(text);
        this.tg.MainButton.show();
        this.tg.MainButton.onClick(callback);
    }

    hideMainButton() {
        this.tg.MainButton.hide();
        this.tg.MainButton.offClick();
    }

    showBackButton() {
        this.tg.BackButton.show();
    }

    hideBackButton() {
        this.tg.BackButton.hide();
    }

    handleViewportChange() {
        const viewport = this.tg.viewportHeight;
        document.documentElement.style.setProperty('--viewport-height', `${viewport}px`);
    }

    sendData(data) {
        this.tg.sendData(JSON.stringify(data));
    }

    openLink(url, options = {}) {
        this.tg.openLink(url, options);
    }

    openTelegramLink(url) {
        this.tg.openTelegramLink(url);
    }

    showPopup(params) {
        this.tg.showPopup(params);
    }

    showAlert(message) {
        this.tg.showAlert(message);
    }

    showConfirm(message, callback) {
        this.tg.showConfirm(message, callback);
    }

    hapticFeedback(type = 'impact', style = 'medium') {
        if (this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred(style);
        }
    }

    close() {
        this.tg.close();
    }
}

// Initialize Telegram App
const telegramApp = new TelegramApp();
