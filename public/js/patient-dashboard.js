/**
 * Patient Dashboard - World Class Experience
 * HIE Uganda - Patient Portal
 * Features: Calendar, Editable Profile, Photo Upload, Activity Logging
 */

(function() {
    'use strict';

    // =========================================================================
    // State Management
    // =========================================================================
    const state = {
        patient: null,
        patientId: null,
        appointments: [],
        medicalRecords: [],
        notifications: [],
        currentSection: 'overview',
        calendarDate: new Date(),
        selectedCalendarDate: null,
        isEditMode: false
    };

    // Notification sound using Web Audio API
    const notificationSound = {
        context: null,
        init() {
            if (!this.context) {
                this.context = new (window.AudioContext || window.webkitAudioContext)();
            }
        },
        play() {
            try {
                this.init();
                const oscillator = this.context.createOscillator();
                const gainNode = this.context.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.context.destination);
                
                oscillator.frequency.setValueAtTime(800, this.context.currentTime);
                oscillator.frequency.setValueAtTime(600, this.context.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
                
                oscillator.start(this.context.currentTime);
                oscillator.stop(this.context.currentTime + 0.3);
            } catch (e) {
                console.log('Sound not supported:', e);
            }
        }
    };

    // =========================================================================
    // Authentication Config
    // =========================================================================
    const AUTH_CONFIG = {
        TOKEN_KEY: 'hie_token',
        USER_KEY: 'hie_user'
    };

    // =========================================================================
    // DOM Ready
    // =========================================================================
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        if (!checkAuth()) return;
        setupNavigation();
        setupDate();
        setupCalendar();
        setupProfileEdit();
        setupPhotoUpload();
        setupRecordsInteractions();
        setupNotifications();
        loadDashboardData();
        
        // Navigate to section from URL hash or default to overview
        const savedSection = getSavedSection();
        if (savedSection && ['overview', 'appointments', 'records', 'profile', 'notifications'].includes(savedSection)) {
            navigateTo(savedSection);
        }
        
        logActivity('view', 'dashboard', 'Patient accessed dashboard');
        
        // Start activity heartbeat (every 15 seconds) to keep user online status current
        sendActivityHeartbeat();
        setInterval(sendActivityHeartbeat, 15000);
        
        // Initialize Socket.IO for real-time notifications
        initializeSocket();
        
        // Load system timezone
        loadSystemTimezone();
        
        // Check for unblock notification from login
        checkUnblockNotification();
        
        // Play notification sounds 2 seconds after login
        setTimeout(() => {
            playLoginNotifications();
        }, 2000);
    }
    
    // =========================================================================
    // Unblock Notification on Login & System Timezone
    // =========================================================================
    function checkUnblockNotification() {
        const unblockData = sessionStorage.getItem('hie_unblock_notification');
        if (unblockData) {
            try {
                const data = JSON.parse(unblockData);
                // Show comprehensive unblock popup after short delay
                setTimeout(() => {
                    showUnblockPopup(data);
                }, 1500);
                // Clear the notification data
                sessionStorage.removeItem('hie_unblock_notification');
            } catch (e) {
                console.log('Error parsing unblock notification:', e);
            }
        }
    }
    
    function showUnblockPopup(data) {
        // Remove existing if any
        let overlay = document.getElementById('unblockPopupOverlay');
        if (overlay) {
            overlay.remove();
        }
        
        const formatTs = (ts) => {
            if (!ts) return 'N/A';
            return new Date(ts).toLocaleString('en-UG', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            });
        };
        
        const blockedAt = formatTs(data.blocked_at);
        const unblockedAt = formatTs(data.unblocked_at);
        const blockReason = data.block_reason || 'Policy violation';
        const resolution = data.resolution || 'Issue has been resolved';
        const unblockedBy = data.unblocked_by || 'Administrator';
        
        overlay = document.createElement('div');
        overlay.id = 'unblockPopupOverlay';
        overlay.innerHTML = `
            <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease-out;">
                <div style="background: white; border-radius: 20px; max-width: 480px; width: 90%; box-shadow: 0 25px 50px rgba(0,0,0,0.25); overflow: hidden; animation: scaleIn 0.3s ease-out;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center;">
                        <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                            <i class="fas fa-check-circle" style="font-size: 32px; color: white;"></i>
                        </div>
                        <h2 style="margin: 0; color: white; font-size: 1.5rem; font-weight: 600;">Account Restored</h2>
                        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 0.95rem;">Welcome back! Your access has been fully restored.</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 24px;">
                        <!-- Block Details -->
                        <div style="background: #fef2f2; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                            <h4 style="margin: 0 0 12px; color: #991b1b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">
                                <i class="fas fa-ban me-2"></i>Previous Block Details
                            </h4>
                            <div style="display: grid; gap: 10px; font-size: 0.9rem; color: #7f1d1d;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #991b1b;"><i class="fas fa-exclamation-triangle me-1"></i> Reason:</span>
                                    <span style="font-weight: 500; text-align: right; max-width: 60%;">${blockReason}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #991b1b;"><i class="fas fa-clock me-1"></i> Blocked at:</span>
                                    <span style="font-weight: 500;">${blockedAt}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Unblock Details -->
                        <div style="background: #ecfdf5; border-radius: 12px; padding: 16px;">
                            <h4 style="margin: 0 0 12px; color: #065f46; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">
                                <i class="fas fa-check-circle me-2"></i>Restoration Details
                            </h4>
                            <div style="display: grid; gap: 10px; font-size: 0.9rem; color: #064e3b;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #065f46;"><i class="fas fa-clipboard-check me-1"></i> Resolution:</span>
                                    <span style="font-weight: 500; text-align: right; max-width: 60%;">${resolution}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #065f46;"><i class="fas fa-user-check me-1"></i> Restored by:</span>
                                    <span style="font-weight: 500;">${unblockedBy}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #065f46;"><i class="fas fa-clock me-1"></i> Restored at:</span>
                                    <span style="font-weight: 500;">${unblockedAt}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="padding: 0 24px 24px; text-align: center;">
                        <button onclick="this.closest('#unblockPopupOverlay').remove()" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 14px 40px; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                            <i class="fas fa-thumbs-up me-2"></i>Got it, thanks!
                        </button>
                    </div>
                </div>
            </div>
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            </style>
        `;
        
        document.body.appendChild(overlay);
        
        // Play success sound
        playAlertSound('unblocked');
        
        // Add to notifications
        addBlockNotificationToList('unblocked', {
            reason: resolution,
            timestamp: data.unblocked_at,
            unblocked_by: unblockedBy
        });
    }
    
    async function loadSystemTimezone() {
        try {
            const response = await fetch('/api/admin/public/timezone');
            const data = await response.json();
            if (data.success && data.data.timezone) {
                localStorage.setItem('hie_system_timezone', data.data.timezone);
            }
        } catch (e) {
            // Use cached or default
        }
    }

    // =========================================================================
    // Socket.IO for Real-Time Notifications
    // =========================================================================
    let socket = null;
    
    function initializeSocket() {
        if (typeof io !== 'undefined') {
            socket = io();
            
            socket.on('connect', () => {
                console.log('Patient socket connected');
            });
            
            // Listen for account blocked event - auto logout after 1 second
            socket.on('account_blocked', (data) => {
                const user = JSON.parse(localStorage.getItem(AUTH_CONFIG.USER_KEY) || '{}');
                if (data.user_id === user.id) {
                    showBlockedNotification(data);
                    // Auto logout after 1 second delay
                    setTimeout(() => {
                        logout();
                    }, 1000);
                }
            });
            
            // Listen for account unblocked event
            socket.on('account_unblocked', (data) => {
                const user = JSON.parse(localStorage.getItem(AUTH_CONFIG.USER_KEY) || '{}');
                if (data.user_id === user.id) {
                    showUnblockedNotification(data);
                }
            });
            
            // Listen for timezone changes
            socket.on('timezone_changed', (data) => {
                if (data.timezone) {
                    localStorage.setItem('hie_system_timezone', data.timezone);
                    showToast('Timezone Updated', `System timezone changed to ${data.timezone}`, 'info');
                }
            });
            
            socket.on('disconnect', () => {
                console.log('Patient socket disconnected');
            });
        }
    }
    
    function showBlockedNotification(data) {
        // Remove existing if any
        let container = document.getElementById('persistentNotificationContainer');
        if (container) {
            container.remove();
        }
        
        const formatTs = (ts) => {
            if (!ts) return 'Just now';
            return new Date(ts).toLocaleString('en-UG', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            });
        };
        
        const timestamp = formatTs(data.timestamp);
        
        container = document.createElement('div');
        container.id = 'persistentNotificationContainer';
        container.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 420px; min-width: 340px; animation: slideInRight 0.4s ease-out;">
                <div style="background: linear-gradient(135deg, #fff 0%, #f8fafc 100%); border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05); overflow: hidden; border-left: 5px solid #ef4444;">
                    <div style="display: flex; align-items: center; gap: 12px; padding: 16px 20px 12px; border-bottom: 1px solid #e5e7eb;">
                        <i class="fas fa-ban" style="color: #ef4444; font-size: 1.25rem;"></i>
                        <span style="flex: 1; font-weight: 600; font-size: 1rem; color: #1f2937;">Account Blocked</span>
                    </div>
                    <div style="padding: 16px 20px 20px;">
                        <p style="margin: 0; font-size: 0.95rem; color: #374151; line-height: 1.5;"><strong>Your account has been blocked.</strong></p>
                        <div style="margin-top: 12px; padding: 12px; background: #fef2f2; border-radius: 10px; font-size: 0.85rem; color: #991b1b;">
                            <div style="margin-bottom: 8px;"><i class="fas fa-exclamation-triangle me-1"></i> <strong>Reason:</strong> ${data.reason || 'Suspicious activity detected'}</div>
                            <div style="margin-bottom: 8px;"><i class="fas fa-user-shield me-1"></i> <strong>Blocked by:</strong> ${data.blocked_by || 'Administrator'}</div>
                            <div><i class="fas fa-clock me-1"></i> <strong>Time:</strong> ${timestamp}</div>
                        </div>
                        <div style="margin-top: 12px; padding: 10px; background: #fee2e2; border-radius: 8px; text-align: center; font-size: 0.8rem; color: #b91c1c;">
                            <i class="fas fa-sign-out-alt me-1"></i> You will be logged out automatically...
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;
        
        document.body.appendChild(container);
        
        // Add to notifications list
        addBlockNotificationToList('blocked', data);
        
        // Play alert sound
        playAlertSound('blocked');
    }
    
    function showUnblockedNotification(data) {
        // Remove existing if any
        let container = document.getElementById('persistentNotificationContainer');
        if (container) {
            container.remove();
        }
        
        const formatTs = (ts) => {
            if (!ts) return 'Just now';
            return new Date(ts).toLocaleString('en-UG', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            });
        };
        
        const timestamp = formatTs(data.timestamp);
        
        container = document.createElement('div');
        container.id = 'persistentNotificationContainer';
        container.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 420px; min-width: 340px; animation: slideInRight 0.4s ease-out;">
                <div style="background: linear-gradient(135deg, #fff 0%, #f8fafc 100%); border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05); overflow: hidden; border-left: 5px solid #10b981;">
                    <div style="display: flex; align-items: center; gap: 12px; padding: 16px 20px 12px; border-bottom: 1px solid #e5e7eb;">
                        <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.25rem;"></i>
                        <span style="flex: 1; font-weight: 600; font-size: 1rem; color: #1f2937;">Account Restored</span>
                        <button onclick="this.closest('#persistentNotificationContainer').remove()" style="background: none; border: none; font-size: 1.5rem; color: #9ca3af; cursor: pointer; padding: 0; width: 32px; height: 32px;">&times;</button>
                    </div>
                    <div style="padding: 16px 20px 20px;">
                        <p style="margin: 0; font-size: 0.95rem; color: #374151; line-height: 1.5;"><strong>Good news!</strong> Your account access has been restored.</p>
                        <div style="margin-top: 12px; padding: 12px; background: #ecfdf5; border-radius: 10px; font-size: 0.85rem; color: #065f46;">
                            <div style="margin-bottom: 8px;"><i class="fas fa-check me-1"></i> <strong>Resolution:</strong> ${data.reason || 'Issue resolved'}</div>
                            <div><i class="fas fa-user-check me-1"></i> <strong>Restored by:</strong> ${data.unblocked_by || 'Administrator'}</div>
                        </div>
                        <div style="padding: 12px; background: #f9fafb; border-radius: 10px; font-size: 0.85rem; color: #6b7280; margin-top: 10px;">
                            <span><i class="fas fa-clock me-1"></i> ${timestamp}</span>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;
        
        document.body.appendChild(container);
        
        // Add to notifications list
        addBlockNotificationToList('unblocked', data);
        
        // Play success sound
        playAlertSound('unblocked');
    }
    
    function addBlockNotificationToList(type, data) {
        const isBlocked = type === 'blocked';
        const newNotification = {
            id: `${type}-${Date.now()}`,
            type: isBlocked ? 'error' : 'success',
            title: isBlocked ? 'Account Blocked' : 'Account Restored',
            message: isBlocked 
                ? `Your account was blocked. Reason: ${data.reason || 'Suspicious activity'}`
                : `Your account access has been restored. ${data.reason || ''}`,
            time: data.timestamp || new Date().toISOString(),
            read: false,
            navigateTo: 'overview',
            actionText: 'View Details',
            persistent: true
        };
        
        // Add to beginning of notifications
        state.notifications.unshift(newNotification);
        
        // Save to localStorage
        saveNotifications();
        
        // Re-render notifications
        renderNotifications();
        renderNotificationsPage();
    }
    
    function playAlertSound(type) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            if (type === 'blocked') {
                // Warning/alert sound - descending tone
                oscillator.frequency.setValueAtTime(600, ctx.currentTime);
                oscillator.frequency.setValueAtTime(400, ctx.currentTime + 0.15);
                oscillator.frequency.setValueAtTime(300, ctx.currentTime + 0.3);
            } else {
                // Success sound - ascending tone
                oscillator.frequency.setValueAtTime(400, ctx.currentTime);
                oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
            }
            
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.4);
        } catch (e) {
            console.log('Sound not supported:', e);
        }
    }
    
    function formatDateTime(dateStr) {
        if (!dateStr) return 'N/A';
        const tz = localStorage.getItem('hie_system_timezone') || 'Africa/Kampala';
        try {
            return new Date(dateStr).toLocaleString('en-UG', {
                timeZone: tz,
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch (e) {
            return new Date(dateStr).toLocaleString('en-UG', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }
    }

    // =========================================================================
    // Activity Heartbeat - Keep user online status current
    // =========================================================================
    async function sendActivityHeartbeat() {
        const token = getAuthToken();
        if (!token) return;
        
        try {
            await fetch('/api/auth/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (e) {
            // Silently fail - heartbeat is non-critical
        }
    }

    // =========================================================================
    // URL Hash Persistence
    // =========================================================================
    function getSavedSection() {
        // First check URL hash
        const hash = window.location.hash.replace('#', '');
        if (hash) return hash;
        
        // Then check sessionStorage for current session persistence
        return sessionStorage.getItem('patientDashboardSection');
    }

    function saveSection(sectionId) {
        // Update URL hash without triggering navigation
        history.replaceState(null, null, `#${sectionId}`);
        // Also save to sessionStorage as backup
        sessionStorage.setItem('patientDashboardSection', sectionId);
    }

    // Handle browser back/forward buttons
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash.replace('#', '');
        if (hash && ['overview', 'appointments', 'records', 'profile', 'notifications'].includes(hash)) {
            navigateTo(hash, false); // false = don't update hash again
        }
    });

    // =========================================================================
    // Authentication
    // =========================================================================
    function getUser() {
        try {
            const userStr = localStorage.getItem(AUTH_CONFIG.USER_KEY);
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    }

    function getAuthToken() {
        return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    }

    function checkAuth() {
        const token = getAuthToken();
        const user = getUser();

        if (!token || !user) {
            window.location.href = '/login.html';
            return false;
        }

        if (user.role !== 'patient') {
            if (user.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/dashboard.html';
            }
            return false;
        }

        // Get patient ID from user data - support both camelCase and snake_case
        // Do NOT fall back to user.id as that's a different ID
        state.patientId = user.patient_id || user.patientId || null;
        console.log('Patient ID from stored user:', state.patientId);
        
        // Also check localStorage for stored patient data
        const storedPatient = localStorage.getItem('hie_patient');
        if (!state.patientId && storedPatient) {
            try {
                const patientData = JSON.parse(storedPatient);
                state.patientId = patientData.id;
                console.log('Patient ID from stored patient data:', state.patientId);
            } catch (e) {
                console.log('Could not parse stored patient data');
            }
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        return true;
    }

    function handleLogout() {
        logActivity('logout', 'session', 'Patient logged out');
        setTimeout(() => {
            localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
            localStorage.removeItem(AUTH_CONFIG.USER_KEY);
            localStorage.removeItem('hie_patient');
            window.location.href = '/login.html';
        }, 200);
    }

    // =========================================================================
    // Activity Logging
    // =========================================================================
    async function logActivity(action, resource, details) {
        try {
            await fetch('/api/patients/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ action, resource, details })
            });
        } catch (e) {
            console.log('Activity logging failed:', e);
        }
    }

    // =========================================================================
    // Navigation
    // =========================================================================
    function setupNavigation() {
        // Handle logo click - navigate to overview
        const logoLink = document.getElementById('logoLink');
        if (logoLink) {
            logoLink.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo('overview');
            });
        }

        // Handle user profile avatar/name click
        const userProfileLink = document.getElementById('userProfileLink');
        if (userProfileLink) {
            userProfileLink.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo('profile');
                
                // Close mobile navbar if open
                const navbarCollapse = document.getElementById('patientNavbar');
                if (navbarCollapse?.classList.contains('show')) {
                    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                    if (bsCollapse) bsCollapse.hide();
                }
            });
        }

        // Handle navbar links with data-section attribute
        document.querySelectorAll('.nav-link[data-section]').forEach(item => {
            // Skip the user profile link as it's handled separately
            if (item.id === 'userProfileLink') return;
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(item.dataset.section);
                
                // Close mobile navbar if open
                const navbarCollapse = document.getElementById('patientNavbar');
                if (navbarCollapse?.classList.contains('show')) {
                    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                    if (bsCollapse) bsCollapse.hide();
                }
            });
        });

        // Handle other elements with data-section (buttons, etc.)
        document.querySelectorAll('[data-section]').forEach(el => {
            if (!el.classList.contains('nav-link') && el.id !== 'logoLink') {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateTo(el.dataset.section);
                });
            }
        });
    }

    function navigateTo(sectionId, updateHash = true) {
        // Update nav links - only for actual nav links with data-section
        document.querySelectorAll('.nav-link[data-section]').forEach(item => {
            // Skip user profile link from active state toggling
            if (item.id === 'userProfileLink') {
                item.classList.remove('active');
                return;
            }
            item.classList.remove('active');
            if (item.dataset.section === sectionId) {
                item.classList.add('active');
            }
        });

        // Hide all sections
        document.querySelectorAll('[id^="section-"]').forEach(section => {
            section.classList.add('section-hidden');
        });

        // Show target section
        const target = document.getElementById(`section-${sectionId}`);
        if (target) {
            target.classList.remove('section-hidden');
        }

        // Update page title with icon
        const icons = {
            'overview': 'fa-th-large',
            'appointments': 'fa-calendar-check',
            'records': 'fa-folder-open',
            'profile': 'fa-user-circle',
            'notifications': 'fa-bell'
        };
        const titles = {
            'overview': 'Overview',
            'appointments': 'Appointments',
            'records': 'Medical Records',
            'profile': 'My Profile',
            'notifications': 'Notifications'
        };
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) {
            const icon = icons[sectionId] || 'fa-th-large';
            titleEl.innerHTML = `<i class="fas ${icon} me-2 text-primary"></i>${titles[sectionId] || 'Dashboard'}`;
        }

        state.currentSection = sectionId;
        
        // Save section to URL hash for page refresh persistence
        if (updateHash) {
            saveSection(sectionId);
        }
        
        // Re-render notifications page if navigating to it
        if (sectionId === 'notifications') {
            renderNotificationsPage();
        }
        
        logActivity('view', sectionId, `Viewed ${sectionId} section`);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // =========================================================================
    // Date Display
    // =========================================================================
    function setupDate() {
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = now.toLocaleDateString('en-US', options);
        }

        const welcomeEl = document.getElementById('welcomeText');
        if (welcomeEl) {
            const hour = new Date().getHours();
            let greeting = 'Good morning';
            if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
            if (hour >= 17) greeting = 'Good evening';
            welcomeEl.textContent = `${greeting}, Patient`;
        }
    }

    // =========================================================================
    // Calendar
    // =========================================================================
    function setupCalendar() {
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
            renderCalendar();
        });

        document.getElementById('nextMonth')?.addEventListener('click', () => {
            state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
            renderCalendar();
        });
    }

    function renderCalendar() {
        const calMonthYear = document.getElementById('calMonthYear');
        const calDays = document.getElementById('calendarDays');
        if (!calMonthYear || !calDays) return;

        const year = state.calendarDate.getFullYear();
        const month = state.calendarDate.getMonth();

        calMonthYear.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        // Get appointments for this month
        const monthAppts = state.appointments.filter(a => {
            const d = new Date(a.appointment_date || a.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        // Build appointment map by day
        const apptMap = {};
        monthAppts.forEach(a => {
            const d = new Date(a.appointment_date || a.date).getDate();
            if (!apptMap[d]) apptMap[d] = [];
            apptMap[d].push(a);
        });

        let html = '';

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="cal-day empty"></div>';
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const hasAppt = apptMap[day];
            const isSelected = state.selectedCalendarDate && 
                state.selectedCalendarDate.getFullYear() === year && 
                state.selectedCalendarDate.getMonth() === month && 
                state.selectedCalendarDate.getDate() === day;

            let classes = 'cal-day';
            if (isToday) classes += ' today';
            if (hasAppt) classes += ' has-appointment';
            if (isSelected) classes += ' selected';

            let dots = '';
            if (hasAppt) {
                const statuses = [...new Set(hasAppt.map(a => (a.status || 'scheduled').toLowerCase()))];
                dots = '<div class="cal-dots">' + statuses.map(s => `<span class="cal-dot ${s}"></span>`).join('') + '</div>';
            }

            html += `<div class="${classes}" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}">${day}${dots}</div>`;
        }

        calDays.innerHTML = html;

        // Add click handlers
        calDays.querySelectorAll('.cal-day:not(.empty)').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const dateStr = dayEl.dataset.date;
                state.selectedCalendarDate = new Date(dateStr + 'T00:00:00');
                renderCalendar();
                showAppointmentsForDate(dateStr);
            });
        });
    }

    function showAppointmentsForDate(dateStr) {
        const detailsContent = document.getElementById('appointmentDetailsContent');
        const detailsTitle = document.getElementById('detailsPanelTitle');
        if (!detailsContent || !detailsTitle) return;

        const date = new Date(dateStr + 'T00:00:00');
        detailsTitle.textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        const dayAppts = state.appointments.filter(a => {
            const d = new Date(a.appointment_date || a.date);
            return d.toISOString().split('T')[0] === dateStr;
        });

        if (dayAppts.length === 0) {
            detailsContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No appointments on this date</p>
                </div>`;
        } else {
            detailsContent.innerHTML = dayAppts.map(a => createDetailedAppointmentCard(a)).join('');
        }

        logActivity('view', 'calendar_date', `Viewed appointments for ${dateStr}`);
    }

    function createDetailedAppointmentCard(appt) {
        const time = appt.appointment_time || appt.time || '09:00';
        const type = appt.appointment_type || appt.type || 'General Checkup';
        const provider = appt.provider_name || appt.doctor || 'Healthcare Provider';
        const facility = appt.facility_name || appt.facility || 'Medical Center';
        const status = appt.status || 'scheduled';
        const notes = appt.notes || appt.reason || '';

        return `
            <div class="appointment-detail-card">
                <div class="appt-detail-header">
                    <span class="appt-detail-time"><i class="fas fa-clock"></i> ${formatTime(time)}</span>
                    <span class="appt-status ${status.toLowerCase()}">${status}</span>
                </div>
                <h4 class="appt-detail-type">${type}</h4>
                <div class="appt-detail-info">
                    <p><i class="fas fa-user-md"></i> ${provider}</p>
                    <p><i class="fas fa-hospital"></i> ${facility}</p>
                    ${notes ? `<p class="appt-notes"><i class="fas fa-sticky-note"></i> ${notes}</p>` : ''}
                </div>
            </div>`;
    }

    // =========================================================================
    // Profile Tabs & Modal
    // =========================================================================
    function setupProfileEdit() {
        // Profile Tabs Navigation
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                
                // Update tab buttons
                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update tab panels
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                document.getElementById(`tab-${tabId}`)?.classList.add('active');
            });
        });

        // Edit Modal Controls
        const editBtn = document.getElementById('editProfileBtn');
        const closeBtn = document.getElementById('closeEditModal');
        const cancelBtn = document.getElementById('cancelEditBtn');
        const editForm = document.getElementById('profileEditForm');
        const modal = document.getElementById('editProfileModal');
        const overlay = modal?.querySelector('.modal-overlay');

        editBtn?.addEventListener('click', openEditModal);
        closeBtn?.addEventListener('click', closeEditModal);
        cancelBtn?.addEventListener('click', closeEditModal);
        overlay?.addEventListener('click', closeEditModal);
        editForm?.addEventListener('submit', saveProfile);

        // Edit Modal Tabs
        document.querySelectorAll('.edit-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const editId = tab.dataset.edit;
                
                // Update edit tab buttons
                document.querySelectorAll('.edit-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update edit panels
                document.querySelectorAll('.edit-panel').forEach(p => p.classList.remove('active'));
                document.getElementById(`edit-${editId}`)?.classList.add('active');
            });
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal?.classList.contains('hidden')) {
                closeEditModal();
            }
        });
    }

    function openEditModal() {
        const modal = document.getElementById('editProfileModal');
        modal?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        populateEditForm();
        logActivity('edit_start', 'profile', 'Started editing profile');
    }

    function closeEditModal() {
        const modal = document.getElementById('editProfileModal');
        modal?.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Reset to first tab
        document.querySelectorAll('.edit-tab').forEach((t, i) => {
            t.classList.toggle('active', i === 0);
        });
        document.querySelectorAll('.edit-panel').forEach((p, i) => {
            p.classList.toggle('active', i === 0);
        });
    }

    function populateEditForm() {
        const p = state.patient;
        if (!p) return;

        // Use camelCase with snake_case fallback
        setValue('editFirstName', p.firstName || p.first_name);
        setValue('editLastName', p.lastName || p.last_name);
        setValue('editContact', p.contactNumber || p.contact_number);
        setValue('editAddress', p.address);
        setValue('editDistrict', p.district);
        setValue('editVillage', p.village);
        setValue('editNIN', p.nin);
        setValue('editNationality', p.nationality);
        setValue('editTribe', p.tribe);
        setValue('editBloodGroup', p.bloodGroup || p.blood_group);
        setValue('editGenotype', p.genotype);
        setValue('editHeight', p.height);
        setValue('editWeight', p.weight);
        setValue('editEyeColor', p.eyeColor || p.eye_color);
        setValue('editHairColor', p.hairColor || p.hair_color);
        setValue('editSkinTone', p.skinTone || p.skin_tone);
        
        const foodAllergies = p.foodAllergies || p.food_allergies || [];
        const medAllergies = p.medicationAllergies || p.medication_allergies || [];
        const conditions = p.chronicConditions || p.chronic_conditions || [];
        
        setValue('editFoodAllergies', Array.isArray(foodAllergies) ? foodAllergies.join(', ') : foodAllergies);
        setValue('editMedAllergies', Array.isArray(medAllergies) ? medAllergies.join(', ') : medAllergies);
        setValue('editConditions', Array.isArray(conditions) ? conditions.join(', ') : conditions);
        
        setValue('editNOKName', p.nextOfKinName || p.next_of_kin_name);
        setValue('editNOKRelation', p.nextOfKinRelationship || p.next_of_kin_relationship);
        setValue('editNOKContact', p.nextOfKinContact || p.next_of_kin_contact);
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }

    async function saveProfile(e) {
        e.preventDefault();
        const saveBtn = document.getElementById('saveProfileBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const data = {
            firstName: document.getElementById('editFirstName')?.value,
            lastName: document.getElementById('editLastName')?.value,
            contactNumber: document.getElementById('editContact')?.value,
            nin: document.getElementById('editNIN')?.value,
            address: document.getElementById('editAddress')?.value,
            district: document.getElementById('editDistrict')?.value,
            village: document.getElementById('editVillage')?.value,
            nationality: document.getElementById('editNationality')?.value,
            tribe: document.getElementById('editTribe')?.value,
            bloodGroup: document.getElementById('editBloodGroup')?.value,
            genotype: document.getElementById('editGenotype')?.value,
            height: parseFloat(document.getElementById('editHeight')?.value) || null,
            weight: parseFloat(document.getElementById('editWeight')?.value) || null,
            eyeColor: document.getElementById('editEyeColor')?.value,
            hairColor: document.getElementById('editHairColor')?.value,
            skinTone: document.getElementById('editSkinTone')?.value,
            foodAllergies: document.getElementById('editFoodAllergies')?.value.split(',').map(s => s.trim()).filter(Boolean),
            medicationAllergies: document.getElementById('editMedAllergies')?.value.split(',').map(s => s.trim()).filter(Boolean),
            chronicConditions: document.getElementById('editConditions')?.value.split(',').map(s => s.trim()).filter(Boolean),
            nextOfKinName: document.getElementById('editNOKName')?.value,
            nextOfKinRelationship: document.getElementById('editNOKRelation')?.value,
            nextOfKinContact: document.getElementById('editNOKContact')?.value
        };

        try {
            const response = await fetch(`/api/patients/${state.patientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const responseData = await response.json();
                // Handle both direct object and wrapped response
                state.patient = responseData.data || responseData;
                console.log('Profile updated:', state.patient);
                renderPatientInfo();
                closeEditModal();
                showToast('Profile updated successfully!', 'success');
                logActivity('update', 'profile', 'Profile information updated');
            } else {
                const err = await response.json();
                showToast(err.error || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            showToast('Failed to update profile', 'error');
        }

        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Save Changes';
    }

    // =========================================================================
    // Photo Upload
    // =========================================================================
    function setupPhotoUpload() {
        const photoInput = document.getElementById('photoUpload');
        photoInput?.addEventListener('change', handlePhotoUpload);
    }

    async function handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async function(event) {
            const base64 = event.target.result;

            try {
                const response = await fetch(`/api/patients/${state.patientId}/photo`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify({ photo: base64 })
                });

                if (response.ok) {
                    state.patient.photo = base64;
                    updateAvatars(base64);
                    showToast('Profile photo updated!', 'success');
                    logActivity('update', 'photo', 'Profile photo changed');
                } else {
                    showToast('Failed to update photo', 'error');
                }
            } catch (error) {
                showToast('Failed to upload photo', 'error');
            }
        };
        reader.readAsDataURL(file);
    }

    function updateAvatars(src) {
        ['navbarAvatar', 'fullProfileAvatar', 'overviewAvatar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.src = src;
        });
    }

    // =========================================================================
    // Data Loading
    // =========================================================================
    async function loadDashboardData() {
        try {
            // First, try to load patient data from localStorage (stored during login)
            const storedPatient = localStorage.getItem('hie_patient');
            if (storedPatient) {
                try {
                    state.patient = JSON.parse(storedPatient);
                    state.patientId = state.patient.id;
                    console.log('Loaded patient from localStorage:', state.patient);
                    renderPatientInfo();
                } catch (e) {
                    console.log('Could not parse stored patient data');
                }
            }
            
            // IMPORTANT: Load patient info first to ensure we have patient_id
            // before loading appointments and records
            await loadPatientInfo();
            
            // Now load appointments and records in parallel (they need patient_id)
            await Promise.all([
                loadAppointments(),
                loadMedicalRecords()
            ]);
            updateStats();
            renderCalendar();
            
            // Load notifications after data is ready
            loadNotifications();
        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    }

    async function loadPatientInfo() {
        if (!state.patientId) {
            console.log('No patient ID found, trying to get from /me endpoint');
            // Try to get patient info from /me endpoint
            try {
                const meResponse = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                });
                if (meResponse.ok) {
                    const meData = await meResponse.json();
                    console.log('Response from /me:', meData);
                    // Check multiple possible locations for patient_id
                    if (meData.patient_id) {
                        state.patientId = meData.patient_id;
                    } else if (meData.patientId) {
                        state.patientId = meData.patientId;
                    } else if (meData.data && meData.data.patient_id) {
                        state.patientId = meData.data.patient_id;
                    } else if (meData.data && meData.data.patientId) {
                        state.patientId = meData.data.patientId;
                    }
                    console.log('Patient ID from /me endpoint:', state.patientId);
                }
            } catch (e) {
                console.error('Failed to get patient ID from /me:', e);
            }
        }

        if (!state.patientId) {
            console.error('No patient ID available');
            return;
        }

        try {
            console.log('Fetching patient data for ID:', state.patientId);
            const response = await fetch(`/api/patients/${state.patientId}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            if (response.ok) {
                const data = await response.json();
                // Handle both direct object and wrapped response
                state.patient = data.data || data;
                console.log('Loaded patient data:', state.patient);
                renderPatientInfo();
            } else {
                console.error('Failed to load patient info:', response.status, await response.text());
            }
        } catch (error) {
            console.error('Patient info error:', error);
        }
    }

    async function loadAppointments() {
        if (!state.patientId) return;

        try {
            const response = await fetch(`/api/appointments/patient/${state.patientId}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            if (response.ok) {
                const data = await response.json();
                // Handle both array and wrapped response
                let appointments = Array.isArray(data) ? data : (data.data || data.appointments || []);
                
                // Normalize appointment data to consistent format
                state.appointments = appointments.map(a => ({
                    ...a,
                    // Map API fields to expected fields
                    appointment_date: a.date || a.appointment_date,
                    appointment_time: a.time || a.appointment_time || '09:00',
                    appointment_type: a.reason || a.appointment_type || 'Consultation',
                    provider_name: a.doctor?.name || a.provider_name || 'Healthcare Provider',
                    facility_name: a.facility_name || 'Medical Center',
                    status: a.status || 'scheduled'
                }));
                console.log('Loaded appointments:', state.appointments);
                renderAppointments();
            }
        } catch (error) {
            console.error('Appointments error:', error);
        }
    }

    async function loadMedicalRecords() {
        if (!state.patientId) return;

        try {
            const response = await fetch(`/api/medical-records/patient/${state.patientId}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            if (response.ok) {
                const data = await response.json();
                // Handle the wrapped response format: { success: true, data: [...] }
                let records = [];
                if (Array.isArray(data)) {
                    records = data;
                } else if (data.data && Array.isArray(data.data)) {
                    records = data.data;
                } else if (data.records && Array.isArray(data.records)) {
                    records = data.records;
                }
                
                // Normalize medical record data
                state.medicalRecords = records.map(r => ({
                    ...r,
                    visit_date: r.visitDate || r.visit_date || r.createdAt || r.created_at,
                    provider_name: r.provider?.name || r.provider_name || 'Healthcare Provider',
                    diagnosis: formatDiagnosis(r.diagnosis),
                    vitals: r.vitalSigns || r.vital_signs || r.vitals || {},
                    medications: r.medications || []
                }));
                console.log('Loaded medical records:', state.medicalRecords);
                renderMedicalRecords();
                updateVitals();
            }
        } catch (error) {
            console.error('Records error:', error);
        }
    }

    function formatDiagnosis(diagnosis) {
        if (!diagnosis) return 'Medical Visit';
        if (typeof diagnosis === 'string') return diagnosis;
        if (Array.isArray(diagnosis)) {
            if (diagnosis.length === 0) return 'Medical Visit';
            // If array of objects with description
            if (diagnosis[0] && diagnosis[0].description) {
                return diagnosis.map(d => d.description).join(', ');
            }
            return diagnosis.join(', ');
        }
        return 'Medical Visit';
    }

    // =========================================================================
    // Rendering - Patient Info
    // =========================================================================
    function renderPatientInfo() {
        const p = state.patient;
        if (!p) return;

        // API returns camelCase - support both formats for compatibility
        const firstName = p.firstName || p.first_name || '';
        const lastName = p.lastName || p.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Patient';
        const initials = getInitials(fullName);
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0891b2&color=fff&size=240`;
        const avatarUrl = p.photo || defaultAvatar;

        // Update greeting
        const welcomeEl = document.getElementById('welcomeText');
        if (welcomeEl) {
            const hour = new Date().getHours();
            let greeting = 'Good morning';
            if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
            if (hour >= 17) greeting = 'Good evening';
            welcomeEl.textContent = `${greeting}, ${firstName || 'Patient'}`;
        }

        // Update all avatars (including overview)
        updateAvatars(avatarUrl);

        // Sidebar user
        setTextContent('sidebarName', fullName);

        // Get values with camelCase fallback
        const gender = p.gender || 'N/A';
        const bloodGroup = p.bloodGroup || p.blood_group || '--';
        const email = p.email || '--';
        const dateOfBirth = p.dateOfBirth || p.date_of_birth;
        const contactNumber = p.contactNumber || p.contact_number || '--';
        const address = p.address || '--';
        const district = p.district || '--';
        const village = p.village || '--';
        const nin = p.nin || '--';
        const genotype = p.genotype || '--';
        const height = p.height;
        const weight = p.weight;
        const bmi = p.bmi;
        const bmiCategory = p.bmiCategory || p.bmi_category;
        const eyeColor = p.eyeColor || p.eye_color || '--';
        const hairColor = p.hairColor || p.hair_color || '--';
        const skinTone = p.skinTone || p.skin_tone || '--';
        const nationality = p.nationality || '--';
        
        // Overview Quick Profile Card
        setTextContent('overviewName', fullName);
        setTextContent('overviewEmail', email);
        setTextContent('overviewGender', gender);
        setTextContent('overviewBlood', bloodGroup);
        setTextContent('overviewPhone', contactNumber);
        setTextContent('overviewDOB', formatDate(dateOfBirth) || '--');
        const tribe = p.tribe || '--';
        const foodAllergies = p.foodAllergies || p.food_allergies || [];
        const medAllergies = p.medicationAllergies || p.medication_allergies || [];
        const conditions = p.chronicConditions || p.chronic_conditions || [];
        const medHistory = p.medicalHistory || p.medical_history || [];
        const nokName = p.nextOfKinName || p.next_of_kin_name || '--';
        const nokRelation = p.nextOfKinRelationship || p.next_of_kin_relationship || '--';
        const nokContact = p.nextOfKinContact || p.next_of_kin_contact || '--';

        // Full profile page header
        setTextContent('fullProfileName', fullName);
        setTextContent('fullProfileEmail', email);
        setTextContent('fullProfileGender', gender);
        setTextContent('fullProfileBlood', bloodGroup);
        setTextContent('fullProfilePhone', contactNumber);

        if (dateOfBirth) {
            const age = calculateAge(dateOfBirth);
            setTextContent('fullProfileAge', `${age} yrs`);
        }

        // Detail rows (view mode) - Personal Information
        setTextContent('detailFirstName', firstName || '--');
        setTextContent('detailLastName', lastName || '--');
        setTextContent('detailDOB', formatDate(dateOfBirth) || '--');
        setTextContent('detailGender', gender);
        setTextContent('detailContact', contactNumber);
        setTextContent('detailEmail', email);
        setTextContent('detailNIN', nin);
        setTextContent('detailAddress', address);
        setTextContent('detailDistrict', district);
        setTextContent('detailVillage', village);
        setTextContent('detailNationality', nationality);
        setTextContent('detailTribe', tribe);

        // Medical Information
        setTextContent('detailBloodGroup', bloodGroup);
        setTextContent('detailGenotype', genotype);
        setTextContent('detailHeight', height ? `${height} cm` : '--');
        setTextContent('detailWeight', weight ? `${weight} kg` : '--');
        setTextContent('detailBMI', bmi ? `${bmi} (${bmiCategory || 'N/A'})` : '--');
        setTextContent('detailEyeColor', eyeColor);
        setTextContent('detailHairColor', hairColor);
        setTextContent('detailSkinTone', skinTone);
        
        // Format arrays for display
        const foodAllergyStr = Array.isArray(foodAllergies) && foodAllergies.length > 0 
            ? foodAllergies.join(', ') : 'None reported';
        const medAllergyStr = Array.isArray(medAllergies) && medAllergies.length > 0 
            ? medAllergies.join(', ') : 'None reported';
        const conditionsStr = Array.isArray(conditions) && conditions.length > 0 
            ? conditions.join(', ') : 'None reported';
        const medHistoryStr = Array.isArray(medHistory) && medHistory.length > 0 
            ? medHistory.join(', ') : 'None reported';
        
        setTextContent('detailFoodAllergies', foodAllergyStr);
        setTextContent('detailMedAllergies', medAllergyStr);
        setTextContent('detailConditions', conditionsStr);
        setTextContent('detailMedHistory', medHistoryStr);

        // Emergency Contact
        setTextContent('detailNOKName', nokName);
        setTextContent('detailNOKRelation', nokRelation);
        setTextContent('detailNOKContact', nokContact);
    }

    // =========================================================================
    // Rendering - Appointments
    // =========================================================================
    function renderAppointments() {
        const appts = state.appointments;
        const now = new Date();

        const upcoming = appts.filter(a => {
            const date = new Date(a.appointment_date || a.date);
            return date >= now && a.status !== 'cancelled';
        }).sort((a, b) => new Date(a.appointment_date || a.date) - new Date(b.appointment_date || b.date));

        const badge = document.getElementById('navApptBadge');
        if (badge) {
            badge.textContent = upcoming.length;
            badge.style.display = upcoming.length > 0 ? 'inline-flex' : 'none';
        }

        const listEl = document.getElementById('appointmentsList');
        if (listEl) {
            if (upcoming.length === 0) {
                listEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <p>No upcoming appointments</p>
                    </div>`;
            } else {
                listEl.innerHTML = upcoming.slice(0, 3).map(a => createAppointmentItem(a)).join('');
            }
        }

        const allListEl = document.getElementById('allAppointmentsList');
        if (allListEl) {
            const sorted = [...appts].sort((a, b) => 
                new Date(b.appointment_date || b.date) - new Date(a.appointment_date || a.date)
            );

            if (sorted.length === 0) {
                allListEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <p>No appointments found</p>
                    </div>`;
            } else {
                allListEl.innerHTML = sorted.map(a => createAppointmentItem(a)).join('');
            }
        }

        renderCalendar();
    }

    function createAppointmentItem(appt) {
        const dateStr = appt.appointment_date || appt.date;
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const time = appt.appointment_time || extractTimeFromDate(dateStr) || '09:00';
        const type = appt.appointment_type || appt.reason || 'Consultation';
        const provider = appt.provider_name || 'Healthcare Provider';
        const status = appt.status || 'scheduled';

        const statusClass = {
            'scheduled': 'scheduled',
            'confirmed': 'confirmed',
            'completed': 'completed',
            'cancelled': 'cancelled'
        }[status.toLowerCase()] || 'scheduled';

        return `
            <div class="appointment-item">
                <div class="appt-date-badge">
                    <div class="appt-day">${day}</div>
                    <div class="appt-month">${month}</div>
                </div>
                <div class="appt-details">
                    <div class="appt-title">${type}</div>
                    <div class="appt-meta">
                        <span><i class="fas fa-clock"></i> ${formatTime(time)}</span>
                        <span><i class="fas fa-user-md"></i> ${provider}</span>
                    </div>
                </div>
                <span class="appt-status ${statusClass}">${status}</span>
            </div>`;
    }

    function extractTimeFromDate(dateStr) {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // =========================================================================
    // Rendering - Medical Records
    // =========================================================================
    let currentRecordsFilter = 'all';
    let currentRecordsSearch = '';
    let currentRecordsSort = 'newest';

    function renderMedicalRecords() {
        const records = state.medicalRecords;

        const sorted = [...records].sort((a, b) => 
            new Date(b.visit_date || b.date || b.created_at) - new Date(a.visit_date || a.date || a.created_at)
        );

        const listEl = document.getElementById('recordsList');
        if (listEl) {
            if (sorted.length === 0) {
                listEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <p>No medical records found</p>
                    </div>`;
            } else {
                listEl.innerHTML = sorted.slice(0, 3).map(r => createRecordItem(r)).join('');
            }
        }

        // Update records summary stats
        updateRecordsSummary(records);
        
        // Render filtered records
        renderFilteredRecords();
    }

    function updateRecordsSummary(records) {
        // Total count
        setTextContent('totalRecordsCount', records.length);
        setTextContent('countAll', records.length);
        
        // This year count
        const thisYear = new Date().getFullYear();
        const thisYearRecords = records.filter(r => {
            const date = new Date(r.visit_date || r.visitDate || r.date || r.created_at);
            return date.getFullYear() === thisYear;
        });
        setTextContent('thisYearRecords', thisYearRecords.length);
        
        // Last visit date
        if (records.length > 0) {
            const sorted = [...records].sort((a, b) => 
                new Date(b.visit_date || b.date || b.created_at) - new Date(a.visit_date || a.date || a.created_at)
            );
            const lastDate = new Date(sorted[0].visit_date || sorted[0].date || sorted[0].created_at);
            setTextContent('lastRecordDate', formatShortDate(lastDate));
        }
        
        // Category counts
        const categories = { consultation: 0, lab: 0, imaging: 0, prescription: 0 };
        records.forEach(r => {
            const type = (r.record_type || r.type || '').toLowerCase();
            const diagnosis = (r.diagnosis || '').toLowerCase();
            
            if (type.includes('lab') || diagnosis.includes('lab') || diagnosis.includes('test')) {
                categories.lab++;
            } else if (type.includes('imaging') || type.includes('xray') || diagnosis.includes('scan')) {
                categories.imaging++;
            } else if (type.includes('prescription') || diagnosis.includes('prescription')) {
                categories.prescription++;
            } else {
                categories.consultation++;
            }
        });
        
        setTextContent('countConsultation', categories.consultation);
        setTextContent('countLab', categories.lab);
        setTextContent('countImaging', categories.imaging);
        setTextContent('countPrescription', categories.prescription);
    }

    function renderFilteredRecords() {
        let records = [...state.medicalRecords];
        
        // Apply filter
        if (currentRecordsFilter !== 'all') {
            records = records.filter(r => {
                const type = (r.record_type || r.type || '').toLowerCase();
                const diagnosis = (r.diagnosis || '').toLowerCase();
                
                switch (currentRecordsFilter) {
                    case 'lab':
                        return type.includes('lab') || diagnosis.includes('lab') || diagnosis.includes('test');
                    case 'imaging':
                        return type.includes('imaging') || type.includes('xray') || diagnosis.includes('scan');
                    case 'prescription':
                        return type.includes('prescription') || diagnosis.includes('prescription');
                    case 'consultation':
                        return !type.includes('lab') && !type.includes('imaging') && !type.includes('prescription') &&
                               !diagnosis.includes('lab') && !diagnosis.includes('test') && !diagnosis.includes('scan');
                    default:
                        return true;
                }
            });
        }
        
        // Apply search
        if (currentRecordsSearch) {
            const search = currentRecordsSearch.toLowerCase();
            records = records.filter(r => {
                const diagnosis = (r.diagnosis || '').toLowerCase();
                const provider = (r.provider_name || r.provider?.name || '').toLowerCase();
                const notes = (r.notes || '').toLowerCase();
                return diagnosis.includes(search) || provider.includes(search) || notes.includes(search);
            });
        }
        
        // Apply sort
        records.sort((a, b) => {
            const dateA = new Date(a.visit_date || a.date || a.created_at);
            const dateB = new Date(b.visit_date || b.date || b.created_at);
            
            switch (currentRecordsSort) {
                case 'oldest':
                    return dateA - dateB;
                case 'provider':
                    const provA = (a.provider_name || a.provider?.name || '').toLowerCase();
                    const provB = (b.provider_name || b.provider?.name || '').toLowerCase();
                    return provA.localeCompare(provB);
                default: // newest
                    return dateB - dateA;
            }
        });
        
        const allListEl = document.getElementById('allRecordsList');
        if (allListEl) {
            if (records.length === 0) {
                allListEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <p>${currentRecordsSearch ? 'No records match your search' : 'No records in this category'}</p>
                    </div>`;
            } else {
                allListEl.innerHTML = records.map(r => createRecordItem(r)).join('');
            }
        }
    }

    // Debounce helper
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Live search from database
    async function searchRecordsFromDB(query) {
        if (!query || query.length < 2) {
            hideSearchDropdown();
            return;
        }

        const loader = document.getElementById('searchLoader');
        const dropdown = document.getElementById('searchResultsDropdown');
        
        if (loader) loader.style.display = 'inline';

        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/medical-records/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const records = data.records || data.data || data || [];
                displaySearchResults(records, query);
            } else {
                // Fallback to local search if API doesn't support search
                const localResults = searchLocalRecords(query);
                displaySearchResults(localResults, query);
            }
        } catch (error) {
            console.log('Database search not available, using local search');
            const localResults = searchLocalRecords(query);
            displaySearchResults(localResults, query);
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }

    function searchLocalRecords(query) {
        const search = query.toLowerCase();
        return state.medicalRecords.filter(r => {
            const diagnosis = (r.diagnosis || '').toLowerCase();
            const provider = (r.provider_name || r.provider?.name || '').toLowerCase();
            const notes = (r.notes || '').toLowerCase();
            const facility = (r.facility_name || r.facility || '').toLowerCase();
            return diagnosis.includes(search) || provider.includes(search) || 
                   notes.includes(search) || facility.includes(search);
        });
    }

    function displaySearchResults(records, query) {
        const dropdown = document.getElementById('searchResultsDropdown');
        if (!dropdown) return;

        if (records.length === 0) {
            dropdown.innerHTML = `<div class="search-no-results"><i class="fas fa-search"></i> No records found for "${query}"</div>`;
        } else {
            dropdown.innerHTML = records.slice(0, 5).map(r => {
                const date = formatDate(r.visit_date || r.visitDate || r.date || r.created_at);
                const diagnosis = r.diagnosis || 'Medical Visit';
                const provider = r.provider_name || r.provider?.name || 'Provider';
                
                let icon = 'fa-file-medical';
                const type = (r.record_type || r.type || '').toLowerCase();
                if (type.includes('lab')) icon = 'fa-flask';
                if (type.includes('imaging')) icon = 'fa-x-ray';
                if (type.includes('prescription')) icon = 'fa-prescription';

                return `
                    <div class="search-result-item" data-record-id="${r.id}">
                        <div class="search-result-icon"><i class="fas ${icon}"></i></div>
                        <div class="search-result-info">
                            <div class="search-result-title">${highlightMatch(diagnosis, query)}</div>
                            <div class="search-result-meta">${provider} • ${date}</div>
                        </div>
                    </div>
                `;
            }).join('');

            // Add click handlers to results
            dropdown.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const recordId = item.dataset.recordId;
                    // Filter to show only this record
                    currentRecordsSearch = query;
                    renderFilteredRecords();
                    hideSearchDropdown();
                });
            });
        }

        dropdown.style.display = 'block';
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<strong style="color: var(--primary-600);">$1</strong>');
    }

    function hideSearchDropdown() {
        const dropdown = document.getElementById('searchResultsDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }

    function updateHealthInsights() {
        const records = state.medicalRecords;
        
        // Checkup insight
        const checkupEl = document.getElementById('insightCheckup');
        if (checkupEl) {
            if (records.length === 0) {
                checkupEl.textContent = 'Schedule your first checkup';
            } else {
                const sorted = [...records].sort((a, b) => 
                    new Date(b.visit_date || b.date || b.created_at) - new Date(a.visit_date || a.date || a.created_at)
                );
                const lastDate = new Date(sorted[0].visit_date || sorted[0].date || sorted[0].created_at);
                const daysSince = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
                
                if (daysSince > 180) {
                    checkupEl.textContent = `Last visit was ${daysSince} days ago`;
                } else if (daysSince > 90) {
                    checkupEl.textContent = 'Consider scheduling a checkup';
                } else {
                    checkupEl.textContent = 'Great! Recent checkup on file';
                }
            }
        }
        
        // Trend insight
        const trendEl = document.getElementById('insightTrend');
        if (trendEl) {
            const thisYear = new Date().getFullYear();
            const thisYearCount = records.filter(r => {
                const date = new Date(r.visit_date || r.date || r.created_at);
                return date.getFullYear() === thisYear;
            }).length;
            
            if (thisYearCount === 0) {
                trendEl.textContent = 'No visits recorded this year';
            } else if (thisYearCount >= 3) {
                trendEl.textContent = `${thisYearCount} visits this year - Active`;
            } else {
                trendEl.textContent = `${thisYearCount} visit(s) this year`;
            }
        }
    }

    function setupRecordsInteractions() {
        // Category filter buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentRecordsFilter = btn.dataset.filter;
                renderFilteredRecords();
            });
        });
        
        // Search input with live database search
        const searchInput = document.getElementById('recordsSearchInput');
        if (searchInput) {
            const debouncedSearch = debounce((value) => {
                searchRecordsFromDB(value);
            }, 300);

            searchInput.addEventListener('input', (e) => {
                const value = e.target.value;
                currentRecordsSearch = value;
                
                if (value.length >= 2) {
                    debouncedSearch(value);
                } else {
                    hideSearchDropdown();
                    renderFilteredRecords();
                }
            });

            // Hide dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.records-search-panel')) {
                    hideSearchDropdown();
                }
            });

            // Handle Enter key to apply filter
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    hideSearchDropdown();
                    renderFilteredRecords();
                }
            });
        }
        
        // Sort select
        const sortSelect = document.getElementById('recordsSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentRecordsSort = e.target.value;
                renderFilteredRecords();
            });
        }

        // Update health insights
        updateHealthInsights();
    }

    function createRecordItem(record) {
        const date = formatDate(record.visit_date || record.visitDate || record.date || record.created_at);
        const diagnosis = record.diagnosis || 'Medical Visit';
        const provider = record.provider_name || record.provider?.name || 'Healthcare Provider';
        const facility = record.facility_name || record.facility || '';
        const notes = record.notes || '';

        let icon = 'fa-file-medical';
        const type = (record.record_type || record.type || '').toLowerCase();
        const diagLower = (typeof diagnosis === 'string' ? diagnosis : '').toLowerCase();
        
        if (type.includes('lab') || diagLower.includes('lab') || diagLower.includes('test')) icon = 'fa-flask';
        if (type.includes('imaging') || type.includes('xray') || diagLower.includes('xray') || diagLower.includes('scan')) icon = 'fa-x-ray';
        if (type.includes('prescription') || diagLower.includes('prescription')) icon = 'fa-prescription';

        return `
            <div class="record-item">
                <div class="record-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="record-details">
                    <div class="record-title">${diagnosis}</div>
                    <div class="record-meta">
                        <span><i class="fas fa-user-md"></i> ${provider}</span>
                        ${facility ? `<span><i class="fas fa-hospital"></i> ${facility}</span>` : ''}
                    </div>
                    ${notes ? `<div class="record-notes" style="font-size: 0.8rem; color: var(--gray-500); margin-top: 4px;"><i class="fas fa-sticky-note"></i> ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}</div>` : ''}
                </div>
                <div class="record-date">${date}</div>
            </div>`;
    }

    // =========================================================================
    // Stats & Vitals
    // =========================================================================
    function updateStats() {
        const upcoming = state.appointments.filter(a => {
            const date = new Date(a.appointment_date || a.date);
            return date >= new Date() && a.status !== 'cancelled';
        });
        setTextContent('statAppointments', upcoming.length);
        setTextContent('statRecords', state.medicalRecords.length);

        let medsCount = 0;
        state.medicalRecords.forEach(r => {
            if (r.prescription && Array.isArray(r.prescription)) {
                medsCount += r.prescription.length;
            } else if (r.medications && Array.isArray(r.medications)) {
                medsCount += r.medications.length;
            }
        });
        setTextContent('statMeds', medsCount);

        // Update health summary card on profile page
        setTextContent('healthAppointments', state.appointments.length);
        setTextContent('healthRecords', state.medicalRecords.length);
        
        // Calculate health score (example logic)
        let healthScore = 85;
        if (state.medicalRecords.length > 5) healthScore = 90;
        if (upcoming.length > 0) healthScore = Math.min(95, healthScore + 5);
        setTextContent('healthScore', healthScore);
        
        // Update the SVG circle fill
        const meterFill = document.getElementById('healthMeterFill');
        if (meterFill) {
            const dashOffset = 251 * (1 - healthScore / 100);
            meterFill.style.strokeDashoffset = dashOffset;
        }

        if (state.medicalRecords.length > 0) {
            const sorted = [...state.medicalRecords].sort((a, b) => 
                new Date(b.visit_date || b.visitDate || b.date || b.created_at) - new Date(a.visit_date || a.visitDate || a.date || a.created_at)
            );
            const lastRecord = sorted[0];
            const lastDate = new Date(lastRecord.visit_date || lastRecord.visitDate || lastRecord.date || lastRecord.created_at);
            setTextContent('statLastVisit', formatShortDate(lastDate));

            const daysAgo = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
            const trendEl = document.getElementById('statLastVisitTrend');
            if (trendEl) {
                if (daysAgo === 0) {
                    trendEl.innerHTML = '<i class="fas fa-check"></i> Today';
                } else if (daysAgo === 1) {
                    trendEl.innerHTML = '<i class="fas fa-history"></i> Yesterday';
                } else {
                    trendEl.innerHTML = `<i class="fas fa-history"></i> ${daysAgo}d ago`;
                }
            }
        }
    }

    function updateVitals() {
        // Get records that have vital signs
        const records = state.medicalRecords.filter(r => {
            const v = r.vitals || r.vitalSigns || {};
            return v.bloodPressure || v.blood_pressure || v.heartRate || v.heart_rate || v.temperature;
        });

        if (records.length === 0) {
            // If no vitals in records, try to get from patient data
            if (state.patient) {
                const weight = state.patient.weight;
                if (weight) {
                    setTextContent('vitalWeight', `${weight} kg`);
                }
            }
            return;
        }

        const latest = records.sort((a, b) => 
            new Date(b.visit_date || b.visitDate || b.created_at) - new Date(a.visit_date || a.visitDate || a.created_at)
        )[0];

        const vitals = latest.vitals || latest.vitalSigns || latest;

        // Handle camelCase and snake_case field names
        const bp = vitals.bloodPressure || vitals.blood_pressure || vitals.bp;
        const hr = vitals.heartRate || vitals.heart_rate || vitals.pulse;
        const temp = vitals.temperature || vitals.temp;
        const weight = vitals.weight || (state.patient && state.patient.weight);

        if (bp) {
            setTextContent('vitalBP', bp);
        }
        if (hr) {
            setTextContent('vitalHR', `${hr} bpm`);
        }
        if (temp) {
            setTextContent('vitalTemp', `${temp}°C`);
        }
        if (weight) {
            setTextContent('vitalWeight', `${weight} kg`);
        }
    }

    // =========================================================================
    // Toast Notifications
    // =========================================================================
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast-notification ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // =========================================================================
    // Utility Functions
    // =========================================================================
    function setTextContent(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function getInitials(name) {
        return name.split(' ')
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'P';
    }

    function calculateAge(dateString) {
        const birth = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    function formatDate(dateString) {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    function formatShortDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function formatTime(timeString) {
        if (!timeString) return '--';
        const [hours, minutes] = timeString.split(':');
        const h = parseInt(hours);
        const suffix = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${suffix}`;
    }

    // =========================================================================
    // Notifications System
    // =========================================================================
    let currentNotifFilter = 'all';

    function setupNotifications() {
        const markAllBtn = document.getElementById('markAllReadBtn');
        const viewAllBtn = document.getElementById('viewAllNotifications');
        const markAllPageBtn = document.getElementById('markAllReadPageBtn');
        const clearAllBtn = document.getElementById('clearAllNotifsBtn');
        
        if (markAllBtn) {
            markAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                markAllNotificationsRead();
            });
        }
        
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo('notifications');
                // Close dropdown
                const dropdown = document.getElementById('notificationDropdown');
                if (dropdown) {
                    const bsDropdown = bootstrap.Dropdown.getInstance(document.getElementById('notificationBell'));
                    if (bsDropdown) bsDropdown.hide();
                }
            });
        }
        
        if (markAllPageBtn) {
            markAllPageBtn.addEventListener('click', () => {
                markAllNotificationsRead();
            });
        }
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all notifications?')) {
                    state.notifications = [];
                    saveNotifications();
                    renderNotifications();
                    renderNotificationsPage();
                }
            });
        }
        
        // Filter tabs
        document.querySelectorAll('.notif-filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.notif-filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentNotifFilter = tab.dataset.filter;
                renderNotificationsPage();
            });
        });
        
        // Load notifications
        loadNotifications();
    }

    const NOTIFICATIONS_STORAGE_KEY = 'hie_patient_notifications';
    
    function loadStoredNotifications() {
        try {
            const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error loading stored notifications:', e);
        }
        return [];
    }
    
    function saveNotifications() {
        try {
            // Keep only last 50 notifications
            const toSave = state.notifications.slice(0, 50);
            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(toSave));
        } catch (e) {
            console.error('Error saving notifications:', e);
        }
    }

    async function loadNotifications() {
        try {
            // Load stored notifications first
            const storedNotifications = loadStoredNotifications();
            console.log('Stored notifications:', storedNotifications.length);
            
            // Generate new notifications based on appointments and other data
            const newNotifications = [];
            
            // Always add a welcome/info notification if none exist
            const hasWelcome = storedNotifications.some(n => n.id && n.id.startsWith('welcome-'));
            const lastLoginNotif = sessionStorage.getItem('loginNotificationShown');
            
            if (!hasWelcome && !lastLoginNotif) {
                newNotifications.push({
                    id: 'welcome-' + Date.now(),
                    type: 'info',
                    title: 'Welcome Back!',
                    message: 'You are now logged in to your patient portal. Check your appointments and medical records.',
                    time: new Date().toISOString(),
                    read: false,
                    navigateTo: 'overview',
                    actionText: 'Go to Dashboard'
                });
                sessionStorage.setItem('loginNotificationShown', 'true');
            }
            
            // Check upcoming appointments
            if (state.appointments && state.appointments.length > 0) {
                const now = new Date();
                const upcoming = state.appointments.filter(apt => {
                    const aptDate = new Date(apt.date || apt.appointment_date);
                    return aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed');
                });
                
                upcoming.forEach((apt, index) => {
                    const aptDate = new Date(apt.date || apt.appointment_date);
                    const daysUntil = Math.ceil((aptDate - now) / (1000 * 60 * 60 * 24));
                    
                    if (daysUntil <= 3) {
                        const notifId = `apt-${apt.id}`;
                        // Only add if not already in stored notifications
                        if (!storedNotifications.find(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'appointment',
                                title: 'Upcoming Appointment',
                                message: daysUntil === 0 
                                    ? `You have an appointment today with ${apt.provider_name || 'your provider'}` 
                                    : daysUntil === 1 
                                        ? `Appointment tomorrow with ${apt.provider_name || 'your provider'}`
                                        : `Appointment in ${daysUntil} days`,
                                time: new Date().toISOString(),
                                read: false,
                                navigateTo: 'appointments',
                                actionText: 'View Appointments',
                                appointmentId: apt.id,
                                appointmentDate: apt.date || apt.appointment_date
                            });
                        }
                    }
                });
            }
            
            // Check for recent medical records (last 7 days)
            if (state.medicalRecords && state.medicalRecords.length > 0) {
                const now = new Date();
                const recentRecords = state.medicalRecords.filter(r => {
                    const recordDate = new Date(r.visit_date || r.visitDate || r.date || r.created_at);
                    const daysSince = Math.floor((now - recordDate) / (1000 * 60 * 60 * 24));
                    return daysSince <= 7;
                });
                
                recentRecords.forEach((record, index) => {
                    if (index < 2) { // Limit to 2 recent record notifications
                        const notifId = `record-${record.id}`;
                        // Only add if not already in stored notifications
                        if (!storedNotifications.find(n => n.id === notifId)) {
                            newNotifications.push({
                                id: notifId,
                                type: 'record',
                                title: 'New Medical Record',
                                message: `New record added: ${record.diagnosis || 'Medical Visit'}`,
                                time: record.visit_date || record.visitDate || record.date || record.created_at,
                                read: false,
                                navigateTo: 'records',
                                actionText: 'View Records',
                                recordId: record.id
                            });
                        }
                    }
                });
            }
            
            // Profile completion reminder
            if (state.patient) {
                const p = state.patient;
                const missingFields = [];
                if (!p.contactNumber && !p.contact_number) missingFields.push('contact number');
                if (!p.address) missingFields.push('address');
                if (!p.bloodGroup && !p.blood_group) missingFields.push('blood group');
                if (!p.nextOfKinName && !p.next_of_kin_name) missingFields.push('emergency contact');
                
                if (missingFields.length > 0) {
                    const notifId = 'profile-incomplete';
                    // Only add if not already in stored notifications or it's been read
                    const existingProfile = storedNotifications.find(n => n.id === notifId);
                    if (!existingProfile || existingProfile.read) {
                        // Remove old one if it was read
                        const filteredStored = storedNotifications.filter(n => n.id !== notifId);
                        storedNotifications.length = 0;
                        storedNotifications.push(...filteredStored);
                        
                        if (!existingProfile) {
                            newNotifications.push({
                                id: notifId,
                                type: 'warning',
                                title: 'Complete Your Profile',
                                message: `Add your ${missingFields.slice(0, 2).join(', ')} for better healthcare service.`,
                                time: new Date().toISOString(),
                                read: false,
                                navigateTo: 'profile',
                                actionText: 'Update Profile'
                            });
                        }
                    }
                }
            }
            
            // Merge: new notifications first, then stored (preserving read status from stored)
            state.notifications = [...newNotifications, ...storedNotifications];
            
            // If still no notifications, add a default info notification
            if (state.notifications.length === 0) {
                state.notifications.push({
                    id: 'default-info-' + Date.now(),
                    type: 'info',
                    title: 'Stay Informed',
                    message: 'You will receive notifications about your appointments, medical records, and important updates here.',
                    time: new Date().toISOString(),
                    read: false,
                    navigateTo: 'overview',
                    actionText: 'Go to Dashboard'
                });
            }
            
            // Sort by time (newest first)
            state.notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
            
            console.log('Final notifications count:', state.notifications.length);
            
            // Save merged notifications
            saveNotifications();
            
            renderNotifications();
            renderNotificationsPage();
            
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    function renderNotifications() {
        const list = document.getElementById('notificationList');
        const badge = document.getElementById('notificationBadge');
        const noNotifications = document.getElementById('noNotifications');
        
        if (!list || !badge) return;
        
        const unreadCount = state.notifications.filter(n => !n.read).length;
        
        // Update badge
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
        
        // Update list
        if (state.notifications.length === 0) {
            if (noNotifications) noNotifications.style.display = 'block';
            return;
        }
        
        if (noNotifications) noNotifications.style.display = 'none';
        
        list.innerHTML = state.notifications.slice(0, 5).map(n => {
            const timeAgo = getTimeAgo(n.time);
            const icon = getNotificationIcon(n.type);
            
            return `
                <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}" data-navigate="${n.navigateTo || ''}">
                    <div class="notification-icon ${n.type}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${escapeHtml(n.title)}</div>
                        <div class="notification-message">${escapeHtml(n.message)}</div>
                        <div class="notification-time"><i class="far fa-clock me-1"></i>${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers to navigate
        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const navigateTarget = item.dataset.navigate;
                
                markNotificationRead(id);
                
                // Navigate to the target section
                if (navigateTarget) {
                    // Close the dropdown first
                    const bsDropdown = bootstrap.Dropdown.getInstance(document.getElementById('notificationBell'));
                    if (bsDropdown) bsDropdown.hide();
                    
                    navigateTo(navigateTarget);
                    
                    // If it's an appointment, try to select the date on calendar
                    const notification = state.notifications.find(n => n.id === id);
                    if (notification && notification.appointmentDate) {
                        setTimeout(() => {
                            const dateStr = new Date(notification.appointmentDate).toISOString().split('T')[0];
                            state.selectedCalendarDate = new Date(notification.appointmentDate);
                            renderCalendar();
                            showAppointmentsForDate(dateStr);
                        }, 100);
                    }
                }
            });
        });
    }

    function renderNotificationsPage() {
        const list = document.getElementById('notificationsPageList');
        const countEl = document.getElementById('allNotifCount');
        
        if (!list) {
            console.log('Notifications page list element not found');
            return;
        }
        
        console.log('Rendering notifications page. Total notifications:', state.notifications.length);
        
        // Filter notifications
        let filteredNotifications = [...state.notifications];
        
        if (currentNotifFilter === 'unread') {
            filteredNotifications = filteredNotifications.filter(n => !n.read);
        } else if (currentNotifFilter !== 'all') {
            filteredNotifications = filteredNotifications.filter(n => n.type === currentNotifFilter);
        }
        
        // Update count
        if (countEl) {
            const unreadCount = state.notifications.filter(n => !n.read).length;
            countEl.textContent = `${state.notifications.length} notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`;
        }
        
        if (filteredNotifications.length === 0) {
            list.innerHTML = `
                <div class="no-notifications-page">
                    <i class="fas fa-bell-slash"></i>
                    <h3>No Notifications</h3>
                    <p>${currentNotifFilter === 'all' ? "You're all caught up! Check back later for updates." : `No ${currentNotifFilter} notifications found.`}</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = filteredNotifications.map(n => {
            const timeAgo = getTimeAgo(n.time);
            const icon = getNotificationIcon(n.type);
            
            return `
                <div class="notification-page-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
                    <div class="notification-page-icon ${n.type}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="notification-page-content">
                        <div class="notification-page-title">${escapeHtml(n.title)}</div>
                        <div class="notification-page-message">${escapeHtml(n.message)}</div>
                        <div class="notification-page-meta">
                            <span class="notification-page-time"><i class="far fa-clock"></i> ${timeAgo}</span>
                            ${n.actionText ? `<span class="notification-page-action" data-navigate="${n.navigateTo}">${n.actionText} <i class="fas fa-arrow-right"></i></span>` : ''}
                        </div>
                    </div>
                    <div class="notification-page-actions">
                        ${n.navigateTo ? `<button class="btn-notif-go" data-navigate="${n.navigateTo}" data-id="${n.id}"><i class="fas fa-external-link-alt"></i> Go</button>` : ''}
                        <button class="btn-notif-dismiss" data-id="${n.id}"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        list.querySelectorAll('.notification-page-item').forEach(item => {
            // Click on item to mark as read
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.notification-page-actions') && !e.target.closest('.notification-page-action')) {
                    const id = item.dataset.id;
                    markNotificationRead(id);
                    item.classList.remove('unread');
                }
            });
        });
        
        // Go button clicks
        list.querySelectorAll('.btn-notif-go').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const navigateTarget = btn.dataset.navigate;
                const id = btn.dataset.id;
                
                markNotificationRead(id);
                
                if (navigateTarget) {
                    navigateTo(navigateTarget);
                    
                    // If it's an appointment, try to select the date on calendar
                    const notification = state.notifications.find(n => n.id === id);
                    if (notification && notification.appointmentDate) {
                        setTimeout(() => {
                            const dateStr = new Date(notification.appointmentDate).toISOString().split('T')[0];
                            state.selectedCalendarDate = new Date(notification.appointmentDate);
                            renderCalendar();
                            showAppointmentsForDate(dateStr);
                        }, 100);
                    }
                }
            });
        });
        
        // Action text clicks
        list.querySelectorAll('.notification-page-action').forEach(action => {
            action.addEventListener('click', (e) => {
                e.stopPropagation();
                const navigateTarget = action.dataset.navigate;
                const item = action.closest('.notification-page-item');
                const id = item?.dataset.id;
                
                if (id) markNotificationRead(id);
                if (navigateTarget) navigateTo(navigateTarget);
            });
        });
        
        // Dismiss button clicks
        list.querySelectorAll('.btn-notif-dismiss').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                dismissNotification(id);
            });
        });
    }

    function dismissNotification(id) {
        state.notifications = state.notifications.filter(n => n.id !== id);
        saveNotifications();
        renderNotifications();
        renderNotificationsPage();
    }

    function getNotificationIcon(type) {
        switch (type) {
            case 'appointment': return 'fas fa-calendar-check';
            case 'record': return 'fas fa-file-medical';
            case 'success': return 'fas fa-check-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            case 'danger':
            case 'error': return 'fas fa-times-circle';
            default: return 'fas fa-info-circle';
        }
    }

    function getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    function markNotificationRead(id) {
        const notification = state.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            saveNotifications();
            renderNotifications();
        }
    }

    function markAllNotificationsRead() {
        state.notifications.forEach(n => n.read = true);
        saveNotifications();
        renderNotifications();
        renderNotificationsPage();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function playLoginNotifications() {
        // Only play sounds once per session (use same key as app.js to prevent double-playing)
        const sessionKey = 'hie_login_sounds_played';
        if (sessionStorage.getItem(sessionKey)) return;
        
        // Mark as played immediately to prevent double-playing
        sessionStorage.setItem(sessionKey, 'true');
        
        // Small delay to ensure notifications are loaded
        setTimeout(() => {
            const unreadCount = state.notifications.filter(n => !n.read).length;
            
            if (unreadCount > 0) {
                // Play sound for each notification with 500ms delay between each
                let soundsPlayed = 0;
                const playNextSound = () => {
                    if (soundsPlayed < unreadCount && soundsPlayed < 5) { // Max 5 sounds
                        notificationSound.play();
                        soundsPlayed++;
                        setTimeout(playNextSound, 500);
                    }
                };
                playNextSound();
            } else {
                // Always play at least a welcome sound for non-admin users
                notificationSound.play();
            }
        }, 500);
    }

    // Add new notification
    function addNotification(type, title, message, options = {}) {
        const notification = {
            id: options.id || 'notif-' + Date.now(),
            type: type,
            title: title,
            message: message,
            time: new Date().toISOString(),
            read: false,
            navigateTo: options.navigateTo || null,
            actionText: options.actionText || null
        };
        
        state.notifications.unshift(notification);
        saveNotifications();
        renderNotifications();
        renderNotificationsPage();
        notificationSound.play();
    }
    
    // Close persistent notification
    function closePersistentNotification() {
        const notification = document.getElementById('persistentNotification');
        if (notification) {
            notification.style.display = 'none';
        }
    }

    // Expose for external use
    window.PatientNotifications = {
        add: addNotification,
        refresh: loadNotifications
    };
    
    // Expose close function globally for onclick
    window.closePersistentNotification = closePersistentNotification;

})();
