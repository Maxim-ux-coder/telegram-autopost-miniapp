// ===== CHANNEL CONNECTION FIX =====
// Ավելացրեք app.js-ի սկզբում

// Helper function to add test channel (demo mode)
function addTestChannel(userId) {
    const storageKey = `autopost_${userId}`;
    const storage = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    if (!storage.channels || storage.channels.length === 0) {
        storage.channels = [{
            id: '@test_channel',
            title: 'Test Channel',
            username: 'test_channel',
            subscribers: 0,
            posts: 0,
            scheduled: 0,
            sent_total: 0
        }];
        
        localStorage.setItem(storageKey, JSON.stringify(storage));
        console.log('✅ Test channel added');
    }
}

// Fix channel connection handler
async function channel_connect_handler_fixed(update, context) {
    const user_id = update.message?.from_user?.id || telegramApp.user?.id || 'demo_123456';
    const text = (update.message?.text || '').trim();
    
    console.log('📝 Channel input:', text);
    
    // For demo mode, accept any input
    const channelId = text.startsWith('@') ? text : `@${text}`;
    
    const storageKey = `autopost_${user_id}`;
    const storage = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    // Add channel
    storage.channels = [{
        id: channelId,
        title: channelId.replace('@', ''),
        username: channelId.replace('@', ''),
        subscribers: 0,
        posts: 0,
        scheduled: 0,
        sent_total: 0
    }];
    
    localStorage.setItem(storageKey, JSON.stringify(storage));
    
    console.log('✅ Channel connected:', channelId);
    
    // Show success message
    showToast('success', 'Հաջողություն', `Ալիքը կապակցված է: ${channelId}`);
    
    // Reload user data
    await loadUserData();
    
    return true;
}

// Fix loadUserData to ensure it reads from localStorage
async function loadUserData() {
    try {
        const userId = AppState.user?.id || 'demo_123456';
        
        // Get data from localStorage via syncWithBot
        const data = await syncWithBot('get_user_data', {
            user_id: userId
        });
        
        console.log('📊 Loaded user data:', data);
        
        AppState.channels = data.channels || [];
        AppState.scheduledMessages = data.scheduled || [];
        AppState.recurringMessages = data.recurring || [];
        AppState.drafts = data.drafts || [];
        AppState.stats = data.stats || {};
        
        updateUserInfo();
        
        console.log('✅ User data loaded successfully');
        console.log('  - Channels:', AppState.channels.length);
        console.log('  - Scheduled:', AppState.scheduledMessages.length);
        console.log('  - Recurring:', AppState.recurringMessages.length);
        
    } catch (error) {
        console.error('❌ Load user data error:', error);
        
        // Initialize with empty data
        AppState.channels = [];
        AppState.scheduledMessages = [];
        AppState.recurringMessages = [];
        AppState.drafts = [];
        AppState.stats = { sent_total: 0 };
        
        throw error;
    }
}

// Fix handleMessageSubmit to use correct data structure
async function handleMessageSubmit(e) {
    e.preventDefault();
    
    const modal = document.getElementById('message-modal');
    const type = modal.dataset.type;
    const content = document.getElementById('message-content').value.trim();
    
    if (!content) {
        showToast('warning', 'Ուշադրություն', 'Մուտքագրեք նամակի տեքստը');
        return;
    }
    
    // Validate channel connection
    if (AppState.channels.length === 0) {
        showToast('warning', 'Ուշադրություն', 'Նախ միացրեք ալիք');
        return;
    }
    
    try {
        const messageData = {
            content,
            channel_id: AppState.channels[0].id,
            user_id: AppState.user?.id || 'demo_123456'
        };
        
        if (type === 'scheduled') {
            const date = document.getElementById('schedule-date').value;
            const time = document.getElementById('schedule-time').value;
            
            if (!date || !time) {
                showToast('warning', 'Ուշադրություն', 'Ընտրեք ամսաթիվ և ժամ');
                return;
            }
            
            messageData.datetime = `${date} ${time}`;
            
            console.log('📅 Scheduling message:', messageData);
            const result = await syncWithBot('schedule_message', messageData);
            console.log('✅ Scheduled:', result);
            
            showToast('success', 'Հաջողություն', 'Նամակը պլանավորված է');
            
        } else if (type === 'recurring') {
            const recurringData = getRecurringSettings();
            
            if (!recurringData) {
                showToast('warning', 'Ուշադրություն', 'Ընտրեք կրկնության ռեժիմ');
                return;
            }
            
            messageData.recurring = recurringData;
            
            console.log('🔄 Creating recurring:', messageData);
            const result = await syncWithBot('create_recurring', messageData);
            console.log('✅ Created:', result);
            
            showToast('success', 'Հաջողություն', 'Կրկնվող նամակը ստեղծված է');
            
        } else if (type === 'draft') {
            console.log('📝 Saving draft:', messageData);
            const result = await syncWithBot('save_draft', messageData);
            console.log('✅ Saved:', result);
            
            showToast('success', 'Հաջողություն', 'Սևագիրը պահպանված է');
        }
        
        closeModal();
        
        // Reload data
        await loadUserData();
        await loadPageData(AppState.currentPage);
        updateStats();
        
        telegramApp.hapticFeedback('success');
        
    } catch (error) {
        console.error('❌ Submit message error:', error);
        showToast('error', 'Սխալ', 'Չհաջողվեց պահպանել նամակը');
    }
}

