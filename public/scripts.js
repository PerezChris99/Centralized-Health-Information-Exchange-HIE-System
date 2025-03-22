document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const patientListEl = document.getElementById('patientList');
  const addPatientForm = document.getElementById('addPatientForm');
  const notificationArea = document.getElementById('notification-area');

  // Handle initial patients data
  socket.on('initialPatients', (patients) => {
    renderPatients(patients);
    showNotification('Connected to server', 'success');
  });

  // Handle new patient added
  socket.on('patientAdded', (patient) => {
    addPatientToUI(patient);
    showNotification(`New patient added: ${patient.name}`, 'success');
  });

  // Handle errors from server
  socket.on('error', (error) => {
    showNotification(`Error: ${error.message}`, 'danger');
    console.error('Server error:', error);
  });

  // Add patient form submission
  addPatientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Form validation
    const patientName = document.getElementById('patientName').value.trim();
    const patientAge = document.getElementById('patientAge').value;
    const patientGender = document.getElementById('patientGender').value;
    
    if (!patientName) {
      showNotification('Patient name is required', 'warning');
      return;
    }
    
    if (!patientAge || isNaN(parseInt(patientAge))) {
      showNotification('Valid age is required', 'warning');
      return;
    }
    
    const newPatient = {
      name: patientName,
      age: parseInt(patientAge),
      gender: patientGender,
      contactInfo: document.getElementById('patientContact').value.trim(),
      medicalHistory: document.getElementById('patientHistory').value.trim()
    };
    
    // Show loading notification
    const loadingId = showNotification('Submitting patient data...', 'info');
    
    // Emit event to server
    socket.emit('addPatient', newPatient, (response) => {
      // Remove loading notification
      document.getElementById(loadingId)?.remove();
      
      if (response.error) {
        showNotification(`Error: ${response.error}`, 'danger');
      } else {
        showNotification(`Patient ${newPatient.name} added successfully!`, 'success');
        addPatientForm.reset();
      }
    });
  });

  // Render all patients
  function renderPatients(patients) {
    patientListEl.innerHTML = '';
    patients.forEach(patient => {
      addPatientToUI(patient);
    });
  }

  // Add a single patient to UI
  function addPatientToUI(patient) {
    const patientCard = document.createElement('div');
    patientCard.className = 'col-md-6 patient-card';
    patientCard.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">${patient.name}</h5>
          <p class="card-text">Age: ${patient.age}</p>
          <p class="card-text">Gender: ${patient.gender}</p>
          <p class="card-text">Contact: ${patient.contactInfo}</p>
          <p class="card-text"><small>Medical History: ${patient.medicalHistory || 'None'}</small></p>
        </div>
      </div>
    `;
    patientListEl.appendChild(patientCard);
  }

  // Show notifications
  function showNotification(message, type = 'info') {
    const notificationId = 'notification-' + Date.now();
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    notificationArea.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 150);
    }, 5000);
    
    return notificationId;
  }
});
