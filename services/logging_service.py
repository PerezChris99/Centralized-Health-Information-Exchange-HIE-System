"""
Logging Service - Handles both database audit logs and plain text file logs
"""
import os
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler

# Create logs directory if it doesn't exist
LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

# Configure file loggers
def setup_logger(name, log_file, level=logging.INFO):
    """Setup a logger with file handler"""
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    handler = RotatingFileHandler(
        os.path.join(LOGS_DIR, log_file),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    handler.setFormatter(formatter)
    
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.addHandler(handler)
    
    return logger

# Create specialized loggers
auth_logger = setup_logger('auth', 'auth.log')
patient_logger = setup_logger('patient', 'patient.log')
appointment_logger = setup_logger('appointment', 'appointment.log')
medical_record_logger = setup_logger('medical_record', 'medical_records.log')
system_logger = setup_logger('system', 'system.log')
security_logger = setup_logger('security', 'security.log')


class ActivityLogger:
    """Centralized activity logging for the HIE system"""
    
    @staticmethod
    def log_auth(action, user_email, user_id=None, ip_address=None, details=None, success=True):
        """Log authentication events"""
        status = "SUCCESS" if success else "FAILED"
        message = f"{status} | {action.upper()} | User: {user_email}"
        if user_id:
            message += f" | ID: {user_id}"
        if ip_address:
            message += f" | IP: {ip_address}"
        if details:
            message += f" | {details}"
        
        if success:
            auth_logger.info(message)
        else:
            auth_logger.warning(message)
            security_logger.warning(message)
    
    @staticmethod
    def log_patient(action, patient_name, patient_id, user_id, user_name=None, ip_address=None, details=None):
        """Log patient-related events"""
        message = f"{action.upper()} | Patient: {patient_name} (ID: {patient_id}) | By User ID: {user_id}"
        if user_name:
            message += f" ({user_name})"
        if ip_address:
            message += f" | IP: {ip_address}"
        if details:
            message += f" | {details}"
        
        patient_logger.info(message)
    
    @staticmethod
    def log_appointment(action, patient_name, doctor_name, appointment_id, user_id, 
                        appointment_date=None, ip_address=None, details=None):
        """Log appointment-related events"""
        message = f"{action.upper()} | Appointment ID: {appointment_id}"
        message += f" | Patient: {patient_name} | Doctor: {doctor_name}"
        if appointment_date:
            message += f" | Date: {appointment_date}"
        message += f" | By User ID: {user_id}"
        if ip_address:
            message += f" | IP: {ip_address}"
        if details:
            message += f" | {details}"
        
        appointment_logger.info(message)
    
    @staticmethod
    def log_medical_record(action, patient_name, record_id, user_id, 
                           provider_name=None, ip_address=None, details=None):
        """Log medical record events"""
        message = f"{action.upper()} | Record ID: {record_id} | Patient: {patient_name}"
        if provider_name:
            message += f" | Provider: {provider_name}"
        message += f" | By User ID: {user_id}"
        if ip_address:
            message += f" | IP: {ip_address}"
        if details:
            message += f" | {details}"
        
        medical_record_logger.info(message)
    
    @staticmethod
    def log_system(action, details=None, level='info'):
        """Log system events"""
        message = f"{action.upper()}"
        if details:
            message += f" | {details}"
        
        if level == 'error':
            system_logger.error(message)
        elif level == 'warning':
            system_logger.warning(message)
        else:
            system_logger.info(message)
    
    @staticmethod
    def log_security(event, user_id=None, user_email=None, ip_address=None, details=None):
        """Log security events"""
        message = f"SECURITY | {event.upper()}"
        if user_email:
            message += f" | User: {user_email}"
        if user_id:
            message += f" | ID: {user_id}"
        if ip_address:
            message += f" | IP: {ip_address}"
        if details:
            message += f" | {details}"
        
        security_logger.warning(message)