// Add this to your existing button_handler in app.js
// Find the 'connect_channel' case and replace it with:

/*

*/

console.log('✅ Channel connection fixes loaded');

// ===== GLOBAL STATE =====
const AppState = {
    currentPage: 'dashboard',
    user: null,
    channels: [],
    scheduledMessages: [],
    recurringMessages: [],
    drafts: [],
    stats: {},
    filters: {},
    isLoading: false
};

// ===== INITIALIZE APP =====
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

async function initializeApp() {
    try {
        showLoading();
        
        // Get user data from Telegram
        AppState.user = telegramApp.user;
        
        // Load user data from bot
        await loadUserData();
        
        // Setup UI
        setupUI();
        
        // Load initial data
        await loadDashboardData();
        
        hideLoading();
        showApp();
        
        // Show success message
        showToast('success', 'Բարի գալուստ!', `Ողջույն, ${AppState.user.first_name}!`);
        
    } catch (error) {
        console.error('App initialization error:', error);
        showToast('error', 'Սխալ', 'Չհաջողվեց բեռնել հավելվածը');
        hideLoading();
    }
}

// ===== LOADING =====
function showLoading() {
    document.getElementById('loading-screen').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-screen').style.display = 'none';
}

function showApp() {
    document.getElementById('app').classList.remove('hidden');
}

// ===== USER DATA =====
async function loadUserData() {
    try {
        const data = await syncWithBot('get_user_data', {
            user_id: AppState.user.id
        });
        
        AppState.channels = data.channels || [];
        AppState.scheduledMessages = data.scheduled || [];
        AppState.recurringMessages = data.recurring || [];
        AppState.drafts = data.drafts || [];
        AppState.stats = data.stats || {};
        
        updateUserInfo();
        
    } catch (error) {
        console.error('Load user data error:', error);
        throw error;
    }
}

function updateUserInfo() {
    const user = AppState.user;
    
    // User initials
    const initials = (user.first_name[0] || '') + (user.last_name?.[0] || '');
    document.getElementById('user-initials').textContent = initials;
    
    // User name
    const fullName = `${user.first_name} ${user.last_name || ''}`.trim();
    document.getElementById('user-name').textContent = fullName;
    
    // User status (check subscription)
    const isSubscribed = AppState.stats.is_subscribed || false;
    document.getElementById('user-status').textContent = isSubscribed ? 'Բաժանորդ ✅' : 'Ոչ բաժանորդ';
}

// ===== UI SETUP =====
function setupUI() {
    // Menu toggle
    document.getElementById('menu-btn').addEventListener('click', toggleMenu);
    
    // Settings
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    
    // Notifications
    document.getElementById('notifications-btn').addEventListener('click', openNotifications);
    
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Menu navigation
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
            closeMenu();
        });
    });
    
    // Action buttons
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', handleAction);
    });
    
    // FAB
    document.getElementById('fab').addEventListener('click', () => {
        openNewMessageModal('scheduled');
    });
    
    // Modal close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    });
    
    // Form submit
    document.getElementById('message-form').addEventListener('submit', handleMessageSubmit);
    
    // Text formatting
    document.querySelectorAll('.toolbar-btn[data-format]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            applyFormat(btn.dataset.format);
        });
    });
    
    // Character counter
    document.getElementById('message-content').addEventListener('input', updateCharCount);
    
    // Media upload
    document.getElementById('media-upload').addEventListener('change', handleMediaUpload);
    
    // Recurring options
    document.querySelectorAll('.option-btn[data-recurring]').forEach(btn => {
        btn.addEventListener('click', () => selectRecurringOption(btn.dataset.recurring));
    });
    
    // Weekday selector
    document.querySelectorAll('.weekday-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleWeekday(btn));
    });
    
    // Search inputs
    setupSearchFilters();
    
    // Context menu (right-click on messages)
    setupContextMenu();
    
    // Keyboard shortcuts
    setupKeyboardShortcuts();
}

