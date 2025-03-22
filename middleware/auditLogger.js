const AuditLog = require('../models/AuditLog');

/**
 * Middleware to log actions for audit trail
 * @param {string} action - The action being performed (create, read, update, delete)
 * @param {string} resourceType - The type of resource being accessed
 */
const auditLogger = (action, resourceType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    try {
      // Process the request first
      next();
      
      // Override res.send to capture the response
      res.send = function(data) {
        // Only log successful operations (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let resourceId;
          
          // Determine resourceId based on the request
          if (action === 'create') {
            try {
              const parsedData = JSON.parse(data);
              resourceId = parsedData.data._id || parsedData._id;
            } catch (e) {
              resourceId = null;
            }
          } else {
            resourceId = req.params.id || (req.body && req.body._id);
          }
          
          // Create audit log entry
          const logEntry = new AuditLog({
            user: req.user.id,
            action,
            resourceType,
            resourceId: resourceId || req.params.id || '000000000000000000000000',
            details: `${req.method} ${req.originalUrl}`,
            ipAddress: req.ip
          });
          
          // Save log entry (don't await to avoid blocking)
          logEntry.save().catch(err => {
            console.error('Error saving audit log:', err);
          });
        }
        
        // Continue with the original response
        originalSend.call(this, data);
      };
    } catch (error) {
      next(error);
    }
  };
};

module.exports = auditLogger;
