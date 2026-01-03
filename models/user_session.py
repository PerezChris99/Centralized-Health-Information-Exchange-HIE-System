"""
User Session model for tracking detailed user activity
"""
from datetime import datetime
from extensions import db


class UserSession(db.Model):
    """User Session model for tracking login sessions and activities"""
    __tablename__ = 'user_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_token = db.Column(db.String(256), nullable=True)  # JWT token hash (for invalidation)
    
    # Session timing
    login_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    logout_time = db.Column(db.DateTime, nullable=True)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Session metadata
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 compatible
    user_agent = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('sessions', lazy='dynamic'))
    
    @property
    def duration_seconds(self):
        """Calculate session duration in seconds"""
        end_time = self.logout_time or datetime.utcnow()
        return int((end_time - self.login_time).total_seconds())
    
    @property
    def duration_formatted(self):
        """Get formatted duration string"""
        seconds = self.duration_seconds
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m {secs}s"
        elif minutes > 0:
            return f"{minutes}m {secs}s"
        else:
            return f"{secs}s"
    
    def to_dict(self):
        """Convert session to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'userName': self.user.name if self.user else None,
            'userEmail': self.user.email if self.user else None,
            'userRole': self.user.role if self.user else None,
            'loginTime': self.login_time.isoformat() if self.login_time else None,
            'logoutTime': self.logout_time.isoformat() if self.logout_time else None,
            'lastActivity': self.last_activity.isoformat() if self.last_activity else None,
            'duration': self.duration_formatted,
            'durationSeconds': self.duration_seconds,
            'ipAddress': self.ip_address,
            'userAgent': self.user_agent,
            'isActive': self.is_active
        }
    
    @classmethod
    def create_session(cls, user_id, ip_address=None, user_agent=None, session_token=None):
        """Create a new session for a user"""
        session = cls(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            session_token=session_token,
            is_active=True
        )
        db.session.add(session)
        db.session.commit()
        return session
    
    def end_session(self):
        """End this session"""
        self.logout_time = datetime.utcnow()
        self.is_active = False
        db.session.commit()
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()
        db.session.commit()
    
    def __repr__(self):
        return f'<UserSession {self.id} User:{self.user_id} Active:{self.is_active}>'