// ===== NAVIGATION =====
function navigateTo(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        AppState.currentPage = pageName;
        
        // Update menu
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeMenuItem = document.querySelector(`[data-page="${pageName}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }
        
        // Update back button
        if (pageName === 'dashboard') {
            telegramApp.hideBackButton();
        } else {
            telegramApp.showBackButton();
        }
        
        // Load page data
        loadPageData(pageName);
        
        // Haptic feedback
        telegramApp.hapticFeedback();
    }
}

async function loadPageData(pageName) {
    switch (pageName) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'scheduled':
            await loadScheduledMessages();
            break;
        case 'recurring':
            await loadRecurringMessages();
            break;
        case 'drafts':
            await loadDrafts();
            break;
        case 'analytics':
            await loadAnalytics();
            break;
        case 'channels':
            await loadChannels();
            break;
    }
}

// ===== MENU =====
function toggleMenu() {
    const menu = document.getElementById('side-menu');
    menu.classList.toggle('open');
    telegramApp.hapticFeedback();
}

function closeMenu() {
    document.getElementById('side-menu').classList.remove('open');
}

// ===== DASHBOARD =====
async function loadDashboardData() {
    try {
        // Update stats
        updateStats();
        
        // Load recent messages
        await loadRecentMessages();
        
        // Load connected channel
        loadConnectedChannel();
        
    } catch (error) {
        console.error('Load dashboard error:', error);
        showToast('error', 'Սխալ', 'Չհաջողվեց բեռնել տվյալները');
    }
}

function updateStats() {
    document.getElementById('stat-scheduled').textContent = AppState.scheduledMessages.length;
    document.getElementById('stat-recurring').textContent = AppState.recurringMessages.length;
    document.getElementById('stat-sent').textContent = AppState.stats.sent_total || 0;
    document.getElementById('stat-drafts').textContent = AppState.drafts.length;
    
    // Update menu badges
    document.getElementById('scheduled-count').textContent = AppState.scheduledMessages.length;
    document.getElementById('recurring-count').textContent = AppState.recurringMessages.length;
    document.getElementById('drafts-count').textContent = AppState.drafts.length;
}

async function loadRecentMessages() {
    const container = document.getElementById('recent-messages');
    
    if (AppState.scheduledMessages.length === 0 && AppState.recurringMessages.length === 0) {
        container.innerHTML = renderEmptyState(
            'Նամակներ չկան',
            'Դուք դեռ չեք ստեղծել նամակներ',
            'new-scheduled'
        );
        return;
    }
    
    // Combine and sort by creation date
    const allMessages = [
        ...AppState.scheduledMessages.map(m => ({ ...m, type: 'scheduled' })),
        ...AppState.recurringMessages.map(m => ({ ...m, type: 'recurring' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    
    container.innerHTML = allMessages.map(msg => renderMessageCard(msg)).join('');
    
    // Add event listeners
    container.querySelectorAll('.message-card').forEach(card => {
        card.addEventListener('click', () => openMessageDetails(card.dataset.id, card.dataset.type));
    });
}

function loadConnectedChannel() {
    const container = document.getElementById('connected-channel');
    
    if (AppState.channels.length === 0) {
        container.innerHTML = `
            <div class="channel-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2"/>
                </svg>
                <p>Ալիք չի միացված</p>
                <button class="btn-primary" data-action="connect-channel">
                    Միացնել ալիք
                </button>
            </div>
        `;
        
        container.querySelector('[data-action="connect-channel"]').addEventListener('click', connectChannel);
    } else {
        const channel = AppState.channels[0];
        container.innerHTML = renderChannelCard(channel);
    }
}

// ===== SCHEDULED MESSAGES =====
async function loadScheduledMessages() {
    const container = document.getElementById('scheduled-list');
    
    if (AppState.scheduledMessages.length === 0) {
        container.innerHTML = renderEmptyState(
            'Պլանավորված նամակներ չկան',
            'Ստեղծեք ձեր առաջին պլանավորված նամակը',
            'new-scheduled'
        );
        return;
    }
    
    const filtered = filterMessages(AppState.scheduledMessages, 'scheduled');
    container.innerHTML = filtered.map(msg => renderMessageCard({ ...msg, type: 'scheduled' })).join('');
    
    // Add event listeners
    setupMessageCardListeners(container);
}

// ===== RECURRING MESSAGES =====
async function loadRecurringMessages() {
    const container = document.getElementById('recurring-list');
    
    if (AppState.recurringMessages.length === 0) {
        container.innerHTML = renderEmptyState(
            'Կրկնվող նամակներ չկան',
            'Ստեղծեք ձեր առաջին կրկնվող նամակը',
            'new-recurring'
        );
        return;
    }
    
    const filtered = filterMessages(AppState.recurringMessages, 'recurring');
    container.innerHTML = filtered.map(msg => renderMessageCard({ ...msg, type: 'recurring' })).join('');
    
    // Add event listeners
    setupMessageCardListeners(container);
}

// ===== DRAFTS =====
async function loadDrafts() {
    const container = document.getElementById('drafts-list');
    
    if (AppState.drafts.length === 0) {
        container.innerHTML = renderEmptyState(
            'Սևագրեր չկան',
            'Պահպանեք նամակներ որպես սևագիր',
            'new-draft'
        );
        return;
    }
    
    const filtered = filterMessages(AppState.drafts, 'drafts');
    container.innerHTML = filtered.map(msg => renderMessageCard({ ...msg, type: 'draft' })).join('');
    
    // Add event listeners
    setupMessageCardListeners(container);
}

// ===== CHANNELS =====
async function loadChannels() {
    const container = document.getElementById('channels-list');
    
    if (AppState.channels.length === 0) {
        container.innerHTML = renderEmptyState(
            'Ալիքներ չկան',
            'Միացրեք ձեր առաջին ալիքը',
            'connect-channel'
        );
        return;
    }
    
    container.innerHTML = AppState.channels.map(channel => renderChannelItem(channel)).join('');
    
    // Add event listeners
    container.querySelectorAll('.manage-btn').forEach(btn => {
        btn.addEventListener('click', () => manageChannel(btn.dataset.channelId));
    });
    
    container.querySelectorAll('.disconnect-btn').forEach(btn => {
        btn.addEventListener('click', () => disconnectChannel(btn.dataset.channelId));
    });
}

// ===== ANALYTICS =====
async function loadAnalytics() {
    const container = document.getElementById('analytics-page').querySelector('.analytics-grid');
    
    // Overview stats
    const overviewHTML = `
        <div class="chart-card">
            <div class="chart-header">
                <h3 class="chart-title">Ընդհանուր վիճակագրություն</h3>
                <div class="chart-period">
                    <button class="period-btn active" data-period="week">Շաբաթ</button>
                    <button class="period-btn" data-period="month">Ամիս</button>
                    <button class="period-btn" data-period="year">Տարի</button>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon sent">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <div class="stat-info">
                        <p class="stat-label">Ուղարկված</p>
                        <h3 class="stat-value">${AppState.stats.sent_total || 0}</h3>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon scheduled">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <div class="stat-info">
                        <p class="stat-label">Ակտիվ պլանավորված</p>
                        <h3 class="stat-value">${AppState.scheduledMessages.length}</h3>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon recurring">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <div class="stat-info">
                        <p class="stat-label">Ակտիվ կրկնվող</p>
                        <h3 class="stat-value">${AppState.recurringMessages.length}</h3>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon drafts">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <div class="stat-info">
                        <p class="stat-label">Սևագրեր</p>
                        <h3 class="stat-value">${AppState.drafts.length}</h3>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = overviewHTML;
    
    // Add chart rendering here if needed
}

// ===== ACTIONS =====
function handleAction(e) {
    e.preventDefault();
    const action = e.currentTarget.dataset.action;
    
    telegramApp.hapticFeedback();
    
    switch (action) {
        case 'new-scheduled':
            openNewMessageModal('scheduled');
            break;
        case 'new-recurring':
            openNewMessageModal('recurring');
            break;
        case 'new-draft':
            openNewMessageModal('draft');
            break;
        case 'connect-channel':
            connectChannel();
            break;
        case 'view-all':
            navigateTo('scheduled');
            break;
        case 'save-draft':
            saveDraft();
            break;
    }
}

// ===== MODALS =====
function openNewMessageModal(type) {
    const modal = document.getElementById('message-modal');
    const title = document.getElementById('modal-title');
    const scheduleSettings = document.getElementById('schedule-settings');
    const recurringSettings = document.getElementById('recurring-settings');
    
    // Reset form
    document.getElementById('message-form').reset();
    document.getElementById('media-preview').innerHTML = '';
    
    // Set title and show relevant settings
    switch (type) {
        case 'scheduled':
            title.textContent = 'Նոր պլանավորված նամակ';
            scheduleSettings.classList.remove('hidden');
            recurringSettings.classList.add('hidden');
            break;
        case 'recurring':
            title.textContent = 'Նոր կրկնվող նամակ';
            scheduleSettings.classList.add('hidden');
            recurringSettings.classList.remove('hidden');
            break;
        case 'draft':
            title.textContent = 'Նոր սևագիր';
            scheduleSettings.classList.add('hidden');
            recurringSettings.classList.add('hidden');
            break;
    }
    
    modal.dataset.type = type;
    modal.classList.add('open');
    
    // Focus on textarea
    document.getElementById('message-content').focus();
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('open');
    });
}

