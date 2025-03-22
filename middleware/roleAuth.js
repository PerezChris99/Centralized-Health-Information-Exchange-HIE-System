/**
 * Role-based authorization middleware
 */
const roleAuth = (...allowedRoles) => {
  return (req, res, next) => {
    // Verify user has a role
    if (!req.user || !req.user.role) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied: User role not defined' 
      });
    }
    
    // Check if user's role is among allowed roles
    const hasAllowedRole = allowedRoles.includes(req.user.role);
    
    if (!hasAllowedRole) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied: Insufficient permissions' 
      });
    }
    
    next();
  };
};

module.exports = roleAuth;
