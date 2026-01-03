"""
Appointment routes for CRUD operations
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from extensions import db, socketio
from models.appointment import Appointment
from models.patient import Patient
from models.user import User

appointment_bp = Blueprint('appointments', __name__)


@appointment_bp.route('', methods=['POST'])
@jwt_required()
def create_appointment():
    """Create a new appointment"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['patient', 'doctor', 'date', 'reason']
    if not all(k in data for k in required_fields):
        return jsonify({'error': 'Missing required fields: patient, doctor, date, reason'}), 400
    
    # Verify patient exists
    patient = Patient.query.get(data['patient'])
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    # Verify doctor exists
    doctor = User.query.get(data['doctor'])
    if not doctor:
        return jsonify({'error': 'Doctor not found'}), 404
    
    try:
        appointment = Appointment(
            patient_id=data['patient'],
            doctor_id=data['doctor'],
            date=datetime.fromisoformat(data['date'].replace('Z', '+00:00')),
            reason=data['reason'],
            status=data.get('status', 'scheduled')
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        # Emit real-time notification
        socketio.emit('appointment_created', appointment.to_dict())
        
        return jsonify(appointment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@appointment_bp.route('', methods=['GET'])
@jwt_required()
def get_all_appointments():
    """Get all appointments"""
    try:
        appointments = Appointment.query.order_by(Appointment.date.desc()).all()
        return jsonify([a.to_dict() for a in appointments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@appointment_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_appointment(id):
    """Get appointment by ID"""
    appointment = Appointment.query.get(id)
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    return jsonify(appointment.to_dict()), 200


@appointment_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_appointment(id):
    """Update appointment by ID"""
    appointment = Appointment.query.get(id)
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    data = request.get_json()
    
    try:
        if 'patient' in data:
            patient = Patient.query.get(data['patient'])
            if not patient:
                return jsonify({'error': 'Patient not found'}), 404
            appointment.patient_id = data['patient']
        
        if 'doctor' in data:
            doctor = User.query.get(data['doctor'])
            if not doctor:
                return jsonify({'error': 'Doctor not found'}), 404
            appointment.doctor_id = data['doctor']
        
        if 'date' in data:
            appointment.date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
        
        if 'reason' in data:
            appointment.reason = data['reason']
        
        if 'status' in data:
            appointment.status = data['status']
        
        db.session.commit()
        
        # Emit real-time notification
        socketio.emit('appointment_updated', appointment.to_dict())
        
        return jsonify(appointment.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@appointment_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_appointment(id):
    """Delete appointment by ID"""
    appointment = Appointment.query.get(id)
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    try:
        db.session.delete(appointment)
        db.session.commit()
        
        # Emit real-time notification
        socketio.emit('appointment_deleted', {'id': id})
        
        return jsonify({'message': 'Appointment deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@appointment_bp.route('/patient/<int:patient_id>', methods=['GET'])
@jwt_required()
def get_patient_appointments(patient_id):
    """Get all appointments for a specific patient"""
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    appointments = Appointment.query.filter_by(patient_id=patient_id).order_by(Appointment.date.desc()).all()
    return jsonify([a.to_dict() for a in appointments]), 200


@appointment_bp.route('/doctor/<int:doctor_id>', methods=['GET'])
@jwt_required()
def get_doctor_appointments(doctor_id):
    """Get all appointments for a specific doctor"""
    doctor = User.query.get(doctor_id)
    if not doctor:
        return jsonify({'error': 'Doctor not found'}), 404
    
    appointments = Appointment.query.filter_by(doctor_id=doctor_id).order_by(Appointment.date.desc()).all()
    return jsonify([a.to_dict() for a in appointments]), 200
