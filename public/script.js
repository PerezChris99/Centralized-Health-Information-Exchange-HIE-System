document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const patientTable = document.getElementById('patientTable').getElementsByTagName('tbody')[0];
  const addPatientForm = document.getElementById('addPatientForm');
  
  // Handle initial patient data
  socket.on('initialPatients', (patients) => {
    patients.forEach(patient => {
      addPatientToTable(patient);
    });
  });
  
  // Handle newly added patients
  socket.on('patientAdded', (patient) => {
    addPatientToTable(patient);
  });
  
  // Handle form submission
  addPatientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const patient = {
      name: e.target.name.value,
      age: parseInt(e.target.age.value),
      gender: e.target.gender.value,
      contactInfo: e.target.contactInfo.value,
      medicalHistory: e.target.medicalHistory.value
    };
    
    socket.emit('addPatient', patient);
    addPatientForm.reset();
  });
  
  // Function to add a patient to the table
  function addPatientToTable(patient) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${patient.name}</td>
      <td>${patient.age}</td>
      <td>${patient.gender}</td>
      <td>${patient.contactInfo}</td>
      <td>${patient.medicalHistory}</td>
    `;
    
    patientTable.appendChild(row);
  }
});