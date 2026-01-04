/**
 * Common Public Pages Module (FAQ, Contact)
 * Handles auth state for public-facing pages
 */

const PublicPagesModule = {
    /**
     * Check auth state and update navbar
     */
    updateNavbarAuthState: function() {
        const token = localStorage.getItem('hie_token');
        const userStr = localStorage.getItem('hie_user');
        
        if (token && userStr) {
            const user = JSON.parse(userStr);
            const authButtons = document.getElementById('authButtons');
            const userMenu = document.getElementById('userMenu');
            const dashboardLink = document.getElementById('dashboardLink');
            
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            
            if (dashboardLink) {
                if (user.role === 'admin') {
                    dashboardLink.href = '/admin';
                } else if (user.role === 'patient') {
                    dashboardLink.href = '/patient-dashboard.html';
                } else {
                    dashboardLink.href = '/dashboard.html';
                }
            }
        }
        
        // Logout handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('hie_token');
                localStorage.removeItem('hie_user');
                window.location.href = '/index.html';
            });
        }
    },

    /**
     * Initialize FAQ page
     */
    initFaqPage: function() {
        this.updateNavbarAuthState();
    },

    /**
     * Initialize Contact page
     */
    initContactPage: function() {
        this.updateNavbarAuthState();
        this.setupContactForm();
    },

    /**
     * Setup contact form submission
     */
    setupContactForm: function() {
        const form = document.getElementById('contactForm');
        if (!form) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
            submitBtn.disabled = true;
            
            // Simulate API call
            setTimeout(function() {
                form.style.display = 'none';
                const successMessage = document.getElementById('successMessage');
                if (successMessage) {
                    successMessage.classList.remove('d-none');
                    successMessage.style.display = 'block';
                }
            }, 1500);
        });
    },

    /**
     * Reset contact form
     */
    resetContactForm: function() {
        const form = document.getElementById('contactForm');
        const successMessage = document.getElementById('successMessage');
        
        if (form) {
            form.reset();
            form.style.display = 'block';
        }
        
        if (successMessage) {
            successMessage.classList.add('d-none');
            successMessage.style.display = 'none';
        }
        
        const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send Message';
            submitBtn.disabled = false;
        }
    }
};

// Global function for reset button
function resetForm() {
    PublicPagesModule.resetContactForm();
}

// Export for use
window.PublicPagesModule = PublicPagesModule;
