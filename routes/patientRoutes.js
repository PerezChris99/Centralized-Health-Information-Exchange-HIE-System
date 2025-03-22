const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

// Patient routes
router.post('/', patientController.createPatient);
router.get('/', patientController.getAllPatients);
router.get('/test', patientController.getSomething);
router.get('/:id', patientController.getPatientById);
router.put('/:id', patientController.updatePatientById);
router.delete('/:id', patientController.deletePatientById);

module.exports = router;