// ===== FORM HANDLING =====
async function handleMessageSubmit(e) {
    e.preventDefault();
    
    const modal = document.getElementById('message-modal');
    const type = modal.dataset.type;
    const content = document.getElementById('message-content').value.trim();
    
    if (!content) {
        showToast('warning', 'Ուշադրություն', 'Մուտքագրեք նամակի տեքստը');
        return;
    }
    
    // Validate channel connection
    if (AppState.channels.length === 0) {
        showToast('warning', 'Ուշադրություն', 'Նախ միացրեք ալիք');
        return;
    }
    
    try {
        const messageData = {
            content,
            channel_id: AppState.channels[0].id,
            media: getUploadedMedia(),
            type
        };
        
        if (type === 'scheduled') {
            const date = document.getElementById('schedule-date').value;
            const time = document.getElementById('schedule-time').value;
            
            if (!date || !time) {
                showToast('warning', 'Ուշադրություն', 'Ընտրեք ամսաթիվ և ժամ');
                return;
            }
            
            messageData.datetime = `${date} ${time}`;
            await scheduleMessage(messageData);
            
        } else if (type === 'recurring') {
            const recurringData = getRecurringSettings();
            
            if (!recurringData) {
                showToast('warning', 'Ուշադրություն', 'Ընտրեք կրկնության ռեժիմ');
                return;
            }
            
            messageData.recurring = recurringData;
            await createRecurringMessage(messageData);
            
        } else if (type === 'draft') {
            await saveDraft(messageData);
        }
        
        closeModal();
        await loadUserData();
        await loadPageData(AppState.currentPage);
        
        telegramApp.hapticFeedback('success');
        
    } catch (error) {
        console.error('Submit message error:', error);
        showToast('error', 'Սխալ', 'Չհաջողվեց պահպանել նամակը');
    }
}

