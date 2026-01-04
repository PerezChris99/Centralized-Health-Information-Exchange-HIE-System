/**
 * Admin Dashboard - JavaScript
 * Handles all admin panel functionality including charts, user management, and audit logs
 */

// ================================
// Configuration & State
// ================================
const API_BASE = '/api/admin';
const TOKEN_KEY = 'hie_token';
const USER_KEY = 'hie_user';
let authToken = null;
let currentUser = null;
let charts = {};
let refreshInterval = null;

// ================================
// Initialization
// ================================
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    authToken = localStorage.getItem(TOKEN_KEY);
    currentUser = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
    
    if (!authToken || currentUser.role !== 'admin') {
        showToast('Access Denied', 'Admin access required. Redirecting...', 'error');
        setTimeout(() => window.location.href = '/login', 2000);
        return;
    }
    
    // Display admin name
    document.getElementById('adminDisplay').textContent = currentUser.name || 'Administrator';
    
    // Initialize dashboard
    initializeNavigation();
    initializeEventListeners();
    loadAllData();
    
    // Auto-refresh every 30 seconds
    refreshInterval = setInterval(loadLiveData, 30000);
});

// ================================
// Navigation & Sections
// ================================
function initializeNavigation() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
            
            // Update active state
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Navbar navigation
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
        });
    });
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        switch(sectionId) {
            case 'users':
                loadUsers();
                break;
            case 'sessions':
                loadSessions();
                break;
            case 'audit':
                loadAuditLogs();
                loadLogsSummary();
                break;
            case 'logs-text':
                loadPlainLogs();
                break;
            case 'system':
                loadSystemHealth();
                break;
            case 'activity-feed':
                loadFullActivityFeed();
                break;
        }
    }
}

// ================================
// Event Listeners
// ================================
function initializeEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Refresh button
    document.getElementById('refreshDataBtn').addEventListener('click', () => {
        loadAllData();
        showToast('Refreshed', 'Data has been refreshed', 'success');
    });
    
    // User filters
    document.getElementById('filterUsersBtn')?.addEventListener('click', loadUsers);
    document.getElementById('resetUsersFilterBtn')?.addEventListener('click', () => {
        document.getElementById('userSearchInput').value = '';
        document.getElementById('userRoleFilter').value = '';
        document.getElementById('userStatusFilter').value = '';
        loadUsers();
    });
    
    // Session filters
    document.getElementById('filterSessionsBtn')?.addEventListener('click', loadSessions);
    
    // Log filters
    document.getElementById('filterLogsBtn')?.addEventListener('click', () => loadAuditLogs(1));
    document.getElementById('refreshLogsBtn')?.addEventListener('click', () => loadAuditLogs(1));
    document.getElementById('exportLogsBtn')?.addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('exportModal')).show();
    });
    
    // Plain logs
    document.getElementById('refreshPlainLogsBtn')?.addEventListener('click', loadPlainLogs);
    document.getElementById('copyPlainLogsBtn')?.addEventListener('click', copyPlainLogs);
    document.getElementById('downloadPlainLogsBtn')?.addEventListener('click', downloadPlainLogs);
    document.getElementById('plainLogLimit')?.addEventListener('change', loadPlainLogs);
    
    // Export buttons
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => exportLogs('json'));
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => exportLogs('csv'));
    
    // Export modal buttons
    document.querySelectorAll('#exportModal [data-format]').forEach(btn => {
        btn.addEventListener('click', function() {
            exportLogs(this.getAttribute('data-format'));
            bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
        });
    });
    
    // Activity Feed
    document.getElementById('refreshActivityFeedBtn')?.addEventListener('click', loadActivityFeed);
    document.getElementById('activityFeedLimit')?.addEventListener('change', loadActivityFeed);
    document.getElementById('applyFeedFilterBtn')?.addEventListener('click', loadFullActivityFeed);
    document.getElementById('resetFeedFilterBtn')?.addEventListener('click', () => {
        document.getElementById('feedActionFilter').value = '';
        document.getElementById('feedResourceFilter').value = '';
        document.getElementById('feedLimitFilter').value = '100';
        loadFullActivityFeed();
    });
}

