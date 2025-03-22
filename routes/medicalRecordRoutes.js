const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecordController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// All routes are protected
router.use(auth);

// Get all medical records (admin, doctor)
router.get('/', 
  roleAuth('admin', 'doctor'), 
  medicalRecordController.getAllMedicalRecords
);

// Get medical records for a specific patient (admin, doctor, nurse)
router.get('/patient/:patientId', 
  roleAuth('admin', 'doctor', 'nurse'), 
  medicalRecordController.getPatientMedicalRecords
);

// Get specific medical record by ID
router.get('/:id', 
  roleAuth('admin', 'doctor', 'nurse'), 
  medicalRecordController.getMedicalRecordById
);

// Create new medical record (doctor, nurse)
router.post('/', 
  roleAuth('doctor', 'nurse'), 
  medicalRecordController.createMedicalRecord
);

// Update medical record (doctor)
router.put('/:id', 
  roleAuth('doctor'), 
  medicalRecordController.updateMedicalRecord
);

// Delete medical record (admin, doctor)
router.delete('/:id', 
  roleAuth('admin', 'doctor'), 
  medicalRecordController.deleteMedicalRecord
);

module.exports = router;
