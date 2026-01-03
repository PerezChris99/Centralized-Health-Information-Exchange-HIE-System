"""
Appointment model for scheduling patient-doctor meetings
"""
from datetime import datetime
from extensions import db


class Appointment(db.Model):
    """Appointment model linking patients with healthcare providers"""
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='scheduled')  # scheduled, completed, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = db.relationship('Patient', back_populates='appointments')
    doctor = db.relationship('User', back_populates='appointments', foreign_keys=[doctor_id])
    
    def to_dict(self):
        """Convert appointment to dictionary"""
        return {
            'id': self.id,
            'patient': self.patient.to_dict() if self.patient else None,
            'doctor': self.doctor.to_dict(include_email=False) if self.doctor else None,
            'date': self.date.isoformat() if self.date else None,
            'reason': self.reason,
            'status': self.status,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Appointment {self.id} - Patient {self.patient_id}>'
