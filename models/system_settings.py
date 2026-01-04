"""
System Settings model for global configuration
"""
from datetime import datetime
from extensions import db


class SystemSettings(db.Model):
    """Global system settings"""
    __tablename__ = 'system_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value = db.Column(db.String(500), nullable=True)
    description = db.Column(db.String(500), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    @classmethod
    def get(cls, key, default=None):
        """Get a setting value by key"""
        setting = cls.query.filter_by(key=key).first()
        return setting.value if setting else default
    
    @classmethod
    def set(cls, key, value, description=None, updated_by=None):
        """Set a setting value"""
        setting = cls.query.filter_by(key=key).first()
        if setting:
            setting.value = value
            setting.updated_at = datetime.utcnow()
            if updated_by:
                setting.updated_by = updated_by
        else:
            setting = cls(key=key, value=value, description=description, updated_by=updated_by)
            db.session.add(setting)
        db.session.commit()
        return setting
    
    @classmethod
    def get_timezone(cls):
        """Get the system timezone setting"""
        return cls.get('system_timezone', 'Africa/Kampala')
    
    @classmethod
    def set_timezone(cls, timezone, updated_by=None):
        """Set the system timezone"""
        return cls.set('system_timezone', timezone, 'System-wide timezone setting', updated_by)
    
    @classmethod
    def get_all_settings(cls):
        """Get all settings as a dictionary"""
        settings = cls.query.all()
        return {s.key: {'value': s.value, 'description': s.description, 'updated_at': s.updated_at.isoformat() + 'Z' if s.updated_at else None} for s in settings}
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'description': self.description,
            'updated_at': (self.updated_at.isoformat() + 'Z') if self.updated_at else None
        }
