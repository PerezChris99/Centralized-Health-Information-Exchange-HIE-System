"""
Medical Record model for storing detailed health records
"""
from datetime import datetime
from extensions import db


class MedicalRecord(db.Model):
    """Medical Record model for patient health information"""
    __tablename__ = 'medical_records'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    visit_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Stored as JSON for flexibility
    diagnosis = db.Column(db.JSON, default=list)  # [{code, description}]
    medications = db.Column(db.JSON, default=list)  # [{name, dosage, frequency, startDate, endDate}]
    vital_signs = db.Column(db.JSON, default=dict)  # {bloodPressure, heartRate, temperature, etc.}
    notes = db.Column(db.Text, nullable=True)
    lab_results = db.Column(db.JSON, default=list)  # [{test, result, date, normalRange, interpretation}]
    attachments = db.Column(db.JSON, default=list)  # [{filename, fileType, fileUrl, uploadDate}]
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    patient = db.relationship('Patient', back_populates='medical_records')
    provider = db.relationship('User', back_populates='medical_records')
    
    def to_dict(self):
        """Convert medical record to dictionary"""
        return {
            'id': self.id,
            'patient': self.patient.to_dict() if self.patient else None,
            'provider': self.provider.to_dict(include_email=False) if self.provider else None,
            'visitDate': self.visit_date.isoformat() if self.visit_date else None,
            'diagnosis': self.diagnosis or [],
            'medications': self.medications or [],
            'vitalSigns': self.vital_signs or {},
            'notes': self.notes,
            'labResults': self.lab_results or [],
            'attachments': self.attachments or [],
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<MedicalRecord {self.id} - Patient {self.patient_id}>'
