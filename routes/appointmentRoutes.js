const express = require('express');
const router = express.Router();

// Placeholder for Appointment data - replace with MongoDB model
let appointments = [
  { 
    id: 1, 
    patientId: 1, 
    doctorId: 1, 
    date: "2023-12-15T10:00:00Z", 
    status: "scheduled", 
    notes: "Regular checkup" 
  },
  { 
    id: 2, 
    patientId: 2, 
    doctorId: 2, 
    date: "2023-12-16T14:30:00Z", 
    status: "scheduled", 
    notes: "Follow-up appointment" 
  }
];

// @route   GET api/appointments
// @desc    Get all appointments
// @access  Private
router.get('/', (req, res) => {
  res.json(appointments);
});

// @route   GET api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', (req, res) => {
  const appointment = appointments.find(a => a.id === parseInt(req.params.id));
  
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }
  
  res.json(appointment);
});

// @route   POST api/appointments
// @desc    Create an appointment
// @access  Private
router.post('/', (req, res) => {
  const newAppointment = {
    id: appointments.length + 1,
    ...req.body
  };
  
  appointments.push(newAppointment);
  res.status(201).json(newAppointment);
});

// @route   PUT api/appointments/:id
// @desc    Update appointment
// @access  Private
router.put('/:id', (req, res) => {
  const appointmentIndex = appointments.findIndex(a => a.id === parseInt(req.params.id));
  
  if (appointmentIndex === -1) {
    return res.status(404).json({ message: 'Appointment not found' });
  }
  
  appointments[appointmentIndex] = {
    ...appointments[appointmentIndex],
    ...req.body
  };
  
  res.json(appointments[appointmentIndex]);
});

// @route   DELETE api/appointments/:id
// @desc    Delete appointment
// @access  Private
router.delete('/:id', (req, res) => {
  const appointmentIndex = appointments.findIndex(a => a.id === parseInt(req.params.id));
  
  if (appointmentIndex === -1) {
    return res.status(404).json({ message: 'Appointment not found' });
  }
  
  const deletedAppointment = appointments[appointmentIndex];
  appointments = appointments.filter(a => a.id !== parseInt(req.params.id));
  
  res.json({ message: 'Appointment removed', deletedAppointment });
});

module.exports = router;