// ===== TEXT FORMATTING =====
function applyFormat(format) {
    const textarea = document.getElementById('message-content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (!selectedText) {
        showToast('info', 'Տեղեկություն', 'Ընտրեք տեքստը ձևավորելու համար');
        return;
    }
    
    let formattedText = '';
    
    switch (format) {
        case 'bold':
            formattedText = `**${selectedText}**`;
            break;
        case 'italic':
            formattedText = `*${selectedText}*`;
            break;
        case 'code':
            formattedText = `\`${selectedText}\``;
            break;
        case 'link':
            const url = prompt('Մուտքագրեք հղումը:');
            if (url) {
                formattedText = `[${selectedText}](${url})`;
            } else {
                return;
            }
            break;
    }
    
    textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start, start + formattedText.length);
    
    updateCharCount();
    telegramApp.hapticFeedback();
}

function updateCharCount() {
    const textarea = document.getElementById('message-content');
    const count = textarea.value.length;
    document.getElementById('char-count').textContent = count;
    
    if (count > 4096) {
        document.getElementById('char-count').style.color = 'var(--error)';
    } else {
        document.getElementById('char-count').style.color = 'var(--text-tertiary)';
    }
}

// ===== MEDIA UPLOAD =====
function handleMediaUpload(e) {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('media-preview');
    
    files.forEach(file => {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            showToast('warning', 'Ուշադրություն', 'Միայն նկար կամ վիդեո');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'media-preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button class="remove-media" type="button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            `;
            
            div.querySelector('.remove-media').addEventListener('click', () => {
                div.remove();
            });
            
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
}

function getUploadedMedia() {
    const previews = document.querySelectorAll('.media-preview-item img');
    return Array.from(previews).map(img => img.src);
}

// ===== RECURRING SETTINGS =====
function selectRecurringOption(option) {
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    const customDiv = document.getElementById('custom-recurring');
    if (option === 'custom') {
        customDiv.classList.remove('hidden');
    } else {
        customDiv.classList.add('hidden');
    }
    
    telegramApp.hapticFeedback();
}

function toggleWeekday(btn) {
    btn.classList.toggle('active');
    telegramApp.hapticFeedback();
}

function getRecurringSettings() {
    const activeOption = document.querySelector('.option-btn.active');
    
    if (!activeOption) return null;
    
    const option = activeOption.dataset.recurring;
    const time = document.getElementById('recurring-time').value;
    
    if (!time) return null;
    
    if (option === 'custom') {
        const days = Array.from(document.querySelectorAll('.weekday-btn.active'))
            .map(btn => btn.dataset.day);
        
        if (days.length === 0) return null;
        
        return { type: 'custom', days, time };
    }
    
    return { type: option, time };
}

// ===== FILTERS =====
function setupSearchFilters() {
    // Scheduled search
    document.getElementById('search-scheduled')?.addEventListener('input', (e) => {
        AppState.filters.scheduledSearch = e.target.value;
        loadScheduledMessages();
    });
    
    document.getElementById('filter-scheduled')?.addEventListener('change', (e) => {
        AppState.filters.scheduledFilter = e.target.value;
        loadScheduledMessages();
    });
    
    // Recurring search
    document.getElementById('search-recurring')?.addEventListener('input', (e) => {
        AppState.filters.recurringSearch = e.target.value;
        loadRecurringMessages();
    });
    
    document.getElementById('filter-recurring')?.addEventListener('change', (e) => {
        AppState.filters.recurringFilter = e.target.value;
        loadRecurringMessages();
    });
    
    // Drafts search
    document.getElementById('search-drafts')?.addEventListener('input', (e) => {
        AppState.filters.draftsSearch = e.target.value;
        loadDrafts();
    });
}

function filterMessages(messages, type) {
    let filtered = [...messages];
    
    // Apply search filter
    const searchKey = `${type}Search`;
    if (AppState.filters[searchKey]) {
        const query = AppState.filters[searchKey].toLowerCase();
        filtered = filtered.filter(msg => 
            msg.content?.toLowerCase().includes(query) ||
            msg.id?.toLowerCase().includes(query)
        );
    }
    
    // Apply time filter for scheduled
    if (type === 'scheduled' && AppState.filters.scheduledFilter) {
        const now = new Date();
        const filter = AppState.filters.scheduledFilter;
        
        filtered = filtered.filter(msg => {
            const msgDate = new Date(msg.datetime);
            
            switch (filter) {
                case 'today':
                    return msgDate.toDateString() === now.toDateString();
                case 'week':
                    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return msgDate >= now && msgDate <= weekFromNow;
                case 'month':
                    return msgDate.getMonth() === now.getMonth() && 
                           msgDate.getFullYear() === now.getFullYear();
                default:
                    return true;
            }
        });
    }
    
    // Apply status filter for recurring
    if (type === 'recurring' && AppState.filters.recurringFilter) {
        const filter = AppState.filters.recurringFilter;
        filtered = filtered.filter(msg => {
            if (filter === 'active') return msg.active !== false;
            if (filter === 'paused') return msg.active === false;
            return true;
        });
    }
    
    return filtered;
}

// ===== RENDER FUNCTIONS =====
function renderMessageCard(msg) {
    const date = msg.type === 'scheduled' ? 
        formatDateTime(msg.datetime) : 
        formatRecurring(msg.recurring);
    
    return `
        <div class="message-card" data-id="${msg.id}" data-type="${msg.type}">
            <div class="message-header">
                <div class="message-meta">
                    <span class="message-type-badge ${msg.type}">${msg.type === 'scheduled' ? 'Պլանավորված' : msg.type === 'recurring' ? 'Կրկնվող' : 'Սևագիր'}</span>
                    <span>${date}</span>
                </div>
                ${msg.type === 'recurring' && msg.active !== false ? 
                    '<span class="status-badge active"><span class="status-dot"></span>Ակտիվ</span>' : ''}
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
            <div class="message-actions">
                <button class="edit-btn" data-action="edit" data-id="${msg.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Խմբագրել
                </button>
                <button class="delete-btn" data-action="delete" data-id="${msg.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Ջնջել
                </button>
            </div>
        </div>
    `;
}

function renderChannelCard(channel) {
    return `
        <div class="channel-item">
            <div class="channel-header">
                <div class="channel-avatar">${channel.title[0]}</div>
                <div class="channel-info">
                    <h3>${escapeHtml(channel.title)}</h3>
                    <p>${channel.username || channel.id}</p>
                </div>
            </div>
            <div class="channel-stats">
                <div class="channel-stat">
                    <div class="channel-stat-value">${channel.subscribers || 0}</div>
                    <div class="channel-stat-label">Բաժանորդներ</div>
                </div>
                <div class="channel-stat">
                    <div class="channel-stat-value">${channel.posts || 0}</div>
                    <div class="channel-stat-label">Գրառումներ</div>
                </div>
                <div class="channel-stat">
                    <div class="channel-stat-value">${channel.scheduled || 0}</div>
                    <div class="channel-stat-label">Պլանավ.</div>
                </div>
            </div>
            <div class="channel-actions">
                <button class="manage-btn" data-channel-id="${channel.id}">
                    Կառավարել
                </button>
            </div>
        </div>
    `;
}

function renderChannelItem(channel) {
    return `
        <div class="channel-item">
            <div class="channel-header">
                <div class="channel-avatar">${channel.title[0]}</div>
                <div class="channel-info">
                    <h3>${escapeHtml(channel.title)}</h3>
                    <p>${channel.username || channel.id}</p>
                </div>
            </div>
            <div class="channel-stats">
                <div class="channel-stat">
                    <div class="channel-stat-value">${AppState.scheduledMessages.filter(m => m.channel_id === channel.id).length}</div>
                    <div class="channel-stat-label">Պլանավորված</div>
                </div>
                <div class="channel-stat">
                    <div class="channel-stat-value">${AppState.recurringMessages.filter(m => m.channel_id === channel.id).length}</div>
                    <div class="channel-stat-label">Կրկնվող</div>
                </div>
                <div class="channel-stat">
                    <div class="channel-stat-value">${channel.sent_total || 0}</div>
                    <div class="channel-stat-label">Ուղարկված</div>
                </div>
            </div>
            <div class="channel-actions">
                <button class="manage-btn" data-channel-id="${channel.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
                        <circle cx="19" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
                        <circle cx="5" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Կառավարել
                </button>
                <button class="disconnect-btn" data-channel-id="${channel.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Անջատել
                </button>
            </div>
        </div>
    `;
}

function renderEmptyState(title, description, action) {
    return `
        <div class="empty-state">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" stroke-width="2"/>
            </svg>
            <h3>${title}</h3>
            <p>${description}</p>
            <button class="btn-primary" data-action="${action}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2"/>
                </svg>
                Ավելացնել
            </button>
        </div>
    `;
}

// ===== MESSAGE DETAILS =====
function openMessageDetails(id, type) {
    // Find message
    let message;
    if (type === 'scheduled') {
        message = AppState.scheduledMessages.find(m => m.id === id);
    } else if (type === 'recurring') {
        message = AppState.recurringMessages.find(m => m.id === id);
    } else if (type === 'draft') {
        message = AppState.drafts.find(m => m.id === id);
    }
    
    if (!message) return;
    
    // Open modal with message data
    openNewMessageModal(type);
    
    // Fill form with message data
    document.getElementById('message-content').value = message.content || '';
    updateCharCount();
    
    if (type === 'scheduled' && message.datetime) {
        const [date, time] = message.datetime.split(' ');
        document.getElementById('schedule-date').value = date;
        document.getElementById('schedule-time').value = time;
    }
    
    if (type === 'recurring' && message.recurring) {
        // Set recurring settings
        const recurring = message.recurring;
        if (recurring.type) {
            document.querySelector(`[data-recurring="${recurring.type}"]`)?.classList.add('active');
        }
        if (recurring.time) {
            document.getElementById('recurring-time').value = recurring.time;
        }
        if (recurring.days) {
            recurring.days.forEach(day => {
                document.querySelector(`[data-day="${day}"]`)?.classList.add('active');
            });
        }
    }
    
    // Store message ID for update
    document.getElementById('message-form').dataset.messageId = id;
    document.getElementById('message-form').dataset.messageType = type;
}

function setupMessageCardListeners(container) {
    // Edit buttons
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const card = btn.closest('.message-card');
            const type = card.dataset.type;
            openMessageDetails(id, type);
        });
    });
    
    // Delete buttons
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const card = btn.closest('.message-card');
            const type = card.dataset.type;
            
            telegramApp.showConfirm('Վստա՞հ եք, որ ուզում եք ջնջել այս նամակը:', async (confirmed) => {
                if (confirmed) {
                    await deleteMessage(id, type);
                }
            });
        });
    });
    
    // Card click
    container.querySelectorAll('.message-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const type = card.dataset.type;
            openMessageDetails(id, type);
        });
    });
}

