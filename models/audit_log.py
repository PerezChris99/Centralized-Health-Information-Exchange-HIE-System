"""
Audit Log model for tracking all system actions
"""
from datetime import datetime
from extensions import db


class AuditLog(db.Model):
    """Audit Log model for compliance tracking"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(20), nullable=False)  # create, read, update, delete, login, logout, export
    resource_type = db.Column(db.String(50), nullable=False)  # patient, medicalRecord, appointment, user
    resource_id = db.Column(db.Integer, nullable=False)
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 compatible
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='audit_logs')
    
    def to_dict(self):
        """Convert audit log to dictionary"""
        return {
            'id': self.id,
            'user': self.user.to_dict(include_email=False) if self.user else None,
            'action': self.action,
            'resourceType': self.resource_type,
            'resourceId': self.resource_id,
            'details': self.details,
            'ipAddress': self.ip_address,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
    
    @classmethod
    def log_action(cls, user_id, action, resource_type, resource_id, details=None, ip_address=None):
        """Create an audit log entry"""
        log = cls(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address
        )
        db.session.add(log)
        db.session.commit()
        return log
    
    def __repr__(self):
        return f'<AuditLog {self.action} on {self.resource_type} {self.resource_id}>'
