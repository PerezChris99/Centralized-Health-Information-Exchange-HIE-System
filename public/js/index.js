/**
 * Index/Landing Page Module
 */

const IndexModule = {
    /**
     * Setup smooth scrolling for anchor links
     */
    setupSmoothScrolling: function() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    },

    /**
     * Setup navbar shadow on scroll
     */
    setupNavbarScroll: function() {
        window.addEventListener('scroll', function() {
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                if (window.scrollY > 50) {
                    navbar.style.boxShadow = '0 2px 30px rgba(0,0,0,0.15)';
                } else {
                    navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
                }
            }
        });
    },

    /**
     * Check auth state and update navbar
     */
    updateNavbarAuthState: function() {
        const TOKEN_KEY = 'hie_token';
        const USER_KEY = 'hie_user';
        
        const token = localStorage.getItem(TOKEN_KEY);
        const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
        
        if (token && user) {
            // User is logged in - show user menu
            const authButtons = document.getElementById('authButtons');
            const userMenu = document.getElementById('userMenu');
            
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            
            // Set dashboard link
            const dashboardLink = document.getElementById('dashboardLink');
            if (dashboardLink) {
                if (user.role === 'admin') {
                    dashboardLink.href = '/admin';
                } else if (user.role === 'patient') {
                    dashboardLink.href = '/patient-dashboard.html';
                } else {
                    dashboardLink.href = '/dashboard.html';
                }
            }
            
            // Show admin link for admins
            if (user.role === 'admin') {
                const adminNavItem = document.getElementById('adminNavItem');
                if (adminNavItem) adminNavItem.style.display = 'block';
            }
            
            // Handle logout
            const logoutBtn = document.getElementById('logoutBtnIndex');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    window.location.reload();
                });
            }
        }
    },

    /**
     * Animate statistics numbers
     */
    setupStatsAnimation: function() {
        const stats = document.querySelectorAll('.stat-number');
        const statSection = document.querySelector('.stat-grid');
        let isAnimating = false;

        const animateStats = () => {
            if (isAnimating) return;
            isAnimating = true;

            stats.forEach(stat => {
                const target = +stat.getAttribute('data-target');
                const suffix = stat.getAttribute('data-suffix') || '';
                const duration = 2000; // 2 seconds
                const frameDuration = 1000 / 60;
                const totalFrames = Math.round(duration / frameDuration);
                const easeOutQuad = t => t * (2 - t);
                
                let frame = 0;
                
                const counter = setInterval(() => {
                    frame++;
                    const progress = easeOutQuad(frame / totalFrames);
                    const currentCount = Math.round(target * progress);
                    
                    if (target >= 1000) {
                        stat.innerText = currentCount.toLocaleString() + suffix;
                    } else {
                        stat.innerText = currentCount + suffix;
                    }
                    
                    if (frame === totalFrames) {
                        clearInterval(counter);
                        if (stat === stats[stats.length - 1]) {
                            isAnimating = false;
                        }
                    }
                }, frameDuration);
            });
        };

        // Trigger on Scroll (Intersection Observer)
        if (statSection) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        animateStats();
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(statSection);
        }

        // Trigger every 30 seconds if visible
        setInterval(() => {
            if (statSection) {
                const rect = statSection.getBoundingClientRect();
                const isVisible = (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                );
                
                if (isVisible) {
                    animateStats();
                }
            }
        }, 30000);
    },

    /**
     * Initialize landing page
     */
    init: function() {
        this.setupSmoothScrolling();
        this.setupNavbarScroll();
        this.updateNavbarAuthState();
        this.setupStatsAnimation();
    }
};

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    IndexModule.init();
});

// Export for use
window.IndexModule = IndexModule;
