document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    socket.on('patientCreated', (patient) => {
        // Update the patient table with the new patient data
    });

    socket.on('patientUpdated', (patient) => {
        // Update the patient table with the updated patient data
    });

    // Function to add a new patient
    const addPatientForm = document.getElementById('addPatientForm');
    addPatientForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(addPatientForm);
        const patientData = Object.fromEntries(formData.entries());

        fetch('/api/patients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(patientData),
            })
            .then(response => response.json())
            .then(data => {
                // Handle the response data
            })
            .catch(error => {
                console.error('Error:', error);
            });
    });
});