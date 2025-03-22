// Main JavaScript file for the Health Information Exchange System frontend

// Global state
const state = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user')),
  socket: null,
  adminSocket: null,
  selectedPatient: null
};

// DOM References
const elements = {
  loginSection: document.getElementById('login-section'),
  dashboard: document.getElementById('dashboard'),
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  userInfo: document.getElementById('user-info'),
  usernameDisplay: document.getElementById('username-display'),
  logoutBtn: document.getElementById('logout-btn'),
  adminTab: document.getElementById('admin-tab'),
  
  // Tables
  patientsTableBody: document.getElementById('patients-table-body'),
  appointmentsTableBody: document.getElementById('appointments-table-body'),
  recordsTableBody: document.getElementById('records-table-body'),
  usersTableBody: document.getElementById('users-table-body'),
  auditLogTableBody: document.getElementById('audit-log-table-body'),
  
  // Statistics elements
  totalPatients: document.getElementById('total-patients'),
  totalRecords: document.getElementById('total-records'),
  totalUsers: document.getElementById('total-users'),
  activeAppointments: document.getElementById('active-appointments'),
  
  // Patient record elements
  recordPatientSearch: document.getElementById('record-patient-search'),
  recordPatientName: document.getElementById('record-patient-name'),
  patientRecordsContainer: document.getElementById('patient-records-container'),
  
  // Filter elements
  appointmentDateFilter: document.getElementById('appointment-date-filter'),
  appointmentStatusFilter: document.getElementById('appointment-status-filter'),
  
  // Buttons
  addPatientBtn: document.getElementById('add-patient-btn'),
  addAppointmentBtn: document.getElementById('add-appointment-btn'),
  addRecordBtn: document.getElementById('add-record-btn'),
  addUserBtn: document.getElementById('add-user-btn'),
  searchPatientBtn: document.getElementById('search-patient-btn'),
  searchRecordPatientBtn: document.getElementById('search-record-patient-btn'),
  filterAppointmentsBtn: document.getElementById('filter-appointments-btn')
};

// API Base URL
const API_URL = window.location.origin + '/api';

