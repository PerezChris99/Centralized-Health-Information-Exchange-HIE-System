"""
Routes package initialization
"""
from routes.auth_routes import auth_bp
from routes.patient_routes import patient_bp
from routes.appointment_routes import appointment_bp
from routes.medical_record_routes import medical_record_bp
from routes.user_routes import user_bp

__all__ = ['auth_bp', 'patient_bp', 'appointment_bp', 'medical_record_bp', 'user_bp']
