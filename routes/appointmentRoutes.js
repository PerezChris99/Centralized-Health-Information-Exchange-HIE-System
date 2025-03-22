const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const auditLogger = require('../middleware/auditLogger');

// All routes require authentication
router.use(auth);

// Get all appointments - accessible by all authenticated users with filtering
router.get('/', 
  auditLogger('read', 'appointment'),
  appointmentController.getAllAppointments
);

// Get appointment by ID - accessible by all authenticated users
router.get('/:id', 
  auditLogger('read', 'appointment'),
  appointmentController.getAppointmentById
);

// Create new appointment - accessible by admin, doctor, nurse, staff
router.post('/', 
  roleAuth('admin', 'doctor', 'nurse', 'staff'),
  auditLogger('create', 'appointment'),
  appointmentController.createAppointment
);

// Update appointment - accessible by admin, doctor, nurse, staff
router.put('/:id', 
  roleAuth('admin', 'doctor', 'nurse', 'staff'),
  auditLogger('update', 'appointment'),
  appointmentController.updateAppointment
);

// Cancel appointment - accessible by admin, doctor, nurse, staff
router.put('/:id/cancel', 
  roleAuth('admin', 'doctor', 'nurse', 'staff'),
  auditLogger('update', 'appointment'),
  appointmentController.cancelAppointment
);

// Get provider schedule - accessible by admin, doctor, nurse
router.get('/provider/:providerId?', 
  roleAuth('admin', 'doctor', 'nurse'),
  auditLogger('read', 'appointment'),
  appointmentController.getProviderSchedule
);

module.exports = router;