// ===== API CALLS =====
async function scheduleMessage(data) {
    try {
        const result = await syncWithBot('schedule_message', {
            user_id: AppState.user.id,
            ...data
        });
        
        showToast('success', 'Հաջողություն', 'Նամակը պլանավորված է');
        return result;
        
    } catch (error) {
        console.error('Schedule message error:', error);
        throw error;
    }
}

async function createRecurringMessage(data) {
    try {
        const result = await syncWithBot('create_recurring', {
            user_id: AppState.user.id,
            ...data
        });
        
        showToast('success', 'Հաջողություն', 'Կրկնվող նամակը ստեղծված է');
        return result;
        
    } catch (error) {
        console.error('Create recurring error:', error);
        throw error;
    }
}

async function saveDraft(data) {
    try {
        const result = await syncWithBot('save_draft', {
            user_id: AppState.user.id,
            ...data
        });
        
        showToast('success', 'Հաջողություն', 'Սևագիրը պահպանված է');
        return result;
        
    } catch (error) {
        console.error('Save draft error:', error);
        throw error;
    }
}

async function deleteMessage(id, type) {
    try {
        await syncWithBot('delete_message', {
            user_id: AppState.user.id,
            message_id: id,
            type: type
        });
        
        // Remove from local state
        if (type === 'scheduled') {
            AppState.scheduledMessages = AppState.scheduledMessages.filter(m => m.id !== id);
        } else if (type === 'recurring') {
            AppState.recurringMessages = AppState.recurringMessages.filter(m => m.id !== id);
        } else if (type === 'draft') {
            AppState.drafts = AppState.drafts.filter(m => m.id !== id);
        }
        
        // Reload page
        await loadPageData(AppState.currentPage);
        updateStats();
        
        showToast('success', 'Հաջողություն', 'Նամակը ջնջված է');
        telegramApp.hapticFeedback('success');
        
    } catch (error) {
        console.error('Delete message error:', error);
        showToast('error', 'Սխալ', 'Չհաջողվեց ջնջել նամակը');
    }
}

