// ===== BOT SYNC MODULE (Complete localStorage Version) =====

class BotSync {
    constructor() {
        this.userId = null;
        this.initData = null;
        this.isConnected = false;
        this.storageKey = 'autopost_data';
    }

    async init(userId, initData) {
        this.userId = userId;
        this.initData = initData;
        this.storageKey = `autopost_${userId}`;
        
        // Initialize empty storage if not exists
        if (!localStorage.getItem(this.storageKey)) {
            const initialData = {
                channels: [],
                scheduled: [],
                recurring: [],
                drafts: [],
                stats: {
                    sent_total: 0,
                    is_subscribed: true,
                    is_admin: false
                }
            };
            localStorage.setItem(this.storageKey, JSON.stringify(initialData));
            console.log('✅ Initialized new storage for user:', userId);
        }
        
        this.isConnected = true;
        console.log('✅ Bot sync initialized (localStorage mode)');
        return true;
    }

    getStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {
                channels: [],
                scheduled: [],
                recurring: [],
                drafts: [],
                stats: { sent_total: 0, is_subscribed: true, is_admin: false }
            };
        } catch (error) {
            console.error('❌ Storage read error:', error);
            return {
                channels: [],
                scheduled: [],
                recurring: [],
                drafts: [],
                stats: { sent_total: 0, is_subscribed: true, is_admin: false }
            };
        }
    }

    saveStorage(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            console.log('💾 Storage saved successfully');
            return true;
        } catch (error) {
            console.error('❌ Storage save error:', error);
            return false;
        }
    }

    async testConnection() {
        return { success: true, message: 'localStorage mode active' };
    }

    async request(endpoint, data = {}) {
        console.log(`📤 Request: ${endpoint}`, data);
        
        try {
            const storage = this.getStorage();
            let result;

            switch(endpoint) {
                case 'get_user_data':
                    result = {
                        success: true,
                        data: {
                            channels: storage.channels || [],
                            scheduled: storage.scheduled || [],
                            recurring: storage.recurring || [],
                            drafts: storage.drafts || [],
                            stats: storage.stats || {
                                sent_total: 0,
                                is_subscribed: true,
                                is_admin: false
                            }
                        }
                    };
                    break;

                case 'schedule_message':
                    const scheduleId = `s${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
                    const scheduledMsg = {
                        id: scheduleId,
                        content: data.content || '',
                        datetime: data.datetime || '',
                        channel_id: data.channel_id || '',
                        created_at: new Date().toISOString()
                    };
                    
                    if (!storage.scheduled) storage.scheduled = [];
                    storage.scheduled.push(scheduledMsg);
                    this.saveStorage(storage);
                    
                    result = { success: true, data: { id: scheduleId } };
                    console.log('✅ Message scheduled:', scheduleId);
                    break;

                case 'create_recurring':
                    const recurringId = `r${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
                    const recurringMsg = {
                        id: recurringId,
                        content: data.content || '',
                        recurring: data.recurring || {},
                        channel_id: data.channel_id || '',
                        active: true,
                        created_at: new Date().toISOString(),
                        cron: this.convertToCron(data.recurring)
                    };
                    
                    if (!storage.recurring) storage.recurring = [];
                    storage.recurring.push(recurringMsg);
                    this.saveStorage(storage);
                    
                    result = { success: true, data: { id: recurringId } };
                    console.log('✅ Recurring message created:', recurringId);
                    break;

                case 'delete_message':
                    const { message_id, type } = data;
                    
                    if (type === 'scheduled' && storage.scheduled) {
                        storage.scheduled = storage.scheduled.filter(m => m.id !== message_id);
                        console.log('🗑️ Deleted scheduled:', message_id);
                    } else if (type === 'recurring' && storage.recurring) {
                        storage.recurring = storage.recurring.filter(m => m.id !== message_id);
                        console.log('🗑️ Deleted recurring:', message_id);
                    }
                    
                    this.saveStorage(storage);
                    result = { success: true };
                    break;

                case 'disconnect_channel':
                    storage.channels = [];
                    this.saveStorage(storage);
                    result = { success: true };
                    console.log('🔌 Channel disconnected');
                    break;

                case 'save_draft':
                    const draftId = `d${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
                    const draft = {
                        id: draftId,
                        content: data.content || '',
                        created_at: new Date().toISOString()
                    };
                    
                    if (!storage.drafts) storage.drafts = [];
                    storage.drafts.push(draft);
                    this.saveStorage(storage);
                    
                    result = { success: true, data: { id: draftId } };
                    console.log('✅ Draft saved:', draftId);
                    break;

                default:
                    console.warn('⚠️ Unknown endpoint:', endpoint);
                    result = { success: false, error: 'Unknown endpoint' };
            }

            return result.data || result;

        } catch (error) {
            console.error(`❌ Sync error (${endpoint}):`, error);
            throw error;
        }
    }

    convertToCron(recurring) {
        if (!recurring || !recurring.type) return '0 12 * * *';
        
        const { type, time, days } = recurring;
        const [hour = '12', minute = '0'] = (time || '12:00').split(':');
        
        switch(type) {
            case 'daily':
                return `${minute} ${hour} * * *`;
            case 'weekly':
                return `${minute} ${hour} * * 1`;
            case 'monthly':
                return `${minute} ${hour} 1 * *`;
            case 'custom':
                const daysList = days && days.length ? days.join(',') : '*';
                return `${minute} ${hour} * * ${daysList}`;
            default:
                return `${minute} ${hour} * * *`;
        }
    }
}

const botSync = new BotSync();

// ===== API METHODS =====

async function syncWithBot(action, data) {
    try {
        return await botSync.request(action, data);
    } catch (error) {
        console.error('Sync error:', error);
        throw error;
    }
}

// Initialize sync
async function initBotSync() {
    try {
        const user = telegramApp.user;
        const initData = telegramApp.initData;
        
        if (!user || !user.id) {
            console.warn('⚠️ No user data - using demo user');
            await botSync.init('demo_123456', '');
        } else {
            await botSync.init(user.id, initData);
        }
        
        console.log('✅ Sync initialized successfully');
    } catch (error) {
        console.error('❌ Sync initialization failed:', error);
    }
}

// Call on app start
setTimeout(initBotSync, 100);