// ================================
// API Helper Functions
// ================================
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
    
    try {
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error(`API Error: ${endpoint}`, error);
        throw error;
    }
}

// ================================
// Data Loading Functions
// ================================
async function loadAllData() {
    updateLastRefresh();
    
    try {
        await Promise.all([
            loadOverviewStats(),
            loadChartData(),
            loadOnlineUsers(),
            loadOfflineUsers(),
            loadActivityFeed()
        ]);
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error', 'Failed to load some data', 'error');
    }
}

async function loadLiveData() {
    try {
        await Promise.all([
            loadOverviewStats(),
            loadOnlineUsers(),
            loadOfflineUsers(),
            loadActivityFeed()
        ]);
        updateLastRefresh();
    } catch (error) {
        console.error('Error refreshing live data:', error);
    }
}

function updateLastRefresh() {
    const now = new Date().toLocaleTimeString();
    document.getElementById('lastRefresh').textContent = now;
}

// ================================
// Overview Statistics
// ================================
async function loadOverviewStats() {
    try {
        const response = await apiRequest('/stats/overview');
        const data = response.data;
        
        // Update stat cards
        document.getElementById('totalUsers').textContent = data.totals.users;
        document.getElementById('totalPatients').textContent = data.totals.patients;
        document.getElementById('totalAppointments').textContent = data.totals.appointments;
        document.getElementById('totalRecords').textContent = data.totals.medicalRecords;
        
        // Update today stats
        document.getElementById('newUsersToday').textContent = data.today.newUsers;
        document.getElementById('newPatientsToday').textContent = data.today.newPatients;
        document.getElementById('appointmentsToday').textContent = data.today.appointments;
        
        // Update online/offline counts
        document.getElementById('onlineCount').textContent = data.userStatus.online;
        document.getElementById('offlineCount').textContent = data.userStatus.offline;
        document.getElementById('onlineCountBadge').textContent = data.userStatus.online;
        document.getElementById('offlineCountBadge').textContent = data.userStatus.offline;
        
    } catch (error) {
        console.error('Error loading overview stats:', error);
    }
}

// ================================
// Chart Data & Visualization
// ================================
async function loadChartData() {
    try {
        const response = await apiRequest('/stats/charts');
        const data = response.data;
        
        createActivityChart(data);
        createRolesChart(data);
        createGenderChart(data);
        createAppointmentStatusChart(data);
        createActionsChart(data);
        
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

function createActivityChart(data) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    
    if (charts.activity) charts.activity.destroy();
    
    const labels = data.userRegistrations.map(d => formatDate(d.date));
    
    charts.activity = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'User Registrations',
                    data: data.userRegistrations.map(d => d.count),
                    borderColor: '#2c7a7b',
                    backgroundColor: 'rgba(44, 122, 123, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Patient Registrations',
                    data: data.patientRegistrations.map(d => d.count),
                    borderColor: '#38a169',
                    backgroundColor: 'rgba(56, 161, 105, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Appointments',
                    data: data.appointmentsByDay.map(d => d.count),
                    borderColor: '#d69e2e',
                    backgroundColor: 'rgba(214, 158, 46, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true },
                x: {
                    ticks: {
                        maxTicksLimit: 10,
                        maxRotation: 0
                    }
                }
            }
        }
    });
}

function createRolesChart(data) {
    const ctx = document.getElementById('rolesChart');
    if (!ctx) return;
    
    if (charts.roles) charts.roles.destroy();
    
    const roleData = data.genderDistribution ? {} : {}; // Will use overview data
    
    // Get role data from overview API
    apiRequest('/stats/overview').then(response => {
        const roles = response.data.roleDistribution;
        
        charts.roles = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(roles).map(r => capitalizeFirst(r)),
                datasets: [{
                    data: Object.values(roles),
                    backgroundColor: ['#e53e3e', '#2c7a7b', '#38a169', '#d69e2e'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20 }
                    }
                }
            }
        });
    });
}

function createGenderChart(data) {
    const ctx = document.getElementById('genderChart');
    if (!ctx) return;
    
    if (charts.gender) charts.gender.destroy();
    
    const genderData = data.genderDistribution || {};
    
    charts.gender = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(genderData),
            datasets: [{
                data: Object.values(genderData),
                backgroundColor: ['#3182ce', '#d53f8c', '#805ad5'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15 }
                }
            }
        }
    });
}