// Helper Functions
const api = {
  async request(endpoint, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (state.token) {
      defaultOptions.headers.Authorization = `Bearer ${state.token}`;
    }
    
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    try {
      const response = await fetch(`${API_URL}/${endpoint}`, mergedOptions);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  },
  
  // Authentication API calls
  async login(credentials) {
    return this.request('auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },
  
  async logout() {
    return this.request('auth/logout');
  },
  
  // Patients API calls
  async getPatients() {
    return this.request('patients');
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
  
  async searchPatients(query) {
    return this.request(`patients/search/query?query=${encodeURIComponent(query)}`);
  },
  
  // Medical Records API calls
  async getPatientRecords(patientId) {
    return this.request(`medical-records/patient/${patientId}`);
  },
  
  async createMedicalRecord(recordData) {
    return this.request('medical-records', {
      method: 'POST',
      body: JSON.stringify(recordData)
    });
  },
  
  // Appointments API calls
  async getAppointments(filters = {}) {
    let queryParams = '';
    
    if (Object.keys(filters).length) {
      queryParams = '?' + Object.entries(filters)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
    }
    
    return this.request(`appointments${queryParams}`);
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
  
  async cancelAppointment(id, reason) {
    return this.request(`appointments/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
  }
};

// UI Update Functions
const ui = {
  showLoginError(message) {
    elements.loginError.textContent = message;
    elements.loginError.style.display = 'block';
  },
  
  hideLoginError() {
    elements.loginError.style.display = 'none';
  },
  
  showDashboard() {
    elements.loginSection.style.display = 'none';
    elements.dashboard.style.display = 'block';
    elements.userInfo.style.display = 'block';
    elements.usernameDisplay.textContent = `${state.user.firstName || ''} ${state.user.lastName || ''} (${state.user.role})`;
    
    // Show admin tab only for admin users
    if (state.user.role === 'admin') {
      elements.adminTab.style.display = 'block';
    }
    
    // Load initial data
    this.loadPatients();
    this.loadAppointments();
  },
  
  showLoginForm() {
    elements.dashboard.style.display = 'none';
    elements.userInfo.style.display = 'none';
    elements.loginSection.style.display = 'block';
  },
  
  async loadPatients() {
    try {
      elements.patientsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading patients...</td></tr>';
      
      const response = await api.getPatients();
      const patients = response.data;
      
      if (patients.length === 0) {
        elements.patientsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No patients found</td></tr>';
        return;
      }
      
      elements.patientsTableBody.innerHTML = patients.map(patient => `
        <tr>
          <td>${patient.name}</td>
          <td>${patient.age}</td>
          <td>${patient.gender}</td>
          <td>${patient.medicalHistory ? patient.medicalHistory.join(', ') : 'None'}</td>
          <td>
            <button class="btn btn-sm btn-info view-patient" data-id="${patient._id}">View</button>
            <button class="btn btn-sm btn-primary edit-patient" data-id="${patient._id}">Edit</button>
            ${state.user.role === 'admin' ? `<button class="btn btn-sm btn-danger delete-patient" data-id="${patient._id}">Delete</button>` : ''}
          </td>
        </tr>
      `).join('');
      
    } catch (error) {
      elements.patientsTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
  },
  
  async loadAppointments() {
    try {
      const filters = {};
      
      if (elements.appointmentDateFilter.value) {
        filters.date = elements.appointmentDateFilter.value;
      }
      
      if (elements.appointmentStatusFilter.value) {
        filters.status = elements.appointmentStatusFilter.value;
      }
      
      elements.appointmentsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading appointments...</td></tr>';
      
      const response = await api.getAppointments(filters);
      const appointments = response.data;
      
      if (appointments.length === 0) {
        elements.appointmentsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No appointments found</td></tr>';
        return;
      }
      
      elements.appointmentsTableBody.innerHTML = appointments.map(appointment => {
        const date = new Date(appointment.appointmentDate);
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(date);
        
        return `
          <tr>
            <td>${appointment.patient.name}</td>
            <td>${appointment.provider.firstName} ${appointment.provider.lastName}</td>
            <td>${formattedDate}</td>
            <td>${appointment.appointmentType}</td>
            <td><span class="badge bg-${this.getStatusBadgeColor(appointment.status)}">${appointment.status}</span></td>
            <td>
              <button class="btn btn-sm btn-info view-appointment" data-id="${appointment._id}">View</button>
              ${appointment.status === 'scheduled' ? `<button class="btn btn-sm btn-warning cancel-appointment" data-id="${appointment._id}">Cancel</button>` : ''}
            </td>
          </tr>
        `;
      }).join('');
      
    } catch (error) {
      elements.appointmentsTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
  },
  
  async loadPatientRecords(patientId) {
    try {
      elements.recordsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading records...</td></tr>';
      
      const response = await api.getPatientRecords(patientId);
      const records = response.data;
      
      if (records.length === 0) {
        elements.recordsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No medical records found</td></tr>';
        return;
      }
      
      elements.recordsTableBody.innerHTML = records.map(record => {
        const date = new Date(record.visitDate);
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium'
        }).format(date);
        
        const diagnoses = record.diagnosis.map(d => d.description).join(', ');
        
        return `
          <tr>
            <td>${formattedDate}</td>
            <td>${record.provider.firstName} ${record.provider.lastName}</td>
            <td>${diagnoses || 'No diagnosis'}</td>
            <td>
              <button class="btn btn-sm btn-info view-record" data-id="${record._id}">View</button>
              ${record.provider._id === state.user.id ? `<button class="btn btn-sm btn-primary edit-record" data-id="${record._id}">Edit</button>` : ''}
            </td>
          </tr>
        `;
      }).join('');
      
    } catch (error) {
      elements.recordsTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
  },
  
  getStatusBadgeColor(status) {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'confirmed': return 'success';
      case 'completed': return 'info';
      case 'cancelled': return 'danger';
      case 'no-show': return 'warning';
      default: return 'secondary';
    }
  }
};

// Socket Connection
const connectSockets = () => {
  // Connect to main notification socket
  state.socket = io(`${window.location.origin}/notifications`, {
    auth: {
      token: state.token
    }
  });
  
  state.socket.on('connect', () => {
    console.log('Connected to notification service');
    
    // Subscribe to appointments
    state.socket.emit('subscribeToAppointments');
  });
  
  state.socket.on('patientUpdated', (patient) => {
    console.log('Patient updated:', patient);
    // Refresh patients list if viewing that tab
    ui.loadPatients();
  });
  
  state.socket.on('appointmentUpdated', (appointment) => {
    console.log('Appointment updated:', appointment);
    // Refresh appointments list if viewing that tab
    ui.loadAppointments();
  });
  
  state.socket.on('newMedicalRecord', (record) => {
    console.log('New medical record:', record);
    // Refresh records if viewing the patient
    if (state.selectedPatient && state.selectedPatient._id === record.patient._id) {
      ui.loadPatientRecords(record.patient._id);
    }
  });
  
  state.socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
  
  // Connect admin socket if user is admin
  if (state.user && state.user.role === 'admin') {
    state.adminSocket = io(`${window.location.origin}/admin`, {
      auth: {
        token: state.token
      }
    });
    
    state.adminSocket.on('connect', () => {
      console.log('Connected to admin service');
    });
    
    state.adminSocket.on('systemStats', (stats) => {
      // Update admin dashboard with system statistics
      elements.totalPatients.textContent = stats.patients;
      elements.totalRecords.textContent = stats.records;
      elements.totalUsers.textContent = stats.users;
      elements.activeAppointments.textContent = stats.appointments.scheduled;
    });
  }
};

// Event Handlers
const attachEventListeners = () => {
  // Login form submission
  elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.hideLoginError();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
      const response = await api.login({ username, password });
      
      // Store token and user info
      state.token = response.token;
      state.user = response.user;
      
      localStorage.setItem('token', state.token);
      localStorage.setItem('user', JSON.stringify(state.user));
      
      // Show dashboard
      ui.showDashboard();
      
      // Connect to socket
      connectSockets();
      
    } catch (error) {
      ui.showLoginError(error.message || 'Invalid username or password');
    }
  });
  
  // Logout button
  elements.logoutBtn.addEventListener('click', async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear stored data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.token = null;
      state.user = null;
      
      // Disconnect sockets
      if (state.socket) {
        state.socket.disconnect();
      }
      
      if (state.adminSocket) {
        state.adminSocket.disconnect();
      }
      
      // Show login form
      ui.showLoginForm();
    }
  });
  
  // Filter appointments button
  elements.filterAppointmentsBtn.addEventListener('click', () => {
    ui.loadAppointments();
  });
  
  // Search patients
  elements.searchPatientBtn.addEventListener('click', async () => {
    const query = document.getElementById('patient-search').value.trim();
    
    if (!query) {
      ui.loadPatients();
      return;
    }
    
    try {
      elements.patientsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Searching...</td></tr>';
      
      const response = await api.searchPatients(query);
      const patients = response.data;
      
      if (patients.length === 0) {
        elements.patientsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No patients found matching your search</td></tr>';
        return;
      }
      
      elements.patientsTableBody.innerHTML = patients.map(patient => `
        <tr>
          <td>${patient.name}</td>
          <td>${patient.age}</td>
          <td>${patient.gender}</td>
          <td>${patient.medicalHistory ? patient.medicalHistory.join(', ') : 'None'}</td>
          <td>
            <button class="btn btn-sm btn-info view-patient" data-id="${patient._id}">View</button>
            <button class="btn btn-sm btn-primary edit-patient" data-id="${patient._id}">Edit</button>
            ${state.user.role === 'admin' ? `<button class="btn btn-sm btn-danger delete-patient" data-id="${patient._id}">Delete</button>` : ''}
          </td>
        </tr>
      `).join('');
    } catch (error) {
      elements.patientsTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
  });
  
  // Search for patient records
  elements.searchRecordPatientBtn.addEventListener('click', async () => {
    const query = elements.recordPatientSearch.value.trim();
    
    if (!query) {
      return;
    }
    
    try {
      const response = await api.searchPatients(query);
      const patients = response.data;
      
      if (patients.length === 0) {
        alert('No patients found matching your search');
        return;
      }
      
      // If only one patient is found, select it automatically
      if (patients.length === 1) {
        selectPatientForRecords(patients[0]);
      } else {
        // Show patient selection dialog
        // This would be implemented with a modal in a real application
        const patientIndex = prompt(
          `Multiple patients found. Enter the number of the patient you want to view:\n\n${patients
            .map((p, i) => `${i + 1}. ${p.name} (${p.age}, ${p.gender})`)
            .join('\n')}`
        );
        
        if (patientIndex && !isNaN(patientIndex) && patients[parseInt(patientIndex) - 1]) {
          selectPatientForRecords(patients[parseInt(patientIndex) - 1]);
        }
      }
    } catch (error) {
      alert('Error searching for patients: ' + error.message);
    }
  });
  
  // Delegate event handlers for dynamically created elements
  document.addEventListener('click', async (e) => {
    // View patient details
    if (e.target.classList.contains('view-patient')) {
      const patientId = e.target.getAttribute('data-id');
      // Implementation would show a modal with patient details
      alert('View patient details functionality would be implemented here');
    }
    
    // Edit patient
    if (e.target.classList.contains('edit-patient')) {
      const patientId = e.target.getAttribute('data-id');
      // Implementation would show a form to edit patient
      alert('Edit patient functionality would be implemented here');
    }
    
    // Delete patient
    if (e.target.classList.contains('delete-patient')) {
      const patientId = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
        // Implementation would delete the patient
        alert('Delete patient functionality would be implemented here');
      }
    }
    
    // View appointment details
    if (e.target.classList.contains('view-appointment')) {
      const appointmentId = e.target.getAttribute('data-id');
      // Implementation would show a modal with appointment details
      alert('View appointment details functionality would be implemented here');
    }
    
    // Cancel appointment
    if (e.target.classList.contains('cancel-appointment')) {
      const appointmentId = e.target.getAttribute('data-id');
      const reason = prompt('Please enter a reason for cancellation:');
      
      if (reason) {
        try {
          await api.cancelAppointment(appointmentId, reason);
          ui.loadAppointments();
        } catch (error) {
          alert('Error cancelling appointment: ' + error.message);
        }
      }
    }
    
    // View medical record
    if (e.target.classList.contains('view-record')) {
      const recordId = e.target.getAttribute('data-id');
      // Implementation would show a modal with record details
      alert('View medical record functionality would be implemented here');
    }
    
    // Edit medical record
    if (e.target.classList.contains('edit-record')) {
      const recordId = e.target.getAttribute('data-id');
      // Implementation would show a form to edit record
      alert('Edit medical record functionality would be implemented here');
    }
  });
};

// Helper function to select a patient for viewing records
function selectPatientForRecords(patient) {
  state.selectedPatient = patient;
  elements.recordPatientName.textContent = `${patient.name} (${patient.age}, ${patient.gender})`;
  elements.patientRecordsContainer.style.display = 'block';
  
  // Load the patient's medical records
  ui.loadPatientRecords(patient._id);
  
  // Subscribe to patient updates
  if (state.socket) {
    state.socket.emit('subscribeToPatient', patient._id);
  }
}

// Initialize app
function init() {
  // Check if user is logged in
  if (state.token && state.user) {
    // Show dashboard
    ui.showDashboard();
    
    // Connect to socket
    connectSockets();
  } else {
    ui.showLoginForm();
  }
  
  // Set today's date as default for appointment filter
  const today = new Date().toISOString().split('T')[0];
  elements.appointmentDateFilter.value = today;
  
  // Attach event listeners
  attachEventListeners();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
