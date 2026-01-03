"""
Patient model for storing patient information
"""
from datetime import datetime
from extensions import db


class Patient(db.Model):
    """Patient model for healthcare records"""
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(10), nullable=False)  # Male, Female, Other
    contact_number = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    address = db.Column(db.Text, nullable=True)
    
    # Physical characteristics
    height = db.Column(db.Float, nullable=True)  # in cm
    weight = db.Column(db.Float, nullable=True)  # in kg
    eye_color = db.Column(db.String(50), nullable=True)
    hair_color = db.Column(db.String(50), nullable=True)
    skin_tone = db.Column(db.String(50), nullable=True)
    
    # Demographics
    nationality = db.Column(db.String(100), nullable=True)
    tribe = db.Column(db.String(100), nullable=True)
    
    # Photo (base64 encoded or URL)
    photo = db.Column(db.Text, nullable=True)
    
    # Allergies
    food_allergies = db.Column(db.JSON, default=list)  # Store as JSON array
    medication_allergies = db.Column(db.JSON, default=list)  # Store as JSON array
    
    medical_history = db.Column(db.JSON, default=list)  # Store as JSON array
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    appointments = db.relationship('Appointment', back_populates='patient', lazy='dynamic', cascade='all, delete-orphan')
    medical_records = db.relationship('MedicalRecord', back_populates='patient', lazy='dynamic', cascade='all, delete-orphan')
    
    @property
    def bmi(self):
        """Calculate BMI from height and weight"""
        if self.height and self.weight and self.height > 0:
            height_m = self.height / 100  # Convert cm to meters
            return round(self.weight / (height_m ** 2), 1)
        return None
    
    @property
    def bmi_category(self):
        """Get BMI category"""
        bmi = self.bmi
        if bmi is None:
            return None
        if bmi < 18.5:
            return 'Underweight'
        elif bmi < 25:
            return 'Normal'
        elif bmi < 30:
            return 'Overweight'
        else:
            return 'Obese'
    
    def to_dict(self):
        """Convert patient to dictionary"""
        return {
            'id': self.id,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'dateOfBirth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'contactNumber': self.contact_number,
            'email': self.email,
            'address': self.address,
            'height': self.height,
            'weight': self.weight,
            'bmi': self.bmi,
            'bmiCategory': self.bmi_category,
            'eyeColor': self.eye_color,
            'hairColor': self.hair_color,
            'skinTone': self.skin_tone,
            'nationality': self.nationality,
            'tribe': self.tribe,
            'photo': self.photo,
            'foodAllergies': self.food_allergies or [],
            'medicationAllergies': self.medication_allergies or [],
            'medicalHistory': self.medical_history or [],
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Patient {self.first_name} {self.last_name}>'
