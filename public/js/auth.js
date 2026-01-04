/**
 * Auth Module - Login, Register, and Patient Register functionality
 */

const AuthModule = {
    /**
     * Toggle password visibility
     */
    setupPasswordToggle: function(toggleBtnId, passwordFieldId) {
        const toggleBtn = document.getElementById(toggleBtnId);
        const passwordField = document.getElementById(passwordFieldId);
        
        if (toggleBtn && passwordField) {
            toggleBtn.addEventListener('click', function() {
                const icon = this.querySelector('i');
                
                if (passwordField.type === 'password') {
                    passwordField.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordField.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }
    },

    /**
     * Forgot password handler
     */
    setupForgotPassword: function() {
        const forgotLink = document.getElementById('forgotPasswordLink');
        const emailField = document.getElementById('email');
        
        if (forgotLink && emailField) {
            forgotLink.addEventListener('click', function(e) {
                e.preventDefault();
                const email = emailField.value;
                
                if (!email) {
                    HIE.notifications.warning('Please enter your email address first');
                    emailField.focus();
                    return;
                }

                HIE.api.forgotPassword(email)
                    .then(() => HIE.notifications.success('Password reset email sent!'))
                    .catch(err => HIE.notifications.error(err.message));
            });
        }
    },

    /**
     * Check if user is already authenticated and redirect
     */
    checkAuthAndRedirect: async function(targetPage) {
        if (HIE.auth.isAuthenticated()) {
            try {
                // Validate token by making an API call
                await HIE.api.getPatients();
                // Redirect based on role
                const user = HIE.auth.getUser();
                if (user) {
                    if (user.role === 'admin') {
                        window.location.href = '/admin';
                    } else if (user.role === 'patient') {
                        window.location.href = '/patient-dashboard.html';
                    } else {
                        window.location.href = '/dashboard.html';
                    }
                }
            } catch (e) {
                // Token is invalid, clear it (don't use logout which redirects)
                HIE.auth.clearAuth();
            }
        }
    },

    /**
     * Setup step navigation for registration form
     */
    setupStepNavigation: function() {
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        const stepIndicator1 = document.getElementById('stepIndicator1');
        const stepIndicator2 = document.getElementById('stepIndicator2');
        const nextStepBtn = document.getElementById('nextStepBtn');
        const prevStepBtn = document.getElementById('prevStepBtn');

        if (!step1 || !step2 || !nextStepBtn || !prevStepBtn) return;

        nextStepBtn.addEventListener('click', function() {
            // Validate step 1
            const userType = document.getElementById('userType').value;
            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            if (!userType || !fullName || !email || !password) {
                HIE.notifications.warning('Please fill in all fields');
                return;
            }

            if (password.length < 6) {
                HIE.notifications.warning('Password must be at least 6 characters');
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                HIE.notifications.warning('Please enter a valid email address');
                return;
            }

            // Show step 2
            step1.style.display = 'none';
            step2.style.display = 'block';
            if (stepIndicator2) stepIndicator2.classList.add('active');
        });

        prevStepBtn.addEventListener('click', function() {
            step1.style.display = 'block';
            step2.style.display = 'none';
            if (stepIndicator2) stepIndicator2.classList.remove('active');
        });
    },

    /**
     * Setup patient registration form
     */
    setupPatientRegistration: function() {
        const form = document.getElementById('patientRegistrationForm');
        if (!form) return;

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const originalText = submitBtn.innerHTML;
            
            // Validate passwords match
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                HIE.notifications.error('Passwords do not match');
                return;
            }
            
            if (password.length < 6) {
                HIE.notifications.error('Password must be at least 6 characters');
                return;
            }
            
            // Collect form data
            const formData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                dateOfBirth: document.getElementById('dateOfBirth').value,
                gender: document.getElementById('gender').value,
                email: document.getElementById('email').value,
                contactNumber: document.getElementById('contactNumber').value,
                address: document.getElementById('address').value,
                password: password
            };
            
            // Validate required fields
            if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.gender || !formData.email) {
                HIE.notifications.error('Please fill in all required fields');
                return;
            }
            
            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Account...';
            
            try {
                const response = await fetch('/api/auth/register/patient', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    HIE.notifications.success('Registration successful! Redirecting to login...');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                } else {
                    throw new Error(result.error || 'Registration failed');
                }
            } catch (error) {
                HIE.notifications.error(error.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
        
        // Redirect if already logged in
        if (HIE.auth.isAuthenticated()) {
            const user = HIE.auth.getUser();
            if (user.role === 'patient') {
                window.location.href = '/patient-dashboard.html';
            } else {
                window.location.href = '/dashboard.html';
            }
        }
    },

    /**
     * Initialize login page
     */
    initLoginPage: function() {
        this.setupPasswordToggle('togglePassword', 'password');
        this.setupForgotPassword();
        this.checkAuthAndRedirect();
    },

    /**
     * Initialize register page
     */
    initRegisterPage: function() {
        this.setupStepNavigation();
        this.checkAuthAndRedirect();
    },

    /**
     * Initialize patient register page
     */
    initPatientRegisterPage: function() {
        this.setupPasswordToggle('togglePassword', 'password');
        this.setupPatientRegistration();
    }
};

// Export for use
window.AuthModule = AuthModule;
