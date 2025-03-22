const express = require('express');
const router = express.Router();

// Placeholder for Patient data - replace with MongoDB model
let patients = [
  { id: 1, name: "John Doe", age: 45, gender: "Male", contactInfo: "555-123-4567", medicalHistory: "Hypertension" },
  { id: 2, name: "Jane Smith", age: 32, gender: "Female", contactInfo: "555-987-6543", medicalHistory: "Asthma" }
];

// @route   GET api/patients
// @desc    Get all patients
// @access  Private
router.get('/', (req, res) => {
  res.json(patients);
});

// @route   GET api/patients/:id
// @desc    Get patient by ID
// @access  Private
router.get('/:id', (req, res) => {
  const patient = patients.find(p => p.id === parseInt(req.params.id));
  
  if (!patient) {
    return res.status(404).json({ message: 'Patient not found' });
  }
  
  res.json(patient);
});

// @route   POST api/patients
// @desc    Create a patient
// @access  Private
router.post('/', (req, res) => {
  const newPatient = {
    id: patients.length + 1,
    ...req.body
  };
  
  patients.push(newPatient);
  res.status(201).json(newPatient);
});

// @route   PUT api/patients/:id
// @desc    Update patient
// @access  Private
router.put('/:id', (req, res) => {
  const patientIndex = patients.findIndex(p => p.id === parseInt(req.params.id));
  
  if (patientIndex === -1) {
    return res.status(404).json({ message: 'Patient not found' });
  }
  
  patients[patientIndex] = {
    ...patients[patientIndex],
    ...req.body
  };
  
  res.json(patients[patientIndex]);
});

// @route   DELETE api/patients/:id
// @desc    Delete patient
// @access  Private
router.delete('/:id', (req, res) => {
  const patientIndex = patients.findIndex(p => p.id === parseInt(req.params.id));
  
  if (patientIndex === -1) {
    return res.status(404).json({ message: 'Patient not found' });
  }
  
  const deletedPatient = patients[patientIndex];
  patients = patients.filter(p => p.id !== parseInt(req.params.id));
  
  res.json({ message: 'Patient removed', deletedPatient });
});

module.exports = router;
