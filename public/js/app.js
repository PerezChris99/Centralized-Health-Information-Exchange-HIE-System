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

                // Handle unauthorized responses
                if (response.status === 401) {
                    auth.clearAuth();
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
        },

        /**
         * Handle login
         */
        async login(email, password) {
            const response = await api.login(email, password);
            
            if (response.success && response.token) {
                this.saveAuth(response.token, response.user);
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
            
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/auth/check-status`, {
                    headers: {
                        'Authorization': `Bearer ${state.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
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
    // Notifications Module
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
                document.dispatchEvent(new CustomEvent('patientCreated', { detail: patient }));
            });

            state.socket.on('patient_updated', (patient) => {
                notifications.info(`Patient updated: ${patient.firstName} ${patient.lastName}`);
                document.dispatchEvent(new CustomEvent('patientUpdated', { detail: patient }));
            });

            state.socket.on('patient_deleted', (data) => {
                notifications.info('Patient record deleted');
                document.dispatchEvent(new CustomEvent('patientDeleted', { detail: data }));
            });

            // Appointment events
            state.socket.on('appointment_created', (appointment) => {
                notifications.info('New appointment scheduled');
                document.dispatchEvent(new CustomEvent('appointmentCreated', { detail: appointment }));
            });

            state.socket.on('appointment_updated', (appointment) => {
                notifications.info('Appointment updated');
                document.dispatchEvent(new CustomEvent('appointmentUpdated', { detail: appointment }));
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
            return `
                <div class="col-md-6 col-lg-4 col-xl-3">
                    <div class="patient-card p-2" data-patient-id="${patient.id}">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <h6 class="mb-0" style="font-size: 0.95rem;">${utils.escapeHtml(patient.firstName)} ${utils.escapeHtml(patient.lastName)}</h6>
                            <span class="badge bg-info text-white" style="font-size: 0.75rem; padding: 0.2rem 0.45rem;">${utils.escapeHtml(patient.gender)}</span>
                        </div>
                        <p class="text-muted mb-0" style="font-size: 0.85rem;">
                            <i class="fas fa-birthday-cake me-1"></i>${utils.formatDate(patient.dateOfBirth)}
                        </p>
                        <p class="text-muted mb-2" style="font-size: 0.85rem;">
                            <i class="fas fa-phone me-1"></i>${utils.escapeHtml(patient.contactNumber || 'N/A')}
                        </p>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-primary view-patient" data-id="${patient.id}" style="font-size: 0.8rem;">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary edit-patient" data-id="${patient.id}" style="font-size: 0.8rem;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-patient" data-id="${patient.id}" style="font-size: 0.8rem;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
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
                        // Redirect admin users to admin dashboard
                        const user = auth.getUser();
                        if (user && user.role === 'admin') {
                            window.location.href = '/admin';
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
                    const message = await auth.register({
                        name,
                        email,
                        password,
                        role: userType === 'healthcare-provider' ? 'provider' : userType
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

                content.innerHTML = `
                    <div class="row g-3">
                        <!-- Photo and Basic Info -->
                        <div class="col-12 text-center mb-2">
                            ${photoHtml}
                            <h5 class="mt-2 mb-0">${utils.escapeHtml(patient.firstName)} ${utils.escapeHtml(patient.lastName)}</h5>
                            <p class="text-muted mb-0" style="font-size: 0.9rem;">${utils.escapeHtml(patient.nationality || '')} ${patient.tribe ? '• ' + utils.escapeHtml(patient.tribe) : ''}</p>
                        </div>
                        
                        <!-- Personal Information -->
                        <div class="col-md-6">
                            <div class="patient-detail-section mb-2 p-2">
                                <h6 class="text-primary-color border-bottom pb-1 mb-2" style="font-size: 0.95rem;">
                                    <i class="fas fa-user me-1"></i>Personal
                                </h6>
                                <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">DOB</span><span class="detail-value" style="font-size: 0.85rem;">${utils.formatDate(patient.dateOfBirth)}</span></div>
                                <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Gender</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.gender)}</span></div>
                                <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Nationality</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.nationality || 'N/A')}</span></div>
                                <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Tribe</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.tribe || 'N/A')}</span></div>
                            </div>
                        </div>
                        
                        <!-- Physical Characteristics -->
                        <div class="col-md-6">
                            <div class="patient-detail-section mb-2 p-2">
                                <h6 class="text-primary-color border-bottom pb-1 mb-2" style="font-size: 0.95rem;">
                                    <i class="fas fa-ruler-vertical me-1"></i>Physical
                                </h6>
                                <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Height</span><span class="detail-value" style="font-size: 0.85rem;">${patient.height ? patient.height + ' cm' : 'N/A'}</span></div>
                                <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Weight</span><span class="detail-value" style="font-size: 0.85rem;">${patient.weight ? patient.weight + ' kg' : 'N/A'}</span></div>
                                <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">BMI</span><span class="detail-value" style="font-size: 0.85rem;">${bmiHtml}</span></div>
                                <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Eyes/Hair</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.eyeColor || '-')}/${utils.escapeHtml(patient.hairColor || '-')}</span></div>
                            </div>
                        </div>
                        
                        <!-- Contact Information -->
                        <div class="col-md-6">
                            <div class="patient-detail-section mb-2 p-2">
                                <h6 class="text-primary-color border-bottom pb-1 mb-2" style="font-size: 0.95rem;">
                                    <i class="fas fa-address-card me-1"></i>Contact
                                </h6>
                                <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Email</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.email || 'N/A')}</span></div>
                                <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Phone</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.contactNumber || 'N/A')}</span></div>
                                <div class="detail-row py-1"><span class="detail-label" style="font-size: 0.85rem;">Address</span><span class="detail-value" style="font-size: 0.85rem;">${utils.escapeHtml(patient.address || 'N/A')}</span></div>
                            </div>
                        </div>
                        
                        <!-- Allergies -->
                        <div class="col-md-6">
                            <div class="patient-detail-section mb-2 p-2">
                                <h6 class="text-primary-color border-bottom pb-1 mb-2" style="font-size: 0.95rem;">
                                    <i class="fas fa-allergies me-1"></i>Allergies
                                </h6>
                                <p class="mb-1" style="font-size: 0.8rem;"><i class="fas fa-utensils text-warning me-1"></i><strong>Food:</strong>
                                ${patient.foodAllergies && patient.foodAllergies.length > 0 
                                    ? patient.foodAllergies.map(a => `<span class="badge bg-warning text-dark" style="font-size: 0.7rem;">${utils.escapeHtml(a)}</span>`).join(' ') 
                                    : '<span class="text-muted">None</span>'}</p>
                                <p class="mb-0" style="font-size: 0.8rem;"><i class="fas fa-pills text-danger me-1"></i><strong>Meds:</strong>
                                ${patient.medicationAllergies && patient.medicationAllergies.length > 0 
                                    ? patient.medicationAllergies.map(a => `<span class="badge bg-danger" style="font-size: 0.7rem;">${utils.escapeHtml(a)}</span>`).join(' ') 
                                    : '<span class="text-muted">None</span>'}</p>
                            </div>
                        </div>
                        
                        <!-- Medical History -->
                        <div class="col-12">
                            <div class="patient-detail-section p-2">
                                <h6 class="text-primary-color border-bottom pb-1 mb-1" style="font-size: 0.95rem;">
                                    <i class="fas fa-notes-medical me-1"></i>Medical History
                                </h6>
                                <p class="mb-0" style="font-size: 0.85rem;">${utils.escapeHtml(medicalHistory)}</p>
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
        forms.setupLogout();

        // Initialize socket connection if authenticated
        if (auth.isAuthenticated()) {
            socket.init();
            ui.updateUserDisplay();
            
            // Start periodic account status check (every 30 seconds)
            auth.checkAccountStatus();
            setInterval(() => auth.checkAccountStatus(), 30000);
        }

        // Page-specific initialization
        const path = window.location.pathname;

        if (path.includes('dashboard')) {
            // Block admins from accessing the provider dashboard
            if (!auth.requireNonAdmin()) {
                return; // Will redirect to /admin
            }
            
            if (auth.requireAuth()) {
                dashboard.loadPatients();
                dashboard.setupSearch();
                dashboard.setupModalHandlers();
            }
        }

        // Listen for real-time events
        document.addEventListener('patientCreated', () => dashboard.loadPatients());
        document.addEventListener('patientUpdated', () => dashboard.loadPatients());
        document.addEventListener('patientDeleted', () => dashboard.loadPatients());
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
        utils,
        ui,
        dashboard
    };

})();
