/**
 * API Documentation Page Module
 */

const ApiDocsModule = {
    /**
     * Check authentication - admin only access
     */
    checkAuth: function() {
        const token = localStorage.getItem('hie_token');
        const userData = localStorage.getItem('hie_user');
        
        if (!token) {
            window.location.href = '/login.html';
            return false;
        }
        
        try {
            const user = JSON.parse(userData);
            if (user.role !== 'admin') {
                alert('Access denied. API documentation is restricted to administrators only.');
                window.location.href = '/dashboard.html';
                return false;
            }
        } catch (e) {
            window.location.href = '/login.html';
            return false;
        }
        
        return true;
    },

    /**
     * Initialize API docs page
     */
    init: function() {
        this.checkAuth();
    }
};

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    ApiDocsModule.init();
});

// Export for use
window.ApiDocsModule = ApiDocsModule;