async function connectChannel() {
elif query.data == 'connect_channel':
    // Show prompt for channel input
    await query.edit_message_text(
        '🔢 <b>Կապակցել ալիք</b>\n\nՄուտքագրեք ալիքի @username-ը:\n\n<b>Օրինակ:</b> @mychannel',
        parse_mode='HTML'
    );
    
    // For demo mode in browser
    const channelInput = prompt('Մուտքագրեք ալիքի username-ը (օրինակ: @mychannel):');
    
    if (channelInput) {
        const userId = AppState.user?.id || 'demo_123456';
        const storageKey = `autopost_${userId}`;
        const storage = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        const channelId = channelInput.startsWith('@') ? channelInput : `@${channelInput}`;
        
        storage.channels = [{
            id: channelId,
            title: channelId.replace('@', ''),
            username: channelId.replace('@', ''),
            subscribers: 0,
            posts: 0,
            scheduled: 0,
            sent_total: 0
        }];
        
        localStorage.setItem(storageKey, JSON.stringify(storage));
        
        await loadUserData();
        
        showToast('success', 'Հաջողություն', `Ալիքը կապակցված է: ${channelId}`);
        
        // Update UI
        const is_subscribed = await check_all_subscriptions(context.bot, userId);
        await query.edit_message_text(
            `✅ Ալիքը կապակցված է:\n\n<code>${channelId}</code>`,
            parse_mode='HTML',
            reply_markup=get_main_keyboard(userId, is_subscribed, page=1)
        );
    }

async function disconnectChannel(channelId) {
    try {
        await syncWithBot('disconnect_channel', {
            user_id: AppState.user.id,
            channel_id: channelId
        });
        
        AppState.channels = AppState.channels.filter(c => c.id !== channelId);
        await loadChannels();
        
        showToast('success', 'Հաջողություն', 'Ալիքը անջատված է');
        
    } catch (error) {
        console.error('Disconnect channel error:', error);
        showToast('error', 'Սխալ', 'Չհաջողվեց անջատել ալիքը');
    }
}

function manageChannel(channelId) {
    const channel = AppState.channels.find(c => c.id === channelId);
    if (!channel) return;
    
    telegramApp.openTelegramLink(`https://t.me/${channel.username || channel.id}`);
}

// ===== SETTINGS =====
function openSettings() {
    telegramApp.showPopup({
        title: 'Կարգավորումներ',
        message: 'Ընտրեք գործողությունը',
        buttons: [
            { id: 'language', type: 'default', text: 'Լեզու' },
            { id: 'notifications', type: 'default', text: 'Ծանուցումներ' },
            { id: 'theme', type: 'default', text: 'Թեմա' },
            { id: 'cancel', type: 'cancel' }
        ]
    }, (buttonId) => {
        if (buttonId === 'theme') {
            toggleTheme();
        }
    });
}

function openNotifications() {
    const count = AppState.scheduledMessages.filter(m => {
        const msgDate = new Date(m.datetime);
        const now = new Date();
        const diff = msgDate - now;
        return diff > 0 && diff < 3600000; // 1 hour
    }).length;
    
    if (count === 0) {
        showToast('info', 'Ծանուցումներ', 'Ծանուցումներ չկան');
        return;
    }
    
    showToast('info', 'Ծանուցումներ', `${count} նամակ կկայարկվի հաջորդ ժամում`);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    document.getElementById('theme-label').textContent = newTheme === 'dark' ? 'Լուսավոր թեմա' : 'Մուգ թեմա';
    
    telegramApp.hapticFeedback();
    showToast('success', 'Թեմա', `Փոխված է ${newTheme === 'dark' ? 'մուգ' : 'լուսավոր'} թեմայի`);
}

// ===== CONTEXT MENU =====
function setupContextMenu() {
    let contextMenu = null;
    
    document.addEventListener('contextmenu', (e) => {
        const messageCard = e.target.closest('.message-card');
        
        if (messageCard) {
            e.preventDefault();
            
            if (contextMenu) {
                contextMenu.remove();
            }
            
            const id = messageCard.dataset.id;
            const type = messageCard.dataset.type;
            
            contextMenu = document.createElement('div');
            contextMenu.className = 'context-menu open';
            contextMenu.innerHTML = `
                <div class="context-menu-item" data-action="edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Խմբագրել
                </div>
                <div class="context-menu-item" data-action="duplicate">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" stroke="currentColor" stroke-width="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Պատճենել
                </div>
                <div class="context-menu-item danger" data-action="delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Ջնջել
                </div>
            `;
            
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
            
            document.body.appendChild(contextMenu);
            
            contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const action = item.dataset.action;
                    
                    if (action === 'edit') {
                        openMessageDetails(id, type);
                    } else if (action === 'delete') {
                        await deleteMessage(id, type);
                    } else if (action === 'duplicate') {
                        // TODO: Implement duplicate
                        showToast('info', 'Տեղեկություն', 'Այս ֆունկցիան շուտով');
                    }
                    
                    contextMenu.remove();
                    contextMenu = null;
                });
            });
            
            telegramApp.hapticFeedback();
        }
    });
    
    document.addEventListener('click', () => {
        if (contextMenu) {
            contextMenu.remove();
            contextMenu = null;
        }
    });
}

