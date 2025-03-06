const express = require('express');
const {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointmentById,
  deleteAppointmentById,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .post(protect, authorize('admin', 'doctor'), createAppointment)
  .get(protect, authorize('admin', 'doctor', 'nurse'), getAllAppointments);

router.route('/:id')
  .get(protect, authorize('admin', 'doctor', 'nurse', 'patient'), getAppointmentById)
  .put(protect, authorize('admin', 'doctor'), updateAppointmentById)
  .delete(protect, authorize('admin', 'doctor'), deleteAppointmentById);

module.exports = router;
