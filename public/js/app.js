/**
 * Health Information Exchange System - Main JavaScript
 * Secure, clean, and modular API integration for Flask backend
 */

(function() {
    'use strict';

    // ========================================
    // Configuration
    // ========================================
    const CONFIG = {
        API_BASE_URL: window.location.origin + '/api',
        TOKEN_KEY: 'hie_token',
        USER_KEY: 'hie_user',
        NOTIFICATION_DURATION: 5000
    };

    // ========================================
    // State Management
    // ========================================
    const state = {
        token: localStorage.getItem(CONFIG.TOKEN_KEY),
        user: JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || 'null'),
        socket: null
    };

    // ========================================
    // Utility Functions
    // ========================================
    const utils = {
        /**
         * Safely escape HTML to prevent XSS attacks
         */
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        /**
         * Format date for display
         */
        formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },

        /**
         * Calculate Age
         */
        calculateAge(dateString) {
            if (!dateString) return 0;
            const today = new Date();
            const birthDate = new Date(dateString);
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        },

        /**
         * Format datetime for display
         */
        formatDateTime(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        /**
         * Debounce function for search inputs
         */
        debounce(func, wait) {
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
    };

    // ========================================
    // API Service
    // ========================================
    const api = {
        /**
         * Make authenticated API request
         */
        async request(endpoint, options = {}) {
            const url = `${CONFIG.API_BASE_URL}/${endpoint}`;
            
            // Always get fresh token from localStorage
            const token = localStorage.getItem(CONFIG.TOKEN_KEY);
            if (token) {
                state.token = token;
            }
            
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            // Add authorization header if token exists
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`;
            }

            try {
                const response = await fetch(url, {
                    ...options,
                    headers
                });

                const data = await response.json();

                // Handle unauthorized responses - but not for auth endpoints
                if (response.status === 401 && !endpoint.startsWith('auth/')) {
                    auth.clearAuth();
                    window.location.href = '/login.html';
                    throw new Error('Session expired. Please login again.');
                }

                if (!response.ok) {
                    throw new Error(data.error || data.message || 'Request failed');
                }

                return data;
            } catch (error) {
                console.error(`API Error [${endpoint}]:`, error);
                throw error;
            }
        },

        // Auth endpoints
        async login(email, password) {
            return this.request('auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
        },

        async register(userData) {
            return this.request('auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        },

        async getMe() {
            return this.request('auth/me');
        },

        async forgotPassword(email) {
            return this.request('auth/forgotpassword', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
        },

        // Patient endpoints
        async getPatients() {
            return this.request('patients');
        },

        async getPatient(id) {
            return this.request(`patients/${id}`);
        },

        async createPatient(patientData) {
            return this.request('patients', {
                method: 'POST',
                body: JSON.stringify(patientData)
            });
        },

        async updatePatient(id, patientData) {
            return this.request(`patients/${id}`, {
                method: 'PUT',
                body: JSON.stringify(patientData)
            });
        },

        async deletePatient(id) {
            return this.request(`patients/${id}`, {
                method: 'DELETE'
            });
        },

        async searchPatients(query) {
            return this.request(`patients/search?q=${encodeURIComponent(query)}`);
        },

        // Appointment endpoints
        async getAppointments() {
            return this.request('appointments');
        },

        async getAppointmentsForPatient(patientId) {
            return this.request(`appointments?patient_id=${encodeURIComponent(patientId)}`);
        },

        async createAppointment(appointmentData) {
            return this.request('appointments', {
                method: 'POST',
                body: JSON.stringify(appointmentData)
            });
        },

        async updateAppointment(id, appointmentData) {
            return this.request(`appointments/${id}`, {
                method: 'PUT',
                body: JSON.stringify(appointmentData)
            });
        },

        async deleteAppointment(id) {
            return this.request(`appointments/${id}`, {
                method: 'DELETE'
            });
        },

        // Medical Record endpoints
        async getMedicalRecords() {
            return this.request('medical-records');
        },

        async getPatientRecords(patientId) {
            return this.request(`medical-records/patient/${patientId}`);
        },

        async createMedicalRecord(recordData) {
            return this.request('medical-records', {
                method: 'POST',
                body: JSON.stringify(recordData)
            });
        },

        async updateMedicalRecord(id, recordData) {
            return this.request(`medical-records/${id}`, {
                method: 'PUT',
                body: JSON.stringify(recordData)
            });
        },

        async deleteMedicalRecord(id) {
            return this.request(`medical-records/${id}`, {
                method: 'DELETE'
            });
        },

        // User endpoints
        async getUsers() {
            return this.request('users');
        },

        async getProviders() {
            return this.request('users/providers');
        },

        async updateUser(id, userData) {
            return this.request(`users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
        },

        async deleteUser(id) {
            return this.request(`users/${id}`, {
                method: 'DELETE'
            });
        }
    };

    // ========================================
    // Authentication Module
    // ========================================
    const auth = {
        /**
         * Check if user is authenticated
         */
        isAuthenticated() {
            // Always read fresh from localStorage to handle page loads after redirect
            const token = localStorage.getItem(CONFIG.TOKEN_KEY);
            const userStr = localStorage.getItem(CONFIG.USER_KEY);
            
            if (token && userStr) {
                state.token = token;
                try {
                    state.user = JSON.parse(userStr);
                } catch (e) {
                    state.user = null;
                }
            }
            
            return !!state.token && !!state.user;
        },

        /**
         * Get current user
         */
        getUser() {
            return state.user;
        },

        /**
         * Save authentication data
         */
        saveAuth(token, user) {
            state.token = token;
            state.user = user;
            localStorage.setItem(CONFIG.TOKEN_KEY, token);
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
        },

        /**
         * Clear authentication data
         */
        clearAuth() {
            state.token = null;
            state.user = null;
            localStorage.removeItem(CONFIG.TOKEN_KEY);
            localStorage.removeItem(CONFIG.USER_KEY);
            localStorage.removeItem('hie_patient');
        },

        /**
         * Handle login
         */
        async login(email, password) {
            const response = await api.login(email, password);
            
            if (response.success && response.token) {
                // Ensure patient_id is included in user data for patient users
                const userData = response.user;
                if (response.patient && response.patient.id) {
                    userData.patient_id = response.patient.id;
                    userData.patientId = response.patient.id;
                }
                this.saveAuth(response.token, userData);
                
                // Also store the full patient data separately for quick access
                if (response.patient) {
                    localStorage.setItem('hie_patient', JSON.stringify(response.patient));
                }
                
                return true;
            }
            
            throw new Error(response.error || 'Login failed');
        },

        /**
         * Handle registration
         */
        async register(userData) {
            const response = await api.register(userData);
            
            if (response.success) {
                return response.message || 'Registration successful';
            }
            
            throw new Error(response.error || 'Registration failed');
        },

        /**
         * Handle logout - calls API to log the action
         */
        async logout() {
            try {
                // Call logout API to record the action
                await api.request('auth/logout', { method: 'POST' });
            } catch (error) {
                console.log('Logout API call failed, proceeding with local logout');
            }
            this.clearAuth();
            window.location.href = '/login.html';
        },

        /**
         * Require authentication (redirect if not authenticated)
         */
        requireAuth() {
            if (!this.isAuthenticated()) {
                window.location.href = '/login.html';
                return false;
            }
            return true;
        },

        /**
         * Check if user is admin
         */
        isAdmin() {
            return this.isAuthenticated() && state.user && state.user.role === 'admin';
        },

        /**
         * Require non-admin role (admins can't access provider dashboard)
         */
        requireNonAdmin() {
            if (!this.isAuthenticated()) {
                window.location.href = '/login.html';
                return false;
            }
            
            if (state.user.role === 'admin') {
                window.location.href = '/admin';
                return false;
            }
            
            return true;
        },

        /**
         * Check account status (blocked check)
         */
        async checkAccountStatus() {
            if (!this.isAuthenticated()) return;
            
            // Get fresh token
            const token = localStorage.getItem(CONFIG.TOKEN_KEY);
            if (!token) return;
            
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/auth/check-status`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                // Don't logout on network errors or 401 during status check
                if (response.status === 401) {
                    console.log('Status check returned 401, ignoring');
                    return;
                }
                
                const data = await response.json();
                
                if (data.blocked) {
                    this.showBlockedModal(data.blocked_reason);
                }
            } catch (error) {
                console.error('Error checking account status:', error);
            }
        },

        /**
         * Show blocked account modal
         */
        showBlockedModal(reason) {
            // Remove any existing modal
            const existingModal = document.getElementById('blockedAccountModal');
            if (existingModal) existingModal.remove();
            
            const modal = document.createElement('div');
            modal.id = 'blockedAccountModal';
            modal.className = 'blocked-modal-overlay';
            modal.innerHTML = `
                <div class="blocked-modal">
                    <div class="blocked-modal-icon">
                        <i class="fas fa-ban"></i>
                    </div>
                    <h2>Account Blocked</h2>
                    <p class="blocked-reason">${utils.escapeHtml(reason || 'Suspicious activity detected')}</p>
                    <div class="blocked-info">
                        <p>Your account has been blocked due to suspicious activity. You have been logged out for security reasons.</p>
                        <p>Please contact the system administrator to have your account reviewed and unblocked.</p>
                    </div>
                    <div class="blocked-contact">
                        <i class="fas fa-envelope me-2"></i>
                        <a href="mailto:admin@healthexchange.com">admin@healthexchange.com</a>
                    </div>
                    <button class="btn btn-primary blocked-btn" onclick="window.HIE.auth.handleBlockedLogout()">
                        <i class="fas fa-sign-out-alt me-2"></i>OK, I Understand
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Add styles if not already present
            if (!document.getElementById('blockedModalStyles')) {
                const styles = document.createElement('style');
                styles.id = 'blockedModalStyles';
                styles.textContent = `
                    .blocked-modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.85);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 99999;
                    }
                    .blocked-modal {
                        background: white;
                        padding: 40px;
                        border-radius: 16px;
                        text-align: center;
                        max-width: 450px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        animation: blockedModalIn 0.3s ease;
                    }
                    @keyframes blockedModalIn {
                        from { transform: scale(0.8); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                    .blocked-modal-icon {
                        width: 80px;
                        height: 80px;
                        background: linear-gradient(135deg, #dc3545, #c82333);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 20px;
                    }
                    .blocked-modal-icon i {
                        font-size: 40px;
                        color: white;
                    }
                    .blocked-modal h2 {
                        color: #dc3545;
                        margin-bottom: 15px;
                    }
                    .blocked-reason {
                        background: #fff3cd;
                        border: 1px solid #ffc107;
                        padding: 12px;
                        border-radius: 8px;
                        color: #856404;
                        font-weight: 500;
                        margin-bottom: 20px;
                    }
                    .blocked-info {
                        color: #6c757d;
                        margin-bottom: 20px;
                    }
                    .blocked-info p {
                        margin-bottom: 10px;
                    }
                    .blocked-contact {
                        background: #e9ecef;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 25px;
                    }
                    .blocked-contact a {
                        color: #0d6efd;
                        text-decoration: none;
                    }
                    .blocked-btn {
                        padding: 12px 30px;
                        font-size: 16px;
                    }
                `;
                document.head.appendChild(styles);
            }
        },

        /**
         * Handle logout after being blocked
         */
        handleBlockedLogout() {
            this.clearAuth();
            window.location.href = '/login.html';
        },

        /**
         * Require specific role
         */
        requireRole(...roles) {
            if (!this.isAuthenticated()) {
                window.location.href = '/login.html';
                return false;
            }
            
            if (!roles.includes(state.user.role)) {
                notifications.show('Access denied. Insufficient permissions.', 'error');
                return false;
            }
            
            return true;
        }
    };

    // ========================================
    // Notifications Module (Toast notifications)
    // ========================================
    const notifications = {
        container: null,

        /**
         * Initialize notification container
         */
        init() {
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'notification-area';
                document.body.appendChild(this.container);
            }
        },

        /**
         * Show notification
         */
        show(message, type = 'info') {
            this.init();
            
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <span>${utils.escapeHtml(message)}</span>
                    <button type="button" class="btn-close btn-close-sm ms-2" aria-label="Close"></button>
                </div>
            `;

            // Close button handler
            notification.querySelector('.btn-close').addEventListener('click', () => {
                this.dismiss(notification);
            });

            this.container.appendChild(notification);

            // Auto dismiss
            setTimeout(() => {
                this.dismiss(notification);
            }, CONFIG.NOTIFICATION_DURATION);

            return notification;
        },

        /**
         * Dismiss notification
         */
        dismiss(notification) {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                notification.remove();
            }, 300);
        },

        /**
         * Shorthand methods
         */
        success(message) {
            return this.show(message, 'success');
        },

        error(message) {
            return this.show(message, 'error');
        },

        warning(message) {
            return this.show(message, 'warning');
        },

        info(message) {
            return this.show(message, 'info');
        }
    };

    // ========================================
    // In-App Notification Center
    // ========================================
    const notificationCenter = {
        notifications: [],
        audioContext: null,
        STORAGE_KEY: 'hie_notifications',

        /**
         * Initialize notification center
         */
        init() {
            // Load from localStorage
            this.loadNotifications();
            this.render();
            this.setupEventListeners();
        },

        /**
         * Load notifications from localStorage
         */
        loadNotifications() {
            try {
                const stored = localStorage.getItem(this.STORAGE_KEY);
                this.notifications = stored ? JSON.parse(stored) : [];
            } catch (e) {
                this.notifications = [];
            }
        },

        /**
         * Save notifications to localStorage
         */
        saveNotifications() {
            try {
                // Keep only last 50 notifications
                if (this.notifications.length > 50) {
                    this.notifications = this.notifications.slice(-50);
                }
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.notifications));
            } catch (e) {
                console.error('Failed to save notifications');
            }
        },

        /**
         * Add a new notification
         */
        add(title, message, type = 'info', playSound = true) {
            const notification = {
                id: Date.now(),
                title,
                message,
                type,
                time: new Date().toISOString(),
                read: false
            };

            this.notifications.unshift(notification);
            this.saveNotifications();
            this.render();

            if (playSound) {
                this.playSound(type);
            }

            // Shake the bell
            this.shakeBell();

            return notification;
        },

        /**
         * Mark notification as read
         */
        markAsRead(id) {
            const notification = this.notifications.find(n => n.id === id);
            if (notification) {
                notification.read = true;
                this.saveNotifications();
                this.render();
            }
        },

        /**
         * Mark all as read
         */
        markAllAsRead() {
            this.notifications.forEach(n => n.read = true);
            this.saveNotifications();
            this.render();
        },

        /**
         * Clear all notifications
         */
        clearAll() {
            this.notifications = [];
            this.saveNotifications();
            this.render();
        },

        /**
         * Get unread count
         */
        getUnreadCount() {
            return this.notifications.filter(n => !n.read).length;
        },

        /**
         * Play notification sound
         */
        playSound(type = 'info') {
            try {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }

                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                // Different sounds for different types
                switch (type) {
                    case 'success':
                        oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
                        oscillator.frequency.setValueAtTime(1100, this.audioContext.currentTime + 0.1);
                        break;
                    case 'warning':
                        oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
                        oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime + 0.15);
                        break;
                    case 'danger':
                    case 'error':
                        oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
                        oscillator.frequency.setValueAtTime(180, this.audioContext.currentTime + 0.1);
                        break;
                    case 'appointment':
                        oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime);
                        oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1);
                        oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2);
                        break;
                    default: // info
                        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
                        break;
                }

                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.3);
            } catch (e) {
                console.log('Audio not available');
            }
        },

        /**
         * Shake the notification bell
         */
        shakeBell() {
            const bell = document.getElementById('notificationBell');
            if (bell) {
                const icon = bell.querySelector('i');
                if (icon) {
                    icon.classList.add('notification-bell-shake');
                    setTimeout(() => icon.classList.remove('notification-bell-shake'), 500);
                }
            }
        },

        /**
         * Render notifications in the dropdown
         */
        render() {
            const badge = document.getElementById('notificationBadge');
            const list = document.getElementById('notificationList');
            const noNotifications = document.getElementById('noNotifications');

            if (!badge || !list) return;

            const unreadCount = this.getUnreadCount();

            // Update badge
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }

            // Update list
            if (this.notifications.length === 0) {
                if (noNotifications) noNotifications.classList.remove('d-none');
                list.innerHTML = '';
                list.appendChild(noNotifications);
                return;
            }

            if (noNotifications) noNotifications.classList.add('d-none');

            list.innerHTML = this.notifications.map(n => {
                const timeAgo = this.getTimeAgo(n.time);
                const icon = this.getIcon(n.type);

                return `
                    <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
                        <div class="notification-icon ${n.type}">
                            <i class="${icon}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">${utils.escapeHtml(n.title)}</div>
                            <div class="notification-message">${utils.escapeHtml(n.message)}</div>
                            <div class="notification-time"><i class="far fa-clock me-1"></i>${timeAgo}</div>
                        </div>
                    </div>
                `;
            }).join('');

            // Add click handlers to mark as read
            list.querySelectorAll('.notification-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = parseInt(item.dataset.id);
                    this.markAsRead(id);
                });
            });
        },

        /**
         * Get icon based on type
         */
        getIcon(type) {
            switch (type) {
                case 'appointment': return 'fas fa-calendar-check';
                case 'success': return 'fas fa-check-circle';
                case 'warning': return 'fas fa-exclamation-triangle';
                case 'danger':
                case 'error': return 'fas fa-times-circle';
                default: return 'fas fa-info-circle';
            }
        },

        /**
         * Get time ago string
         */
        getTimeAgo(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const seconds = Math.floor((now - date) / 1000);

            if (seconds < 60) return 'Just now';
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
            if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
            return date.toLocaleDateString();
        },

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            const clearBtn = document.getElementById('clearAllNotifications');
            if (clearBtn) {
                clearBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.clearAll();
                });
            }

            // Mark all as read when dropdown opens
            const bellDropdown = document.getElementById('notificationBell');
            if (bellDropdown) {
                bellDropdown.addEventListener('shown.bs.dropdown', () => {
                    // Optional: mark all as read when opened
                    // this.markAllAsRead();
                });
            }
        }
    };

    // ========================================
    // Socket.IO Integration
    // ========================================
    const socket = {
        /**
         * Initialize Socket.IO connection
         */
        init() {
            if (typeof io === 'undefined') {
                console.warn('Socket.IO not available');
                return;
            }

            state.socket = io();

            state.socket.on('connect', () => {
                console.log('Connected to real-time server');
            });

            state.socket.on('disconnect', () => {
                console.log('Disconnected from real-time server');
            });

            // Patient events
            state.socket.on('patient_created', (patient) => {
                notifications.info(`New patient added: ${patient.firstName} ${patient.lastName}`);
                notificationCenter.add(
                    'New Patient Registered',
                    `${patient.firstName} ${patient.lastName} has been added to the system`,
                    'success'
                );
                document.dispatchEvent(new CustomEvent('patientCreated', { detail: patient }));
            });

            state.socket.on('patient_updated', (patient) => {
                notifications.info(`Patient updated: ${patient.firstName} ${patient.lastName}`);
                notificationCenter.add(
                    'Patient Record Updated',
                    `${patient.firstName} ${patient.lastName}'s record has been modified`,
                    'info'
                );
                document.dispatchEvent(new CustomEvent('patientUpdated', { detail: patient }));
            });

            state.socket.on('patient_deleted', (data) => {
                notifications.info('Patient record deleted');
                notificationCenter.add(
                    'Patient Record Deleted',
                    'A patient record has been removed from the system',
                    'warning'
                );
                document.dispatchEvent(new CustomEvent('patientDeleted', { detail: data }));
            });

            // Appointment events
            state.socket.on('appointment_created', (appointment) => {
                const patientName = appointment.patient ? 
                    `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Unknown';
                const dateStr = appointment.date ? 
                    new Date(appointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                
                notifications.info('New appointment scheduled');
                notificationCenter.add(
                    'Appointment Scheduled',
                    `${patientName} - ${dateStr}`,
                    'appointment'
                );
                document.dispatchEvent(new CustomEvent('appointmentCreated', { detail: appointment }));
            });

            state.socket.on('appointment_updated', (appointment) => {
                const patientName = appointment.patient ? 
                    `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Unknown';
                
                notifications.info('Appointment updated');
                notificationCenter.add(
                    'Appointment Updated',
                    `${patientName}'s appointment has been modified`,
                    'info'
                );
                document.dispatchEvent(new CustomEvent('appointmentUpdated', { detail: appointment }));
            });
            
            // Appointment reminder event
            state.socket.on('appointment_reminder', (appointment) => {
                const patientName = appointment.patient ? 
                    `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Unknown';
                const dateStr = appointment.date ? 
                    new Date(appointment.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
                
                notifications.warning(`Reminder: Appointment with ${patientName} at ${dateStr}`);
                notificationCenter.add(
                    'Appointment Reminder',
                    `Upcoming: ${patientName} at ${dateStr}`,
                    'warning'
                );
            });
        },

        /**
         * Join a specific room
         */
        joinRoom(room) {
            if (state.socket) {
                state.socket.emit('join', room);
            }
        },

        /**
         * Leave a specific room
         */
        leaveRoom(room) {
            if (state.socket) {
                state.socket.emit('leave', room);
            }
        }
    };

    // ========================================
    // UI Helpers
    // ========================================
    const ui = {
        /**
         * Show loading state on button
         */
        setButtonLoading(button, loading) {
            if (loading) {
                button.disabled = true;
                button.dataset.originalText = button.innerHTML;
                button.innerHTML = '<span class="loading-spinner"></span> Loading...';
            } else {
                button.disabled = false;
                button.innerHTML = button.dataset.originalText || button.innerHTML;
            }
        },

        /**
         * Create patient card HTML
         */
        createPatientCard(patient) {
            const photoHtml = patient.photo 
                ? `<img src="${patient.photo}" alt="${utils.escapeHtml(patient.firstName)}" class="rounded-circle" style="width: 48px; height: 48px; object-fit: cover;">`
                : `<div class="rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;"><i class="fas fa-user text-secondary"></i></div>`;

            return `
                <div class="col-md-6 col-lg-4 col-xl-4">
                    <div class="patient-card h-100" data-patient-id="${patient.id}">
                        <div class="card-header-custom">
                            <div class="d-flex align-items-center gap-3">
                                ${photoHtml}
                                <div>
                                    <h5 class="patient-name mb-0">${utils.escapeHtml(patient.firstName)} ${utils.escapeHtml(patient.lastName)}</h5>
                                    <span class="badge bg-primary-subtle text-primary rounded-pill px-2">${utils.escapeHtml(patient.gender)}</span>
                                </div>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-link text-muted p-0" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end border-0 shadow">
                                    <li><a class="dropdown-item view-patient" href="#" data-id="${patient.id}"><i class="fas fa-eye me-2 text-primary"></i>View Details</a></li>
                                    <li><a class="dropdown-item edit-patient" href="#" data-id="${patient.id}"><i class="fas fa-edit me-2 text-secondary"></i>Edit Record</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item delete-patient text-danger" href="#" data-id="${patient.id}"><i class="fas fa-trash-alt me-2"></i>Delete</a></li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="card-body p-0 mt-3">
                            <div class="patient-meta mb-2">
                                <i class="fas fa-birthday-cake text-muted" style="width: 20px;"></i>
                                <span>${utils.formatDate(patient.dateOfBirth)} <small class="text-muted">(${utils.calculateAge(patient.dateOfBirth)} yrs)</small></span>
                            </div>
                            <div class="patient-meta mb-2">
                                <i class="fas fa-phone text-muted" style="width: 20px;"></i>
                                <span>${utils.escapeHtml(patient.contactNumber || 'No contact')}</span>
                            </div>
                            <div class="patient-meta">
                                <i class="fas fa-map-marker-alt text-muted" style="width: 20px;"></i>
                                <span class="text-truncate">${utils.escapeHtml(patient.address || 'No address')}</span>
                            </div>
                        </div>

                        <div class="patient-actions mt-3 pt-3 border-top">
                            <button class="btn btn-outline-primary btn-sm w-100 view-patient" data-id="${patient.id}">
                                <i class="fas fa-file-medical me-1"></i> View Medical Record
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Create appointment card HTML
         */
        createAppointmentCard(appointment) {
            const statusClass = {
                'Scheduled': 'status-scheduled',
                'Completed': 'status-completed',
                'Cancelled': 'status-cancelled'
            }[appointment.status] || 'bg-light text-dark';

            // Format date and time separately
            const dateObj = new Date(appointment.date);
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="col-md-6 col-lg-4">
                    <div class="appointment-card h-100">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <div class="appointment-time mb-1">
                                    ${timeStr}
                                </div>
                                <div class="text-muted small mb-2"><i class="far fa-calendar me-1"></i>${dateStr}</div>
                                <span class="badge ${statusClass}">${appointment.status}</span>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-link text-muted p-0" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end border-0 shadow">
                                    <li><a class="dropdown-item edit-appointment" href="#" data-id="${appointment.id}"><i class="fas fa-edit me-2"></i>Edit</a></li>
                                    <li><a class="dropdown-item cancel-appointment text-danger" href="#" data-id="${appointment.id}"><i class="fas fa-times-circle me-2"></i>Cancel</a></li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <h6 class="mb-1 text-dark">
                                <i class="fas fa-user-circle me-2 text-secondary"></i>
                                ${utils.escapeHtml(appointment.patientName || 'Unknown Patient')}
                            </h6>
                            <p class="text-muted small mb-0 ms-4">
                                ${utils.escapeHtml(appointment.type)}
                            </p>
                        </div>

                        ${appointment.notes ? `
                        <div class="bg-light p-2 rounded small text-muted">
                            <i class="fas fa-sticky-note me-1"></i> ${utils.escapeHtml(appointment.notes)}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        },

        /**
         * Update user display in navbar
         */
        updateUserDisplay() {
            const userDisplay = document.getElementById('userDisplay');
            const userRole = document.getElementById('userRole');
            
            if (state.user && userDisplay) {
                userDisplay.textContent = state.user.name || state.user.email;
            }
            
            if (state.user && userRole) {
                userRole.textContent = state.user.role;
            }
        }
    };

    // ========================================
    // Form Handlers
    // ========================================
    const forms = {
        /**
         * Setup login form handler
         */
        setupLoginForm() {
            const form = document.getElementById('loginForm');
            if (!form) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email')?.value || document.getElementById('username')?.value;
                const password = document.getElementById('password').value;
                const submitBtn = form.querySelector('button[type="submit"]');

                if (!email || !password) {
                    notifications.error('Please fill in all fields');
                    return;
                }

                ui.setButtonLoading(submitBtn, true);

                try {
                    await auth.login(email, password);
                    notifications.success('Login successful!');
                    setTimeout(() => {
                        // Redirect based on user role
                        const user = auth.getUser();
                        if (user) {
                            if (user.role === 'admin') {
                                window.location.href = '/admin';
                            } else if (user.role === 'patient') {
                                window.location.href = '/patient-dashboard.html';
                            } else {
                                window.location.href = '/dashboard.html';
                            }
                        } else {
                            window.location.href = '/dashboard.html';
                        }
                    }, 500);
                } catch (error) {
                    notifications.error(error.message);
                } finally {
                    ui.setButtonLoading(submitBtn, false);
                }
            });
        },

        /**
         * Setup registration form handler
         */
        setupRegisterForm() {
            const form = document.getElementById('registrationForm');
            if (!form) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const name = document.getElementById('fullName').value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const userType = document.getElementById('userType').value;
                const submitBtn = form.querySelector('button[type="submit"]');

                // Validation
                if (password !== confirmPassword) {
                    notifications.error('Passwords do not match');
                    return;
                }

                if (password.length < 6) {
                    notifications.error('Password must be at least 6 characters');
                    return;
                }

                ui.setButtonLoading(submitBtn, true);

                try {
                    let role = 'user';
                    if (userType === 'healthcare-provider') {
                        role = 'provider';
                    } else if (userType === 'patient') {
                        role = 'patient';
                    }
                    
                    const message = await auth.register({
                        name,
                        email,
                        password,
                        role
                    });
                    
                    notifications.success(message + ' Redirecting to login...');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 1500);
                } catch (error) {
                    notifications.error(error.message);
                } finally {
                    ui.setButtonLoading(submitBtn, false);
                }
            });
        },

        /**
         * Setup add patient form handler
         */
        setupPatientForm() {
            const form = document.getElementById('addPatientForm');
            if (!form) return;

            // Photo preview handler
            const photoInput = document.getElementById('patientPhoto');
            const photoPreview = document.getElementById('photoPreview');
            if (photoInput && photoPreview) {
                photoInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                            photoPreview.dataset.photo = e.target.result;
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }

            // BMI calculator
            const heightInput = document.getElementById('patientHeight');
            const weightInput = document.getElementById('patientWeight');
            const bmiDisplay = document.getElementById('patientBMI');
            
            const calculateBMI = () => {
                const height = parseFloat(heightInput?.value);
                const weight = parseFloat(weightInput?.value);
                if (height > 0 && weight > 0) {
                    const heightM = height / 100;
                    const bmi = (weight / (heightM * heightM)).toFixed(1);
                    let category = '';
                    if (bmi < 18.5) category = 'Underweight';
                    else if (bmi < 25) category = 'Normal';
                    else if (bmi < 30) category = 'Overweight';
                    else category = 'Obese';
                    bmiDisplay.innerHTML = `<span class="fw-bold">${bmi}</span> <small class="text-muted">(${category})</small>`;
                } else {
                    bmiDisplay.textContent = '--';
                }
            };
            
            if (heightInput) heightInput.addEventListener('input', calculateBMI);
            if (weightInput) weightInput.addEventListener('input', calculateBMI);

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const patientData = {
                    firstName: document.getElementById('patientFirstName')?.value,
                    lastName: document.getElementById('patientLastName')?.value,
                    dateOfBirth: document.getElementById('patientDOB')?.value,
                    gender: document.getElementById('patientGender')?.value,
                    contactNumber: document.getElementById('patientContact')?.value,
                    email: document.getElementById('patientEmail')?.value,
                    address: document.getElementById('patientAddress')?.value,
                    height: parseFloat(document.getElementById('patientHeight')?.value) || null,
                    weight: parseFloat(document.getElementById('patientWeight')?.value) || null,
                    eyeColor: document.getElementById('patientEyeColor')?.value,
                    hairColor: document.getElementById('patientHairColor')?.value,
                    skinTone: document.getElementById('patientSkinTone')?.value,
                    nationality: document.getElementById('patientNationality')?.value,
                    tribe: document.getElementById('patientTribe')?.value,
                    
                    // Ugandan Specifics
                    nin: document.getElementById('patientNIN')?.value,
                    village: document.getElementById('patientVillage')?.value,
                    district: document.getElementById('patientDistrict')?.value,
                    
                    // Next of Kin
                    nextOfKinName: document.getElementById('patientNOKName')?.value,
                    nextOfKinContact: document.getElementById('patientNOKContact')?.value,
                    nextOfKinRelationship: document.getElementById('patientNOKRel')?.value,

                    // Medical Profile
                    bloodGroup: document.getElementById('patientBloodGroup')?.value,
                    genotype: document.getElementById('patientGenotype')?.value,
                    chronicConditions: document.getElementById('patientChronic')?.value ? 
                        document.getElementById('patientChronic').value.split(',').map(s => s.trim()).filter(s => s) : [],

                    photo: document.getElementById('photoPreview')?.dataset?.photo || null,
                    foodAllergies: document.getElementById('patientFoodAllergies')?.value ? 
                        document.getElementById('patientFoodAllergies').value.split(',').map(s => s.trim()).filter(s => s) : [],
                    medicationAllergies: document.getElementById('patientMedAllergies')?.value ? 
                        document.getElementById('patientMedAllergies').value.split(',').map(s => s.trim()).filter(s => s) : [],
                    medicalHistory: document.getElementById('patientHistory')?.value ? 
                        document.getElementById('patientHistory').value.split(',').map(s => s.trim()).filter(s => s) : []
                };

                const submitBtn = form.querySelector('button[type="submit"]');
                ui.setButtonLoading(submitBtn, true);

                try {
                    await api.createPatient(patientData);
                    notifications.success('Patient added successfully!');
                    form.reset();
                    if (photoPreview) {
                        photoPreview.innerHTML = '<i class="fas fa-user fa-3x text-muted"></i>';
                        delete photoPreview.dataset.photo;
                    }
                    if (bmiDisplay) bmiDisplay.textContent = '--';
                    dashboard.loadPatients();
                } catch (error) {
                    notifications.error(error.message);
                } finally {
                    ui.setButtonLoading(submitBtn, false);
                }
            });
        },

        /**
         * Setup appointment form handler
         */
        setupAppointmentForm() {
            const form = document.getElementById('addAppointmentForm');
            if (!form) return;

            // Populate patient select on modal show
            const modal = document.getElementById('addAppointmentModal');
            if (modal) {
                modal.addEventListener('show.bs.modal', async () => {
                    const select = document.getElementById('appointmentPatient');
                    try {
                        const patients = await api.getPatients();
                        select.innerHTML = '<option value="">Select Patient...</option>' + 
                            patients.map(p => `<option value="${p.id}">${utils.escapeHtml(p.firstName)} ${utils.escapeHtml(p.lastName)}</option>`).join('');
                    } catch (error) {
                        notifications.error('Failed to load patients list');
                    }
                });
            }

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const patientId = document.getElementById('appointmentPatient').value;
                const date = document.getElementById('appointmentDate').value;
                const time = document.getElementById('appointmentTime').value;
                
                if (!patientId || !date || !time) {
                    notifications.error('Please fill in all required fields');
                    return;
                }

                // Get patient name for immediate UI update (optional optimization)
                const select = document.getElementById('appointmentPatient');
                const patientName = select.options[select.selectedIndex].text;

                // Get current logged-in user as the doctor
                const currentUser = auth.getUser();

                const appointmentData = {
                    patient: parseInt(patientId),
                    doctor: currentUser.id, // Auto-assign current provider as doctor
                    date: `${date}T${time}`,
                    reason: `${document.getElementById('appointmentType').value}: ${document.getElementById('appointmentNotes').value || 'No notes'}`,
                    status: 'scheduled'
                };

                const submitBtn = form.querySelector('button[type="submit"]');
                ui.setButtonLoading(submitBtn, true);

                try {
                    await api.createAppointment(appointmentData);
                    notifications.success('Appointment scheduled successfully!');
                    
                    // Add to notification center
                    const dateObj = new Date(`${date}T${time}`);
                    const dateStr = dateObj.toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    });
                    notificationCenter.add(
                        'Appointment Scheduled',
                        `${patientName} - ${dateStr}`,
                        'appointment'
                    );
                    
                    bootstrap.Modal.getInstance(modal).hide();
                    form.reset();
                    dashboard.loadAppointments();
                } catch (error) {
                    notifications.error(error.message);
                } finally {
                    ui.setButtonLoading(submitBtn, false);
                }
            });
        },

        /**
         * Setup logout handler
         */
        setupLogout() {
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    auth.logout();
                });
            }
        }
    };

    // ========================================
    // Dashboard Functions
    // ========================================
    const dashboard = {
        calendar: null,

        /**
         * Load and display patients
         */
        async loadPatients() {
            const patientList = document.getElementById('patientList');
            if (!patientList) return;

            try {
                const patients = await api.getPatients();
                
                if (patients.length === 0) {
                    patientList.innerHTML = `
                        <div class="col-12 text-center py-4 text-muted">
                            <i class="fas fa-user-plus fa-2x mb-2"></i>
                            <p>No patients found. Add your first patient!</p>
                        </div>
                    `;
                    return;
                }

                patientList.innerHTML = patients.map(p => ui.createPatientCard(p)).join('');
                this.setupPatientActions();
            } catch (error) {
                patientList.innerHTML = `
                    <div class="col-12 text-center py-4 text-danger">
                        <i class="fas fa-exclamation-circle fa-2x mb-2"></i>
                        <p>Error loading patients. Please try again.</p>
                    </div>
                `;
            }
        },

        /**
         * Load and display appointments
         */
        async loadAppointments() {
            const calendarEl = document.getElementById('calendar');
            if (!calendarEl) return;

            // Store appointments for detail lookup
            this.appointmentsData = [];

            // Initialize calendar if not already done
            if (!this.calendar && typeof FullCalendar !== 'undefined') {
                this.calendar = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'dayGridMonth',
                    headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    },
                    height: 420,
                    navLinks: true,
                    editable: false,
                    dayMaxEvents: 2,
                    eventTimeFormat: {
                        hour: '2-digit',
                        minute: '2-digit',
                        meridiem: 'short'
                    },
                    eventClick: (info) => {
                        this.showAppointmentDetails(info.event.id);
                    }
                });
                this.calendar.render();
                this.setupAppointmentActions();
            }

            try {
                const appointments = await api.getAppointments();
                this.appointmentsData = appointments;
                
                if (this.calendar) {
                    const events = appointments.map(a => {
                        const patientName = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : 'Unknown';
                        let color = '#3788d8'; // blue for scheduled
                        if (a.status === 'completed') color = '#28a745'; // green
                        if (a.status === 'cancelled') color = '#dc3545'; // red
                        
                        // Reminder logic: if appointment is within 24 hours and scheduled, make it orange
                        const apptDate = new Date(a.date);
                        const now = new Date();
                        const diffHours = (apptDate - now) / 36e5;
                        if (diffHours > 0 && diffHours < 24 && a.status === 'scheduled') {
                            color = '#fd7e14'; // orange
                        }

                        return {
                            id: a.id,
                            title: `${patientName}`,
                            start: a.date,
                            backgroundColor: color,
                            extendedProps: {
                                status: a.status,
                                reason: a.reason,
                                patientName: patientName,
                                doctorName: a.doctor ? a.doctor.name : 'Unknown'
                            }
                        };
                    });
                    
                    this.calendar.removeAllEvents();
                    this.calendar.addEventSource(events);
                }
            } catch (error) {
                console.error(error);
                notifications.error('Error loading appointments');
            }
        },

        /**
         * Show appointment details in the side panel
         */
        showAppointmentDetails(appointmentId) {
            const placeholder = document.getElementById('detailsPlaceholder');
            const content = document.getElementById('detailsContent');
            
            if (!placeholder || !content) return;

            const appt = this.appointmentsData.find(a => a.id == appointmentId);
            if (!appt) {
                notifications.error('Appointment not found');
                return;
            }

            // Hide placeholder, show content
            placeholder.classList.add('d-none');
            content.classList.remove('d-none');

            // Populate details
            const patientName = appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : 'Unknown';
            const doctorName = appt.doctor ? appt.doctor.name : 'Unknown';
            const dateObj = new Date(appt.date);
            const dateTimeStr = dateObj.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            document.getElementById('detailPatientName').textContent = patientName;
            document.getElementById('detailDoctorName').textContent = doctorName;
            document.getElementById('detailReason').textContent = appt.reason || 'No reason specified';
            document.getElementById('detailDateTime').textContent = dateTimeStr;

            // Status badge
            const statusBadge = document.getElementById('detailStatusBadge');
            statusBadge.textContent = appt.status.charAt(0).toUpperCase() + appt.status.slice(1);
            statusBadge.className = 'badge';
            if (appt.status === 'scheduled') statusBadge.classList.add('bg-primary');
            else if (appt.status === 'completed') statusBadge.classList.add('bg-success');
            else if (appt.status === 'cancelled') statusBadge.classList.add('bg-danger');
            else statusBadge.classList.add('bg-secondary');

            // Store current appointment ID for actions
            this.selectedAppointmentId = appointmentId;
        },

        /**
         * Setup appointment action buttons
         */
        setupAppointmentActions() {
            const btnComplete = document.getElementById('btnCompleteAppt');
            const btnCancel = document.getElementById('btnCancelAppt');

            if (btnComplete) {
                btnComplete.addEventListener('click', async () => {
                    if (!this.selectedAppointmentId) return;
                    try {
                        await api.updateAppointment(this.selectedAppointmentId, { status: 'completed' });
                        notifications.success('Appointment marked as completed');
                        this.loadAppointments();
                        this.resetAppointmentDetails();
                    } catch (error) {
                        notifications.error('Failed to update appointment');
                    }
                });
            }

            if (btnCancel) {
                btnCancel.addEventListener('click', async () => {
                    if (!this.selectedAppointmentId) return;
                    try {
                        await api.updateAppointment(this.selectedAppointmentId, { status: 'cancelled' });
                        notifications.success('Appointment cancelled');
                        this.loadAppointments();
                        this.resetAppointmentDetails();
                    } catch (error) {
                        notifications.error('Failed to cancel appointment');
                    }
                });
            }
        },

        /**
         * Reset appointment details panel
         */
        resetAppointmentDetails() {
            const placeholder = document.getElementById('detailsPlaceholder');
            const content = document.getElementById('detailsContent');
            if (placeholder) placeholder.classList.remove('d-none');
            if (content) content.classList.add('d-none');
            this.selectedAppointmentId = null;
        },

        /**
         * Setup patient action buttons
         */
        setupPatientActions() {
            // View patient
            document.querySelectorAll('.view-patient').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    await this.showPatientDetails(id);
                });
            });

            // Edit patient
            document.querySelectorAll('.edit-patient').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    await this.showEditPatient(id);
                });
            });

            // Delete patient
            document.querySelectorAll('.delete-patient').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    await this.showDeleteConfirm(id);
                });
            });
        },

        /**
         * Show patient details in modal
         */
        async showPatientDetails(id) {
            const modal = new bootstrap.Modal(document.getElementById('viewPatientModal'));
            const content = document.getElementById('viewPatientContent');
            
            content.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
            modal.show();

            try {
                const patient = await api.getPatient(id);
                const medicalHistory = Array.isArray(patient.medicalHistory) 
                    ? patient.medicalHistory.join(', ') 
                    : (patient.medicalHistory || 'None recorded');

                const photoHtml = patient.photo 
                    ? `<img src="${patient.photo}" alt="Patient Photo" class="patient-photo-lg" style="width: 70px; height: 70px;">`
                    : `<div class="patient-photo-placeholder" style="width: 70px; height: 70px;"><i class="fas fa-user fa-2x text-muted"></i></div>`;

                const bmiHtml = patient.bmi 
                    ? `<span class="fw-bold">${patient.bmi}</span> <span class="badge ${patient.bmiCategory === 'Normal' ? 'bg-success' : patient.bmiCategory === 'Underweight' ? 'bg-warning' : 'bg-danger'}" style="font-size: 0.75rem;">${patient.bmiCategory}</span>`
                    : 'N/A';

                // Add action buttons to modal footer
                const modalFooter = document.querySelector('#viewPatientModal .modal-footer');
                if (modalFooter) {
                    modalFooter.innerHTML = `
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-info text-white" id="btnDownloadWord"><i class="fas fa-file-word me-1"></i> Word</button>
                        <button type="button" class="btn btn-danger" id="btnDownloadPdf"><i class="fas fa-file-pdf me-1"></i> PDF</button>
                        <button type="button" class="btn btn-primary" onclick="window.print()"><i class="fas fa-print me-1"></i> Print</button>
                    `;
                    
                    // Setup PDF Download
                    document.getElementById('btnDownloadPdf').onclick = () => {
                        const element = document.querySelector('.patient-record-print-wrapper');
                        // Temporarily show print-only elements for PDF generation
                        element.classList.add('pdf-mode');
                        
                        const opt = {
                            margin: 10,
                            filename: `Patient_${patient.firstName}_${patient.lastName}.pdf`,
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2, useCORS: true },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        };
                        
                        html2pdf().set(opt).from(element).save().then(() => {
                            element.classList.remove('pdf-mode');
                        });
                    };

                    // Setup Word Download
                    document.getElementById('btnDownloadWord').onclick = () => {
                        const element = document.querySelector('.patient-record-print-wrapper');
                        // Clone to modify for export without affecting display
                        const clone = element.cloneNode(true);
                        
                        // Handle visibility for Word
                        clone.querySelectorAll('.d-print-none').forEach(el => el.remove());
                        clone.querySelectorAll('.d-print-block').forEach(el => {
                            el.classList.remove('d-none');
                            el.style.display = 'block';
                        });

                        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
                            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
                            "xmlns='http://www.w3.org/TR/REC-html40'>" +
                            "<head><meta charset='utf-8'><title>Patient Record</title>" +
                            "<style>body{font-family: 'Times New Roman', serif;} .row{display:flex;flex-wrap:wrap;} .col-6{width:50%;} .text-center{text-align:center;} .text-end{text-align:right;} .fw-bold{font-weight:bold;}</style>" +
                            "</head><body>";
                        
                        const footer = "</body></html>";
                        const sourceHTML = header + clone.innerHTML + footer;
                        
                        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
                        const fileDownload = document.createElement("a");
                        document.body.appendChild(fileDownload);
                        fileDownload.href = source;
                        fileDownload.download = `Patient_${patient.firstName}_${patient.lastName}.doc`;
                        fileDownload.click();
                        document.body.removeChild(fileDownload);
                    };
                }

                const patientIdDisplay = patient.id ? String(patient.id).substring(0, 8).toUpperCase() : 'N/A';
                const chronicConditions = Array.isArray(patient.chronicConditions) 
                    ? patient.chronicConditions.join(', ') 
                    : (patient.chronicConditions || 'None');

                content.innerHTML = `
                    <div class="patient-record-print-wrapper">
                        <!-- Print Header (Visible only in print) -->
                        <div class="print-header d-none d-print-block mb-4">
                            <div class="d-flex align-items-center justify-content-between border-bottom pb-3">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="print-logo">
                                        <i class="fas fa-heartbeat fa-2x text-primary"></i>
                                    </div>
                                    <div>
                                        <h2 class="mb-0">HIE Uganda</h2>
                                        <p class="text-muted mb-0 small">Centralized Health Information Exchange</p>
                                    </div>
                                </div>
                                <div class="text-end">
                                    <h4 class="mb-1 text-uppercase text-primary">Medical Record</h4>
                                    <p class="mb-0 small text-muted">Generated: ${new Date().toLocaleDateString()}</p>
                                    <p class="mb-0 small text-muted">ID: ${patientIdDisplay}</p>
                                    <p class="mb-0 small text-muted">NIN: ${utils.escapeHtml(patient.nin || 'N/A')}</p>
                                </div>
                            </div>
                        </div>

                        <div class="row g-3">
                            <!-- Photo and Basic Info -->
                            <div class="col-12 text-center mb-2 d-print-none">
                                ${photoHtml}
                                <h5 class="mt-2 mb-0">${utils.escapeHtml(patient.firstName)} ${utils.escapeHtml(patient.lastName)}</h5>
                                <p class="text-muted mb-0" style="font-size: 0.9rem;">${utils.escapeHtml(patient.nationality || '')} ${patient.tribe ? '• ' + utils.escapeHtml(patient.tribe) : ''}</p>
                                <p class="text-muted mb-0 small">NIN: ${utils.escapeHtml(patient.nin || 'N/A')}</p>
                            </div>

                            <!-- Print-specific Patient Header -->
                            <div class="col-12 d-none d-print-block mb-4">
                                <div class="row">
                                    <div class="col-8">
                                        <h3 class="mb-1">${utils.escapeHtml(patient.firstName)} ${utils.escapeHtml(patient.lastName)}</h3>
                                        <p class="mb-0"><strong>DOB:</strong> ${utils.formatDate(patient.dateOfBirth)} (${utils.calculateAge(patient.dateOfBirth)} yrs) &nbsp;|&nbsp; <strong>Gender:</strong> ${utils.escapeHtml(patient.gender)}</p>
                                        <p class="mb-0"><strong>NIN:</strong> ${utils.escapeHtml(patient.nin || 'N/A')}</p>
                                    </div>
                                    <div class="col-4 text-end">
                                        ${patient.photo ? `<img src="${patient.photo}" style="width: 80px; height: 80px; border-radius: 4px; object-fit: cover;">` : ''}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Personal Information -->
                            <div class="col-md-6 print-col-6">
                                <div class="patient-detail-section mb-2 p-2 print-section">
                                    <h6 class="text-primary-color border-bottom pb-1 mb-2 print-section-title" style="font-size: 0.95rem;">
                                        <i class="fas fa-user me-1 d-print-none"></i>Personal Information
                                    </h6>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">DOB</span><span class="detail-value" style="font-size: 0.85rem;">${utils.formatDate(patient.dateOfBirth)}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Gender</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.gender)}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Nationality</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.nationality || 'N/A')}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Tribe</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.tribe || 'N/A')}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">NIN</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.nin || 'N/A')}</span></div>
                                </div>
                            </div>
                            
                            <!-- Physical & Medical Traits -->
                            <div class="col-md-6 print-col-6">
                                <div class="patient-detail-section mb-2 p-2 print-section">
                                    <h6 class="text-primary-color border-bottom pb-1 mb-2 print-section-title" style="font-size: 0.95rem;">
                                        <i class="fas fa-notes-medical me-1 d-print-none"></i>Medical Profile
                                    </h6>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Blood Group</span><span class="detail-value fw-bold" style="font-size: 0.85rem;">${utils.escapeHtml(patient.bloodGroup || 'N/A')}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Genotype</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.genotype || 'N/A')}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Height/Weight</span><span class="detail-value" style="font-size: 0.85rem;">${patient.height || '-'}cm / ${patient.weight || '-'}kg</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">BMI</span><span class="detail-value" style="font-size: 0.85rem;">${bmiHtml}</span></div>
                                </div>
                            </div>
                            
                            <!-- Contact Information -->
                            <div class="col-md-6 print-col-6">
                                <div class="patient-detail-section mb-2 p-2 print-section">
                                    <h6 class="text-primary-color border-bottom pb-1 mb-2 print-section-title" style="font-size: 0.95rem;">
                                        <i class="fas fa-address-card me-1 d-print-none"></i>Contact Details
                                    </h6>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Email</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.email || 'N/A')}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Phone</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.contactNumber || 'N/A')}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">District</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.district || 'N/A')}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Village</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.village || 'N/A')}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Address</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.address || 'N/A')}</span></div>
                                </div>
                            </div>

                            <!-- Next of Kin -->
                            <div class="col-md-6 print-col-6">
                                <div class="patient-detail-section mb-2 p-2 print-section">
                                    <h6 class="text-primary-color border-bottom pb-1 mb-2 print-section-title" style="font-size: 0.95rem;">
                                        <i class="fas fa-user-shield me-1 d-print-none"></i>Next of Kin
                                    </h6>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Name</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.nextOfKinName || 'N/A')}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Relationship</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.nextOfKinRelationship || 'N/A')}</span></div>
                                    <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Contact</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.nextOfKinContact || 'N/A')}</span></div>
                                </div>
                            </div>
                            
                            <!-- Allergies & Chronic -->
                            <div class="col-12">
                                <div class="patient-detail-section mb-2 p-2 print-section">
                                    <h6 class="text-primary-color border-bottom pb-1 mb-2 print-section-title" style="font-size: 0.95rem;">
                                        <i class="fas fa-allergies me-1 d-print-none"></i>Medical Alerts
                                    </h6>
                                    <div class="row">
                                        <div class="col-md-4">
                                            <p class="mb-1" style="font-size: 0.8rem;"><strong class="d-print-inline">Chronic Conditions:</strong><br>
                                            ${chronicConditions !== 'None' 
                                                ? `<span class="badge bg-info text-dark print-badge" style="font-size: 0.75rem;">${utils.escapeHtml(chronicConditions)}</span>` 
                                                : '<span class="text-muted">None</span>'}</p>
                                        </div>
                                        <div class="col-md-4">
                                            <p class="mb-1" style="font-size: 0.8rem;"><strong class="d-print-inline">Food Allergies:</strong><br>
                                            ${patient.foodAllergies && patient.foodAllergies.length > 0 
                                                ? patient.foodAllergies.map(a => `<span class="badge bg-warning text-dark print-badge" style="font-size: 0.7rem;">${utils.escapeHtml(a)}</span>`).join(' ') 
                                                : '<span class="text-muted">None</span>'}</p>
                                        </div>
                                        <div class="col-md-4">
                                            <p class="mb-0" style="font-size: 0.8rem;"><strong class="d-print-inline">Medication Allergies:</strong><br>
                                            ${patient.medicationAllergies && patient.medicationAllergies.length > 0 
                                                ? patient.medicationAllergies.map(a => `<span class="badge bg-danger print-badge" style="font-size: 0.7rem;">${utils.escapeHtml(a)}</span>`).join(' ') 
                                                : '<span class="text-muted">None</span>'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Medical History -->
                            <div class="col-12">
                                <div class="patient-detail-section p-2 print-section">
                                    <h6 class="text-primary-color border-bottom pb-1 mb-1 print-section-title" style="font-size: 0.95rem;">
                                        <i class="fas fa-notes-medical me-1 d-print-none"></i>Medical History Notes
                                    </h6>
                                    <p class="mb-0" style="font-size: 0.85rem;">${utils.escapeHtml(medicalHistory)}</p>
                                </div>
                            </div>

                            <!-- Print Footer -->
                            <div class="col-12 d-none d-print-block mt-5 pt-4 border-top">
                                <div class="row">
                                    <div class="col-6">
                                        <p class="mb-0 small text-muted">Authorized Signature:</p>
                                        <div style="border-bottom: 1px solid #000; width: 200px; height: 40px;"></div>
                                    </div>
                                    <div class="col-6 text-end">
                                        <p class="mb-0 small text-muted">Printed from HIE System</p>
                                        <p class="mb-0 small text-muted">Confidential Medical Record</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                content.innerHTML = `
                    <div class="text-center py-4 text-danger">
                        <i class="fas fa-exclamation-circle fa-2x mb-2"></i>
                        <p>Error loading patient details</p>
                    </div>
                `;
            }
        },

        /**
         * Show edit patient modal
         */
        async showEditPatient(id) {
            const modal = new bootstrap.Modal(document.getElementById('editPatientModal'));
            
            try {
                const patient = await api.getPatient(id);
                
                document.getElementById('editPatientId').value = patient.id;
                document.getElementById('editFirstName').value = patient.firstName || '';
                document.getElementById('editLastName').value = patient.lastName || '';
                document.getElementById('editDOB').value = patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '';
                document.getElementById('editGender').value = patient.gender || '';
                document.getElementById('editEmail').value = patient.email || '';
                document.getElementById('editContact').value = patient.contactNumber || '';
                document.getElementById('editAddress').value = patient.address || '';
                document.getElementById('editHeight').value = patient.height || '';
                document.getElementById('editWeight').value = patient.weight || '';
                document.getElementById('editEyeColor').value = patient.eyeColor || '';
                document.getElementById('editHairColor').value = patient.hairColor || '';
                document.getElementById('editSkinTone').value = patient.skinTone || '';
                document.getElementById('editNationality').value = patient.nationality || '';
                document.getElementById('editTribe').value = patient.tribe || '';
                document.getElementById('editHistory').value = Array.isArray(patient.medicalHistory) 
                    ? patient.medicalHistory.join(', ') 
                    : (patient.medicalHistory || '');
                
                // Allergy fields
                document.getElementById('editFoodAllergies').value = Array.isArray(patient.foodAllergies) 
                    ? patient.foodAllergies.join(', ') 
                    : (patient.foodAllergies || '');
                document.getElementById('editMedAllergies').value = Array.isArray(patient.medicationAllergies) 
                    ? patient.medicationAllergies.join(', ') 
                    : (patient.medicationAllergies || '');
                
                // Photo preview
                const photoPreview = document.getElementById('editPhotoPreview');
                if (photoPreview) {
                    if (patient.photo) {
                        photoPreview.innerHTML = `<img src="${patient.photo}" alt="Preview">`;
                        photoPreview.dataset.photo = patient.photo;
                    } else {
                        photoPreview.innerHTML = '<i class="fas fa-user fa-3x text-muted"></i>';
                        delete photoPreview.dataset.photo;
                    }
                }
                
                // BMI display
                const bmiDisplay = document.getElementById('editBMI');
                if (bmiDisplay && patient.bmi) {
                    bmiDisplay.innerHTML = `<span class="fw-bold">${patient.bmi}</span> <small class="text-muted">(${patient.bmiCategory})</small>`;
                } else if (bmiDisplay) {
                    bmiDisplay.textContent = '--';
                }
                
                modal.show();
            } catch (error) {
                notifications.error('Error loading patient data');
            }
        },

        /**
         * Show delete confirmation modal
         */
        async showDeleteConfirm(id) {
            const modal = new bootstrap.Modal(document.getElementById('deletePatientModal'));
            
            try {
                const patient = await api.getPatient(id);
                document.getElementById('deletePatientId').value = patient.id;
                document.getElementById('deletePatientName').textContent = 
                    `${patient.firstName} ${patient.lastName}`;
                modal.show();
            } catch (error) {
                notifications.error('Error loading patient data');
            }
        },

        /**
         * Setup modal handlers
         */
        setupModalHandlers() {
            // Edit form photo preview handler
            const editPhotoInput = document.getElementById('editPatientPhoto');
            const editPhotoPreview = document.getElementById('editPhotoPreview');
            if (editPhotoInput && editPhotoPreview) {
                editPhotoInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            editPhotoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                            editPhotoPreview.dataset.photo = e.target.result;
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }

            // Edit form BMI calculator
            const editHeightInput = document.getElementById('editHeight');
            const editWeightInput = document.getElementById('editWeight');
            const editBmiDisplay = document.getElementById('editBMI');
            
            const calculateEditBMI = () => {
                const height = parseFloat(editHeightInput?.value);
                const weight = parseFloat(editWeightInput?.value);
                if (height > 0 && weight > 0) {
                    const heightM = height / 100;
                    const bmi = (weight / (heightM * heightM)).toFixed(1);
                    let category = '';
                    if (bmi < 18.5) category = 'Underweight';
                    else if (bmi < 25) category = 'Normal';
                    else if (bmi < 30) category = 'Overweight';
                    else category = 'Obese';
                    editBmiDisplay.innerHTML = `<span class="fw-bold">${bmi}</span> <small class="text-muted">(${category})</small>`;
                } else {
                    editBmiDisplay.textContent = '--';
                }
            };
            
            if (editHeightInput) editHeightInput.addEventListener('input', calculateEditBMI);
            if (editWeightInput) editWeightInput.addEventListener('input', calculateEditBMI);

            // Save patient changes
            const saveBtn = document.getElementById('savePatientBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', async () => {
                    const id = document.getElementById('editPatientId').value;
                    const patientData = {
                        firstName: document.getElementById('editFirstName').value,
                        lastName: document.getElementById('editLastName').value,
                        dateOfBirth: document.getElementById('editDOB').value,
                        gender: document.getElementById('editGender').value,
                        email: document.getElementById('editEmail').value,
                        contactNumber: document.getElementById('editContact').value,
                        address: document.getElementById('editAddress').value,
                        height: parseFloat(document.getElementById('editHeight')?.value) || null,
                        weight: parseFloat(document.getElementById('editWeight')?.value) || null,
                        eyeColor: document.getElementById('editEyeColor')?.value,
                        hairColor: document.getElementById('editHairColor')?.value,
                        skinTone: document.getElementById('editSkinTone')?.value,
                        nationality: document.getElementById('editNationality')?.value,
                        tribe: document.getElementById('editTribe')?.value,
                        photo: document.getElementById('editPhotoPreview')?.dataset?.photo || null,
                        medicalHistory: document.getElementById('editHistory').value
                            .split(',').map(s => s.trim()).filter(s => s),
                        foodAllergies: document.getElementById('editFoodAllergies').value
                            .split(',').map(s => s.trim()).filter(s => s),
                        medicationAllergies: document.getElementById('editMedAllergies').value
                            .split(',').map(s => s.trim()).filter(s => s)
                    };

                    ui.setButtonLoading(saveBtn, true);

                    try {
                        await api.updatePatient(id, patientData);
                        notifications.success('Patient updated successfully');
                        bootstrap.Modal.getInstance(document.getElementById('editPatientModal')).hide();
                        this.loadPatients();
                    } catch (error) {
                        notifications.error(error.message);
                    } finally {
                        ui.setButtonLoading(saveBtn, false);
                    }
                });
            }

            // Confirm delete
            const deleteBtn = document.getElementById('confirmDeleteBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async () => {
                    const id = document.getElementById('deletePatientId').value;

                    ui.setButtonLoading(deleteBtn, true);

                    try {
                        await api.deletePatient(id);
                        notifications.success('Patient deleted successfully');
                        bootstrap.Modal.getInstance(document.getElementById('deletePatientModal')).hide();
                        this.loadPatients();
                    } catch (error) {
                        notifications.error(error.message);
                    } finally {
                        ui.setButtonLoading(deleteBtn, false);
                    }
                });
            }
        },

        /**
         * Setup search functionality
         */
        setupSearch() {
            const searchInput = document.querySelector('input[placeholder="Search..."]');
            if (!searchInput) return;

            searchInput.addEventListener('input', utils.debounce(async (e) => {
                const query = e.target.value.trim();
                
                if (query.length < 2) {
                    this.loadPatients();
                    return;
                }

                try {
                    const patients = await api.searchPatients(query);
                    const patientList = document.getElementById('patientList');
                    
                    if (patients.length === 0) {
                        patientList.innerHTML = `
                            <div class="col-12 text-center py-4 text-muted">
                                <p>No patients found matching "${utils.escapeHtml(query)}"</p>
                            </div>
                        `;
                        return;
                    }

                    patientList.innerHTML = patients.map(p => ui.createPatientCard(p)).join('');
                    this.setupPatientActions();
                } catch (error) {
                    notifications.error('Search failed');
                }
            }, 300));
        }
    };

    // ========================================
    // Initialization
    // ========================================
    function init() {
        // Setup form handlers
        forms.setupLoginForm();
        forms.setupRegisterForm();
        forms.setupPatientForm();
        forms.setupAppointmentForm();
        forms.setupLogout();

        // Initialize socket connection if authenticated
        if (auth.isAuthenticated()) {
            socket.init();
            ui.updateUserDisplay();
            notificationCenter.init();
            
            // Start periodic account status check (every 30 seconds)
            auth.checkAccountStatus();
            setInterval(() => auth.checkAccountStatus(), 30000);
            
            // Check for upcoming appointments and send reminders
            checkAppointmentReminders();
            setInterval(checkAppointmentReminders, 300000); // Check every 5 minutes
        }

        // Page-specific initialization
        const path = window.location.pathname;

        // Provider dashboard only (not patient-dashboard)
        if (path.includes('dashboard.html') && !path.includes('patient-dashboard')) {
            // Block admins from accessing the provider dashboard
            if (!auth.requireNonAdmin()) {
                return; // Will redirect to /admin
            }
            
            if (auth.requireAuth()) {
                dashboard.loadPatients();
                dashboard.setupSearch();
                dashboard.setupModalHandlers();

                // Tab handling
                const appointmentsTab = document.getElementById('appointments-tab');
                if (appointmentsTab) {
                    appointmentsTab.addEventListener('shown.bs.tab', () => {
                        dashboard.loadAppointments();
                    });
                }
            }
        }

        // Listen for real-time events
        document.addEventListener('patientCreated', () => dashboard.loadPatients());
        document.addEventListener('patientUpdated', () => dashboard.loadPatients());
        document.addEventListener('patientDeleted', () => dashboard.loadPatients());
    }
    
    /**
     * Check for upcoming appointments and send reminders
     */
    async function checkAppointmentReminders() {
        try {
            const appointments = await api.getAppointments();
            const now = new Date();
            const reminderKey = 'hie_reminded_appointments';
            let reminded = [];
            
            try {
                reminded = JSON.parse(localStorage.getItem(reminderKey) || '[]');
            } catch (e) {
                reminded = [];
            }
            
            appointments.forEach(appt => {
                if (appt.status !== 'scheduled') return;
                
                const apptDate = new Date(appt.date);
                const diffHours = (apptDate - now) / 36e5;
                
                // Remind if within 1 hour and not already reminded
                if (diffHours > 0 && diffHours <= 1 && !reminded.includes(appt.id)) {
                    const patientName = appt.patient ? 
                        `${appt.patient.firstName} ${appt.patient.lastName}` : 'Unknown';
                    const timeStr = apptDate.toLocaleTimeString('en-US', { 
                        hour: '2-digit', minute: '2-digit' 
                    });
                    
                    notificationCenter.add(
                        '⏰ Appointment Starting Soon',
                        `${patientName} at ${timeStr}`,
                        'warning'
                    );
                    
                    reminded.push(appt.id);
                }
            });
            
            // Clean old reminders and save
            const validIds = appointments.map(a => a.id);
            reminded = reminded.filter(id => validIds.includes(id));
            localStorage.setItem(reminderKey, JSON.stringify(reminded));
        } catch (e) {
            console.log('Could not check appointment reminders');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ========================================
    // Expose public API
    // ========================================
    window.HIE = {
        api,
        auth,
        notifications,
        notificationCenter,
        utils,
        ui,
        dashboard
    };

})();
