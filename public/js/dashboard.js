/**
 * Dashboard (Provider) Page Module
 * Handles authentication check and search functionality
 */

const DashboardModule = {
    /**
     * Check authentication - simple check only, no API validation that causes logout
     */
    checkAuth: function() {
        const token = localStorage.getItem('hie_token');
        const user = localStorage.getItem('hie_user');
        
        if (!token || !user) {
            window.location.href = '/login.html';
            return false;
        }
        
        // Check if user is admin - redirect them to admin page
        try {
            const userData = JSON.parse(user);
            if (userData.role === 'admin') {
                window.location.href = '/admin';
                return false;
            }
            // Check if user is patient - redirect them to patient dashboard
            if (userData.role === 'patient') {
                window.location.href = '/patient-dashboard.html';
                return false;
            }
        } catch (e) {
            // Invalid user data, redirect to login
            localStorage.removeItem('hie_token');
            localStorage.removeItem('hie_user');
            window.location.href = '/login.html';
            return false;
        }
        
        return true;
    },

    /**
     * Show API docs link for admin users only
     */
    setupApiDocsLink: function() {
        const userData = localStorage.getItem('hie_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (user.role === 'admin') {
                    const apiDocsNavItem = document.getElementById('apiDocsNavItem');
                    if (apiDocsNavItem) {
                        apiDocsNavItem.classList.remove('d-none');
                    }
                }
            } catch (e) {
                console.error('Error parsing user data');
            }
        }
    },

    /**
     * Setup patient search functionality
     */
    setupSearch: function() {
        const searchInput = document.getElementById('searchPatients');
        if (!searchInput) return;

        searchInput.addEventListener('input', 
            HIE.utils.debounce(async function(e) {
                const query = e.target.value.trim();
                if (query.length < 2) {
                    HIE.dashboard.loadPatients();
                    return;
                }
                
                try {
                    const patients = await HIE.api.searchPatients(query);
                    const patientList = document.getElementById('patientList');
                    
                    if (patients.length === 0) {
                        patientList.innerHTML = `
                            <div class="col-12 text-center py-2 text-muted">
                                <i class="fas fa-search fa-lg mb-1"></i>
                                <p style="font-size: 0.75rem;">No patients found matching "${HIE.utils.escapeHtml(query)}"</p>
                            </div>
                        `;
                        return;
                    }
                    
                    patientList.innerHTML = patients.map(p => HIE.ui.createPatientCard(p)).join('');
                    HIE.dashboard.setupPatientActions();
                } catch (error) {
                    HIE.notifications.error('Search failed');
                }
            }, 300)
        );
    },

    /**
     * Initialize dashboard page
     */
    init: function() {
        if (!this.checkAuth()) return;
        
        this.setupApiDocsLink();
        this.setupSearch();
    }
};

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    DashboardModule.init();
});

// Export for use
window.DashboardModule = DashboardModule;
