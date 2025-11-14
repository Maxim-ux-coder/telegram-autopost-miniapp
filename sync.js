// ===== BOT SYNC MODULE =====

const BOT_API_URL = 'https://your-bot-server.com/api'; // Replace with your bot server URL

class BotSync {
    constructor() {
        this.userId = null;
        this.initData = null;
        this.isConnected = false;
    }

    async init(userId, initData) {
        this.userId = userId;
        this.initData = initData;
        
        try {
            await this.testConnection();
            this.isConnected = true;
            console.log('Bot sync initialized');
        } catch (error) {
            console.error('Bot sync initialization failed:', error);
            this.isConnected = false;
        }
    }

    async testConnection() {
        const response = await fetch(`${BOT_API_URL}/ping`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': this.initData
            },
            body: JSON.stringify({
                user_id: this.userId
            })
        });

        if (!response.ok) {
            throw new Error('Connection test failed');
        }

        return await response.json();
    }

    async request(endpoint, data = {}) {
        try {
            const response = await fetch(`${BOT_API_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.initData
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    ...data
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }

            return result.data;

        } catch (error) {
            console.error(`Sync error (${endpoint}):`, error);
            throw error;
        }
    }
}

const botSync = new BotSync();

// ===== API METHODS =====

async function syncWithBot(action, data) {
    return await botSync.request(action, data);
}

// Initialize sync
async function initBotSync() {
    const user = telegramApp.user;
    const initData = telegramApp.initData;
    
    await botSync.init(user.id, initData);
}

// Call on app start
setTimeout(initBotSync, 100);