const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const auditLogger = require('../middleware/auditLogger');

// All routes require authentication
router.use(auth);

// Get all users - admin only
router.get('/', 
  roleAuth('admin'),
  auditLogger('read', 'user'),
  userController.getAllUsers
);

// Get user by ID - admin can access any user, others can only access themselves
router.get('/:id', 
  auditLogger('read', 'user'),
  (req, res, next) => {
    // Allow users to access their own data
    if (req.user.role !== 'admin' && req.params.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this user'
      });
    }
    next();
  },
  userController.getUserById
);

// Update user - admin can update any user, others can only update themselves
router.put('/:id', 
  auditLogger('update', 'user'),
  (req, res, next) => {
    // Allow users to update their own data
    if (req.user.role !== 'admin' && req.params.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }
    next();
  },
  userController.updateUser
);

// Delete user - admin only
router.delete('/:id', 
  roleAuth('admin'),
  auditLogger('delete', 'user'),
  userController.deleteUser
);

// Get user's audit logs - admin only
router.get('/:id/audit-logs', 
  roleAuth('admin'),
  auditLogger('read', 'user'),
  userController.getUserAuditLogs
);

module.exports = router;