function createAppointmentStatusChart(data) {
    const ctx = document.getElementById('appointmentStatusChart');
    if (!ctx) return;
    
    if (charts.appointmentStatus) charts.appointmentStatus.destroy();
    
    const statusData = data.appointmentStatus || {};
    const colors = {
        'scheduled': '#3182ce',
        'confirmed': '#38a169',
        'completed': '#2c7a7b',
        'cancelled': '#e53e3e',
        'pending': '#d69e2e'
    };
    
    charts.appointmentStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusData).map(s => capitalizeFirst(s)),
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: Object.keys(statusData).map(s => colors[s] || '#718096'),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15 }
                }
            }
        }
    });
}

function createActionsChart(data) {
    const ctx = document.getElementById('actionsChart');
    if (!ctx) return;
    
    if (charts.actions) charts.actions.destroy();
    
    const actionData = data.actionDistribution || {};
    const colors = {
        'create': '#38a169',
        'read': '#3182ce',
        'update': '#d69e2e',
        'delete': '#e53e3e',
        'login': '#805ad5',
        'logout': '#d53f8c',
        'export': '#2c7a7b'
    };
    
    charts.actions = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(actionData).map(a => capitalizeFirst(a)),
            datasets: [{
                label: 'Actions',
                data: Object.values(actionData),
                backgroundColor: Object.keys(actionData).map(a => colors[a] || '#718096'),
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ================================
// User Management
// ================================
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        // Get filter values
        const searchTerm = document.getElementById('userSearchInput')?.value || '';
        const roleFilter = document.getElementById('userRoleFilter')?.value || '';
        const statusFilter = document.getElementById('userStatusFilter')?.value || '';
        
        // Build query params for database search
        const params = new URLSearchParams();
        if (searchTerm) params.append('q', searchTerm);
        if (roleFilter) params.append('role', roleFilter);
        if (statusFilter) params.append('status', statusFilter);
        
        // Use search endpoint if filters applied, otherwise get all
        const endpoint = (searchTerm || roleFilter || statusFilter) 
            ? `/users/search?${params.toString()}` 
            : '/users';
        
        const response = await apiRequest(endpoint);
        let users = response.data;
        
        document.getElementById('totalUsersCount').textContent = `${users.length} users`;
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No users found</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="user-avatar ${user.role === 'admin' ? 'admin' : ''}">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <span class="ms-2">${escapeHtml(user.name)}</span>
                    </div>
                </td>
                <td>${escapeHtml(user.email)}</td>
                <td><span class="role-badge role-${user.role}">${capitalizeFirst(user.role)}</span></td>
                <td>
                    <span class="status-badge ${user.is_online ? 'online' : 'offline'}">
                        ${user.is_online ? 'Online' : 'Offline'}
                    </span>
                </td>
                <td>${user.last_login ? formatDateTime(user.last_login) : 'Never'}</td>
                <td>${user.last_activity ? formatTimeAgo(user.last_activity) : 'N/A'}</td>
                <td>${formatDuration(user.session_duration || 0)}</td>
                <td><span class="badge bg-secondary">${user.login_count || 0}</span></td>
            </tr>
        `).join('');
        
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Error loading users</td></tr>';
    }
}

async function loadOnlineUsers() {
    const container = document.getElementById('onlineUsersList');
    
    try {
        const response = await apiRequest('/users/online');
        const users = response.data;
        
        if (users.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-user-slash me-2"></i>No users online</div>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="user-list-item" data-user-id="${user.id}">
                <div class="user-info">
                    <span class="status-dot online"></span>
                    <strong>${escapeHtml(user.name)}</strong>
                    <span class="text-muted small">(${user.role})</span>
                    ${user.is_blocked ? '<span class="badge bg-danger ms-2">Blocked</span>' : ''}
                </div>
                <div class="user-actions">
                    <small class="text-muted me-2">Active ${formatTimeAgo(user.last_activity)}</small>
                    ${user.role !== 'admin' ? `
                        <button class="btn btn-sm ${user.is_blocked ? 'btn-success' : 'btn-danger'}" 
                                onclick="toggleBlockUser(${user.id}, ${user.is_blocked}, '${escapeHtml(user.name)}')"
                                title="${user.is_blocked ? 'Unblock user' : 'Block user'}">
                            <i class="fas ${user.is_blocked ? 'fa-unlock' : 'fa-ban'}"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = '<div class="text-center py-4 text-danger">Error loading users</div>';
    }
}

async function loadOfflineUsers() {
    const container = document.getElementById('offlineUsersList');
    
    try {
        const response = await apiRequest('/users/offline');
        const users = response.data.slice(0, 10); // Show only recent 10
        
        if (users.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-users me-2"></i>All users are online!</div>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="user-list-item" data-user-id="${user.id}">
                <div class="user-info">
                    <span class="status-dot offline"></span>
                    <strong>${escapeHtml(user.name)}</strong>
                    <span class="text-muted small">(${user.role})</span>
                    ${user.is_blocked ? '<span class="badge bg-danger ms-2">Blocked</span>' : ''}
                </div>
                <div class="user-actions">
                    <small class="text-muted me-2">Last: ${user.last_login ? formatDateTime(user.last_login) : 'Never'}</small>
                    ${user.role !== 'admin' ? `
                        <button class="btn btn-sm ${user.is_blocked ? 'btn-success' : 'btn-danger'}" 
                                onclick="toggleBlockUser(${user.id}, ${user.is_blocked}, '${escapeHtml(user.name)}')"
                                title="${user.is_blocked ? 'Unblock user' : 'Block user'}">
                            <i class="fas ${user.is_blocked ? 'fa-unlock' : 'fa-ban'}"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = '<div class="text-center py-4 text-danger">Error loading users</div>';
    }
}

// ================================
// Sessions Management
// ================================
async function loadSessions() {
    const tbody = document.getElementById('sessionsTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        const userId = document.getElementById('sessionUserIdFilter')?.value || '';
        const isActive = document.getElementById('sessionStatusFilter')?.value || '';
        const limit = document.getElementById('sessionLimitFilter')?.value || 100;
        
        let endpoint = `/sessions?limit=${limit}`;
        if (userId) endpoint += `&user_id=${userId}`;
        if (isActive) endpoint += `&active=${isActive}`;
        
        const response = await apiRequest(endpoint);
        const sessions = response.data;
        
        document.getElementById('totalSessionsCount').textContent = `${sessions.length} sessions`;
        
        if (sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No sessions found</td></tr>';
            return;
        }
        
        tbody.innerHTML = sessions.map(session => `
            <tr>
                <td><code>#${session.id}</code></td>
                <td>
                    <strong>${escapeHtml(session.userName || 'Unknown')}</strong>
                    <br><small class="text-muted">${escapeHtml(session.userEmail || '')}</small>
                </td>
                <td><span class="role-badge role-${session.userRole}">${capitalizeFirst(session.userRole || 'user')}</span></td>
                <td>${formatDateTime(session.loginTime)}</td>
                <td>${session.logoutTime ? formatDateTime(session.logoutTime) : '<em class="text-muted">Active</em>'}</td>
                <td><span class="badge bg-info">${session.duration}</span></td>
                <td><code>${session.ipAddress || 'N/A'}</code></td>
                <td>
                    <span class="status-badge ${session.isActive ? 'online' : 'offline'}">
                        ${session.isActive ? 'Active' : 'Ended'}
                    </span>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Error loading sessions</td></tr>';
    }
}

// ================================
// Audit Logs
// ================================
let currentLogPage = 1;

async function loadAuditLogs(page = 1) {
    currentLogPage = page;
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        const userId = document.getElementById('logUserIdFilter')?.value || '';
        const action = document.getElementById('logActionFilter')?.value || '';
        const resourceType = document.getElementById('logResourceFilter')?.value || '';
        const dateFrom = document.getElementById('logDateFromFilter')?.value || '';
        const dateTo = document.getElementById('logDateToFilter')?.value || '';
        
        let endpoint = `/logs?page=${page}&per_page=50`;
        if (userId) endpoint += `&user_id=${userId}`;
        if (action) endpoint += `&action=${action}`;
        if (resourceType) endpoint += `&resource_type=${resourceType}`;
        if (dateFrom) endpoint += `&date_from=${dateFrom}`;
        if (dateTo) endpoint += `&date_to=${dateTo}`;
        
        const response = await apiRequest(endpoint);
        const logs = response.data;
        const pagination = response.pagination;
        
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No logs found</td></tr>';
            updateLogPagination({ total: 0, pages: 0 });
            return;
        }
        
        tbody.innerHTML = logs.map(log => `
            <tr>
                <td><code>#${log.id}</code></td>
                <td>${formatDateTime(log.timestamp)}</td>
                <td>
                    <strong>${log.user?.name || 'Unknown'}</strong>
                    <br><small class="text-muted">ID: ${log.user?.id || 'N/A'}</small>
                </td>
                <td><span class="action-badge action-${log.action}">${log.action.toUpperCase()}</span></td>
                <td><span class="resource-badge">${log.resourceType}</span></td>
                <td><code>#${log.resourceId}</code></td>
                <td class="text-truncate" style="max-width: 200px;" title="${escapeHtml(log.details || '')}">
                    ${escapeHtml(log.details || '-')}
                </td>
                <td><code>${log.ipAddress || 'N/A'}</code></td>
            </tr>
        `).join('');
        
        updateLogPagination(pagination);
        
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Error loading logs</td></tr>';
    }
}

function updateLogPagination(pagination) {
    const container = document.querySelector('#logsPagination ul');
    if (!container) return;
    
    const { page, pages, hasNext, hasPrev } = pagination;
    
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${!hasPrev ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadAuditLogs(${page - 1}); return false;">Previous</a>
        </li>
    `;
    
    // Page numbers
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadAuditLogs(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    // Next button
    html += `
        <li class="page-item ${!hasNext ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadAuditLogs(${page + 1}); return false;">Next</a>
        </li>
    `;
    
    container.innerHTML = html;
}

async function loadLogsSummary() {
    try {
        const response = await apiRequest('/logs/summary');
        const data = response.data;
        
        document.getElementById('totalLogsCount').textContent = data.totalLogs.toLocaleString();
        document.getElementById('todayLogsCount').textContent = data.todayLogs.toLocaleString();
        
        // Most active users
        const activeUsersContainer = document.getElementById('mostActiveUsers');
        if (data.mostActiveUsers && data.mostActiveUsers.length > 0) {
            activeUsersContainer.innerHTML = data.mostActiveUsers.slice(0, 5).map(u => `
                <span class="active-user-badge">${escapeHtml(u.name)} (${u.actionCount})</span>
            `).join('');
        } else {
            activeUsersContainer.innerHTML = '<span class="text-muted">No activity yet</span>';
        }
        
    } catch (error) {
        console.error('Error loading logs summary:', error);
    }
}

// ================================
// Plain Text Logs
// ================================
async function loadPlainLogs() {
    const container = document.getElementById('plainLogsContent');
    container.textContent = 'Loading logs...';
    
    try {
        const limit = document.getElementById('plainLogLimit')?.value || 100;
        const response = await apiRequest(`/logs/plain?limit=${limit}`);
        
        container.textContent = response.formatted || 'No logs available';
        
    } catch (error) {
        container.textContent = 'Error loading logs';
    }
}

function copyPlainLogs() {
    const content = document.getElementById('plainLogsContent').textContent;
    navigator.clipboard.writeText(content).then(() => {
        showToast('Copied', 'Logs copied to clipboard', 'success');
    }).catch(() => {
        showToast('Error', 'Failed to copy logs', 'error');
    });
}

function downloadPlainLogs() {
    const content = document.getElementById('plainLogsContent').textContent;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded', 'Logs downloaded successfully', 'success');
}

// ================================
// System Health
// ================================
async function loadSystemHealth() {
    try {
        const response = await apiRequest('/system/health');
        const data = response.data;
        
        // Update status with health score
        const statusEl = document.getElementById('systemStatus');
        const statusClass = data.status === 'healthy' ? 'healthy' : 
                           data.status === 'degraded' ? 'warning' : 
                           data.status === 'warning' ? 'warning' : 'error';
        const statusText = capitalizeFirst(data.status);
        
        statusEl.innerHTML = `
            <span class="status-dot-lg ${statusClass}"></span>
            <span class="status-text">${statusText}</span>
            <span class="health-score badge bg-${statusClass === 'healthy' ? 'success' : statusClass === 'warning' ? 'warning' : 'danger'} ms-2">
                ${data.healthScore}%
            </span>
        `;
        
        document.getElementById('lastHealthCheck').textContent = formatDateTime(data.timestamp);
        document.getElementById('activeSessionsCount').textContent = data.activeSessions;
        document.getElementById('recentActivityCount').textContent = data.recentActivity;
        
        // Database stats
        const dbStats = data.database.stats || data.database;
        document.getElementById('dbUsers').textContent = (dbStats.users || 0).toLocaleString();
        document.getElementById('dbPatients').textContent = (dbStats.patients || 0).toLocaleString();
        document.getElementById('dbAppointments').textContent = (dbStats.appointments || 0).toLocaleString();
        document.getElementById('dbRecords').textContent = (dbStats.medicalRecords || 0).toLocaleString();
        document.getElementById('dbLogs').textContent = (dbStats.auditLogs || 0).toLocaleString();
        document.getElementById('dbSessions').textContent = (dbStats.sessions || 0).toLocaleString();
        
        // Render issues and warnings
        renderSystemIssues(data.issues, data.warnings);
        
    } catch (error) {
        console.error('Error loading system health:', error);
        const statusEl = document.getElementById('systemStatus');
        statusEl.innerHTML = '<span class="status-dot-lg error"></span><span class="status-text">Error</span>';
    }
}

function renderSystemIssues(issues, warnings) {
    const container = document.getElementById('systemIssues');
    if (!container) return;
    
    const allProblems = [
        ...issues.map(i => ({ ...i, type: 'issue' })),
        ...warnings.map(w => ({ ...w, type: 'warning' }))
    ];
    
    if (allProblems.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-success">
                <i class="fas fa-check-circle fa-3x mb-3"></i>
                <h5>All Systems Operational</h5>
                <p class="text-muted mb-0">No issues detected</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allProblems.map(problem => {
        const severityClass = problem.severity === 'critical' ? 'danger' : 
                             problem.severity === 'error' ? 'danger' : 
                             problem.severity === 'warning' ? 'warning' : 'info';
        const severityIcon = problem.severity === 'critical' ? 'fa-exclamation-circle' :
                            problem.severity === 'error' ? 'fa-times-circle' :
                            problem.severity === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        return `
            <div class="system-issue-item ${severityClass}">
                <div class="issue-header">
                    <span class="issue-icon">
                        <i class="fas ${problem.icon || severityIcon}"></i>
                    </span>
                    <span class="issue-component badge bg-${severityClass}">${escapeHtml(problem.component)}</span>
                    <span class="issue-severity text-${severityClass}">${capitalizeFirst(problem.severity)}</span>
                </div>
                <div class="issue-body">
                    <p class="issue-description"><strong>Issue:</strong> ${escapeHtml(problem.issue)}</p>
                    <p class="issue-fix"><i class="fas fa-wrench me-1"></i><strong>Fix:</strong> ${escapeHtml(problem.fix)}</p>
                </div>
                ${problem.action ? `
                    <div class="issue-action">
                        <button class="btn btn-sm btn-outline-${severityClass}" onclick="handleSystemAction('${problem.action}')">
                            <i class="fas fa-tools me-1"></i>Apply Fix
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function handleSystemAction(action) {
    showToast('Info', `Action "${action}" would be executed here. Implement cleanup endpoints as needed.`, 'info');
}

// ================================
// Activity Feed
// ================================
async function loadActivityFeed() {
    const container = document.getElementById('activityFeed');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    try {
        const limit = document.getElementById('activityFeedLimit')?.value || 50;
        const response = await apiRequest(`/activity-feed?limit=${limit}`);
        const activities = response.data;
        
        if (activities.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-muted">No activity recorded yet</div>';
            return;
        }
        
        container.innerHTML = activities.map(activity => renderActivityItem(activity)).join('');
        
    } catch (error) {
        container.innerHTML = '<div class="text-center py-4 text-danger">Error loading activity</div>';
    }
}

async function loadFullActivityFeed() {
    const container = document.getElementById('fullActivityFeed');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    try {
        const limit = document.getElementById('feedLimitFilter')?.value || 100;
        const response = await apiRequest(`/activity-feed?limit=${limit}`);
        let activities = response.data;
        
        // Apply client-side filters
        const actionFilter = document.getElementById('feedActionFilter')?.value || '';
        const resourceFilter = document.getElementById('feedResourceFilter')?.value || '';
        
        if (actionFilter) {
            activities = activities.filter(a => a.action === actionFilter);
        }
        if (resourceFilter) {
            activities = activities.filter(a => a.resourceType === resourceFilter);
        }
        
        document.getElementById('feedTotalCount').textContent = `${activities.length} activities`;
        
        if (activities.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-muted">No matching activities found</div>';
            return;
        }
        
        container.innerHTML = activities.map(activity => renderActivityItem(activity, true)).join('');
        
    } catch (error) {
        container.innerHTML = '<div class="text-center py-4 text-danger">Error loading activity</div>';
    }
}

function renderActivityItem(activity, showDetails = false) {
    const iconClass = activity.icon || 'fa-circle';
    const colorClass = activity.color || 'secondary';
    const userName = activity.user?.name || 'Unknown User';
    const userRole = activity.user?.role || 'user';
    
    return `
        <div class="activity-item">
            <div class="activity-icon ${colorClass}">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-header">
                    <div class="activity-user">
                        ${escapeHtml(userName)}
                        <span class="role">(${capitalizeFirst(userRole)})</span>
                    </div>
                    <div class="activity-time">${activity.timeAgo}</div>
                </div>
                <div class="activity-description">
                    <span class="activity-action-badge ${activity.action}">${activity.action}</span>
                    ${escapeHtml(activity.description)}
                </div>
                ${showDetails ? `
                    <div class="activity-meta">
                        <span><i class="fas fa-tag"></i> ${activity.resourceType}</span>
                        <span><i class="fas fa-hashtag"></i> ${activity.resourceId}</span>
                        ${activity.ipAddress ? `<span><i class="fas fa-globe"></i> ${activity.ipAddress}</span>` : ''}
                        <span><i class="fas fa-clock"></i> ${formatDateTime(activity.timestamp)}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// ================================
// Export Functions
// ================================
async function exportLogs(format) {
    try {
        const dateFrom = document.getElementById('exportDateFrom')?.value || '';
        const dateTo = document.getElementById('exportDateTo')?.value || '';
        
        let url = `${API_BASE}/logs/export?format=${format}`;
        if (dateFrom) url += `&date_from=${dateFrom}`;
        if (dateTo) url += `&date_to=${dateTo}`;
        
        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', '');
        
        // Add auth header via fetch
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        link.href = blobUrl;
        link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        
        showToast('Exported', `Logs exported as ${format.toUpperCase()}`, 'success');
        
    } catch (error) {
        showToast('Error', 'Failed to export logs', 'error');
    }
}

// ================================
// Utility Functions
// ================================
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return 'N/A';
    
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(title, message, type = 'info') {
    const toast = document.getElementById('adminToast');
    const titleEl = document.getElementById('toastTitle');
    const messageEl = document.getElementById('toastMessage');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Update icon color based on type
    const icon = toast.querySelector('.toast-header i');
    icon.className = 'fas fa-bell me-2';
    if (type === 'success') icon.classList.add('text-success');
    else if (type === 'error') icon.classList.add('text-danger');
    else icon.classList.add('text-primary');
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// ================================
// Block/Unblock User Functions
// ================================
function toggleBlockUser(userId, isBlocked, userName) {
    if (isBlocked) {
        unblockUser(userId, userName);
    } else {
        showBlockUserModal(userId, userName);
    }
}

function showBlockUserModal(userId, userName) {
    // Remove existing modal if any
    const existingModal = document.getElementById('blockUserModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'blockUserModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-ban me-2"></i>Block User Account
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        You are about to block <strong>${escapeHtml(userName)}</strong>
                    </div>
                    <p>This will:</p>
                    <ul>
                        <li>Immediately log out the user</li>
                        <li>Prevent them from logging in</li>
                        <li>Show them a blocked notification</li>
                    </ul>
                    <div class="mb-3">
                        <label class="form-label">Reason for blocking (will be shown to user):</label>
                        <textarea class="form-control" id="blockReason" rows="3" 
                                  placeholder="e.g., Suspicious activity detected, unauthorized access attempts...">Suspicious activity detected</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" onclick="confirmBlockUser(${userId})">
                        <i class="fas fa-ban me-2"></i>Block User
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => modal.remove());
}

async function confirmBlockUser(userId) {
    const reason = document.getElementById('blockReason')?.value || 'Suspicious activity detected';
    
    try {
        const response = await apiRequest(`/users/${userId}/block`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
        
        if (response.success) {
            showToast('User Blocked', response.message, 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('blockUserModal'));
            if (modal) modal.hide();
            
            // Reload user lists
            loadOnlineUsers();
            loadOfflineUsers();
            loadActivityFeed();
        } else {
            showToast('Error', response.message, 'error');
        }
    } catch (error) {
        showToast('Error', error.message || 'Failed to block user', 'error');
    }
}

function showUnblockUserModal(userId, userName) {
    // Remove existing modal if any
    const existingModal = document.getElementById('unblockUserModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'unblockUserModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-success text-white py-2">
                    <h5 class="modal-title" style="font-size: 1rem;">
                        <i class="fas fa-unlock me-2"></i>Unblock User Account
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="text-center mb-3">
                        <div class="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 rounded-circle" style="width: 60px; height: 60px;">
                            <i class="fas fa-user-check fa-2x text-success"></i>
                        </div>
                    </div>
                    <div class="alert alert-success py-2">
                        <i class="fas fa-check-circle me-2"></i>
                        You are about to restore access for <strong>${escapeHtml(userName)}</strong>
                    </div>
                    <p style="font-size: 0.9rem;">This will:</p>
                    <ul style="font-size: 0.85rem;">
                        <li>Allow the user to log in again</li>
                        <li>Restore full account access</li>
                        <li>Send notification to the user</li>
                    </ul>
                    <div class="mb-3">
                        <label class="form-label" style="font-size: 0.9rem;">Reason for unblocking:</label>
                        <textarea class="form-control" id="unblockReason" rows="3" style="font-size: 0.9rem;"
                                  placeholder="e.g., Issue resolved, Account verified, Appeal approved...">Account review completed - access restored</textarea>
                    </div>
                </div>
                <div class="modal-footer py-2">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-success" onclick="confirmUnblockUser(${userId})">
                        <i class="fas fa-unlock me-2"></i>Unblock User
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => modal.remove());
}

async function confirmUnblockUser(userId) {
    const reason = document.getElementById('unblockReason')?.value || 'Account restored';
    
    try {
        const response = await apiRequest(`/users/${userId}/unblock`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
        
        if (response.success) {
            showToast('User Unblocked', response.message, 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('unblockUserModal'));
            if (modal) modal.hide();
            
            // Reload user lists
            loadOnlineUsers();
            loadOfflineUsers();
            loadActivityFeed();
        } else {
            showToast('Error', response.message, 'error');
        }
    } catch (error) {
        showToast('Error', error.message || 'Failed to unblock user', 'error');
    }
}

// Keep old function for backwards compatibility but use new modal
async function unblockUser(userId, userName) {
    showUnblockUserModal(userId, userName);
}

async function logout() {
    if (refreshInterval) clearInterval(refreshInterval);
    
    // Call logout API to log the action
    try {
        await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
        console.log('Logout API call failed');
    }
    
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login.html';
}

// Make functions globally available for inline handlers
window.loadAuditLogs = loadAuditLogs;
window.toggleBlockUser = toggleBlockUser;
window.showBlockUserModal = showBlockUserModal;
window.confirmBlockUser = confirmBlockUser;
window.showUnblockUserModal = showUnblockUserModal;
window.confirmUnblockUser = confirmUnblockUser;
window.unblockUser = unblockUser;
