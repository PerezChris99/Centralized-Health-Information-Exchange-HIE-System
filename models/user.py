"""
User model for authentication and authorization
"""
from datetime import datetime
import hashlib
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


class User(db.Model):
    """User model for healthcare providers and staff"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='user')  # user, provider, admin
    reset_password_token = db.Column(db.String(256), nullable=True)
    reset_password_expire = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Session tracking fields
    is_online = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.DateTime, nullable=True)
    last_logout = db.Column(db.DateTime, nullable=True)
    last_activity = db.Column(db.DateTime, nullable=True)
    session_duration = db.Column(db.Integer, default=0)  # Total session duration in seconds
    login_count = db.Column(db.Integer, default=0)
    
    # Account status
    is_blocked = db.Column(db.Boolean, default=False)
    blocked_reason = db.Column(db.String(500), nullable=True)
    blocked_at = db.Column(db.DateTime, nullable=True)
    blocked_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    blocked_by_name = db.Column(db.String(255), nullable=True)  # Store blocker's name
    
    # Unblock tracking (for login notification)
    was_unblocked = db.Column(db.Boolean, default=False)  # Flag to show unblock notification on next login
    unblocked_at = db.Column(db.DateTime, nullable=True)
    unblock_reason = db.Column(db.String(500), nullable=True)  # Resolution reason
    unblocked_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    unblocked_by_name = db.Column(db.String(255), nullable=True)  # Store unblocker's name
    original_block_reason = db.Column(db.String(500), nullable=True)  # Original reason for blocking
    original_blocked_at = db.Column(db.DateTime, nullable=True)  # When they were originally blocked
    
    # Relationships
    appointments = db.relationship('Appointment', back_populates='doctor', lazy='dynamic', foreign_keys='Appointment.doctor_id')
    medical_records = db.relationship('MedicalRecord', back_populates='provider', lazy='dynamic')
    audit_logs = db.relationship('AuditLog', back_populates='user', lazy='dynamic')
    
    def set_password(self, password):
        """Hash and set the password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if the provided password matches the hash"""
        return check_password_hash(self.password_hash, password)
    
    def get_reset_password_token(self):
        """Generate a password reset token"""
        token = secrets.token_hex(20)
        self.reset_password_token = hashlib.sha256(token.encode()).hexdigest()
        self.reset_password_expire = datetime.utcnow() + timedelta(minutes=10)
        return token
    
    def to_dict(self, include_email=True, include_activity=False):
        """Convert user to dictionary"""
        data = {
            'id': self.id,
            'name': self.name,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_blocked': self.is_blocked or False,
            'blocked_reason': self.blocked_reason
        }
        if include_email:
            data['email'] = self.email
        if include_activity:
            data['is_online'] = self.is_online
            data['last_login'] = (self.last_login.isoformat() + 'Z') if self.last_login else None
            data['last_logout'] = (self.last_logout.isoformat() + 'Z') if self.last_logout else None
            data['last_activity'] = (self.last_activity.isoformat() + 'Z') if self.last_activity else None
            data['session_duration'] = self.session_duration
            data['login_count'] = self.login_count
            data['blocked_at'] = (self.blocked_at.isoformat() + 'Z') if self.blocked_at else None
        return data
    
    def record_login(self):
        """Record user login"""
        self.is_online = True
        self.last_login = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        self.login_count = (self.login_count or 0) + 1
        db.session.commit()
    
    def record_logout(self):
        """Record user logout"""
        self.is_online = False
        self.last_logout = datetime.utcnow()
        if self.last_login:
            duration = (self.last_logout - self.last_login).total_seconds()
            self.session_duration = (self.session_duration or 0) + int(duration)
        db.session.commit()
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()
        db.session.commit()
    
    def __repr__(self):
        return f'<User {self.email}>'


# Import timedelta here to avoid circular import
from datetime import timedelta