// ===== KEYBOARD SHORTCUTS =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N - New scheduled message
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openNewMessageModal('scheduled');
        }
        
        // Ctrl/Cmd + R - New recurring message
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            openNewMessageModal('recurring');
        }
        
        // Ctrl/Cmd + D - New draft
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            openNewMessageModal('draft');
        }
        
        // Esc - Close modal
        if (e.key === 'Escape') {
            closeModal();
            closeMenu();
        }
    });
}

// ===== TOAST NOTIFICATIONS =====
function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    
    const icons = {
        success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="2"/>',
        error: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>',
        warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2"/>',
        info: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2"/>'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                ${icons[type]}
            </svg>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
            </svg>
        </button>
    `;
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
    
    telegramApp.hapticFeedback('notification');
}

// ===== UTILITY FUNCTIONS =====
function formatDateTime(datetime) {
    const date = new Date(datetime);
    const now = new Date();
    const diff = date - now;
    
    if (diff < 0) {
        return 'Անցել է';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return `${days} օր ${hours} ժամ`;
    } else if (hours > 0) {
        return `${hours} ժամ ${minutes} րոպե`;
    } else {
        return `${minutes} րոպե`;
    }
}

function formatRecurring(recurring) {
    if (!recurring) return '';
    
    const types = {
        daily: 'Ամեն օր',
        weekly: 'Շաբաթական',
        monthly: 'Ամսական'
    };
    
    if (recurring.type === 'custom' && recurring.days) {
        const dayNames = ['Կիր', 'Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ'];
        const days = recurring.days.map(d => dayNames[d]).join(', ');
        return `${days} @ ${recurring.time}`;
    }
    
    return `${types[recurring.type] || recurring.type} @ ${recurring.time || ''}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== REAL-TIME UPDATES =====
setInterval(async () => {
    if (AppState.currentPage === 'dashboard') {
        // Refresh dashboard data every 30 seconds
        await loadUserData();
        await loadDashboardData();
    }
}, 30000);

// ===== SERVICE WORKER (Optional - for offline support) =====
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(() => {
        console.log('Service Worker registered');
    }).catch(err => {
        console.log('Service Worker registration failed:', err);
    });
}

