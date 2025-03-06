const express = require('express');
const {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatientById,
  deletePatientById,
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .post(protect, authorize('admin', 'doctor', 'nurse'), createPatient)
  .get(protect, authorize('admin', 'doctor', 'nurse'), getAllPatients);

router.route('/:id')
  .get(protect, authorize('admin', 'doctor', 'nurse', 'patient'), getPatientById)
  .put(protect, authorize('admin', 'doctor', 'nurse'), updatePatientById)
  .delete(protect, authorize('admin', 'doctor'), deletePatientById);

module.exports = router;
