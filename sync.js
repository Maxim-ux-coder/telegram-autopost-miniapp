class BotSync {
    constructor() {
        this.userId = null;
        this.initData = null;
        this.isConnected = false;
        this.useLocalStorage = true; // GitHub Pages mode
    }

    async init(userId, initData) {
        this.userId = userId;
        this.initData = initData;
        
        console.log('🟡 Bot sync - Frontend Only Mode (No Backend)');
        console.log('📝 Data will be stored in browser only');
        
        // Load data from localStorage
        this.loadFromLocalStorage();
        this.isConnected = true;
        
        return true;
    }

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem(`autopost_${this.userId}`);
            if (data) {
                const parsed = JSON.parse(data);
                console.log('✅ Loaded data from localStorage:', parsed);
            }
        } catch (error) {
            console.error('❌ localStorage error:', error);
        }
    }

    async testConnection() {
        // No backend available
        console.log('⚠️ Backend not available - using localStorage');
        return { success: true, message: 'Frontend only mode' };
    }

    async request(endpoint, data = {}) {
        console.log(`📤 Request: ${endpoint}`, data);
        
        // Simulate backend with localStorage
        try {
            const storageKey = `autopost_${this.userId}`;
            let storage = JSON.parse(localStorage.getItem(storageKey) || '{}');
            
            switch(endpoint) {
                case 'get_user_data':
                    return this.handleGetUserData(storage);
                
                case 'schedule_message':
                    return this.handleScheduleMessage(storage, data);
                
                case 'create_recurring':
                    return this.handleCreateRecurring(storage, data);
                
                case 'delete_message':
                    return this.handleDeleteMessage(storage, data);
                
                case 'disconnect_channel':
                    return this.handleDisconnectChannel(storage);
                
                case 'save_draft':
                    return this.handleSaveDraft(storage, data);
                
                default:
                    console.warn('⚠️ Unknown endpoint:', endpoint);
                    return { success: false, error: 'Unknown endpoint' };
            }
        } catch (error) {
            console.error(`❌ Sync error (${endpoint}):`, error);
            throw error;
        }
    }

    handleGetUserData(storage) {
        return {
            channels: storage.channels || [],
            scheduled: storage.scheduled || [],
            recurring: storage.recurring || [],
            drafts: storage.drafts || [],
            stats: {
                sent_total: storage.stats?.sent || 0,
                is_subscribed: true,
                is_admin: false
            }
        };
    }

    handleScheduleMessage(storage, data) {
        if (!storage.scheduled) storage.scheduled = [];
        
        const id = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const message = {
            id,
            content: data.content,
            datetime: data.datetime,
            channel_id: data.channel_id,
            created_at: new Date().toISOString()
        };
        
        storage.scheduled.push(message);
        this.saveToLocalStorage(storage);
        
        return { id };
    }

    handleCreateRecurring(storage, data) {
        if (!storage.recurring) storage.recurring = [];
        
        const id = `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const message = {
            id,
            content: data.content,
            channel_id: data.channel_id,
            recurring: data.recurring,
            active: true,
            created_at: new Date().toISOString()
        };
        
        storage.recurring.push(message);
        this.saveToLocalStorage(storage);
        
        return { id };
    }

    handleDeleteMessage(storage, data) {
        const { message_id, type } = data;
        
        if (type === 'scheduled' && storage.scheduled) {
            storage.scheduled = storage.scheduled.filter(m => m.id !== message_id);
        } else if (type === 'recurring' && storage.recurring) {
            storage.recurring = storage.recurring.filter(m => m.id !== message_id);
        }
        
        this.saveToLocalStorage(storage);
        return { success: true };
    }

    handleDisconnectChannel(storage) {
        storage.channels = [];
        this.saveToLocalStorage(storage);
        return { success: true };
    }

    handleSaveDraft(storage, data) {
        if (!storage.drafts) storage.drafts = [];
        
        const id = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        storage.drafts.push({
            id,
            content: data.content,
            created_at: new Date().toISOString()
        });
        
        this.saveToLocalStorage(storage);
        return { id };
    }

    saveToLocalStorage(storage) {
        try {
            const storageKey = `autopost_${this.userId}`;
            localStorage.setItem(storageKey, JSON.stringify(storage));
            console.log('💾 Saved to localStorage');
        } catch (error) {
            console.error('❌ Save error:', error);
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
    
    if (!user) {
        console.warn('⚠️ No user data - using demo mode');
        await botSync.init('demo_user', '');
    } else {
        await botSync.init(user.id, initData);
    }
}

// Call on app start
setTimeout(initBotSync, 100);
