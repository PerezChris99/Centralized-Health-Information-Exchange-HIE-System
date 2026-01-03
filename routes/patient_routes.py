"""
Patient routes for CRUD operations
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from extensions import db, socketio
from models.patient import Patient
from models.user import User
from models.audit_log import AuditLog

patient_bp = Blueprint('patients', __name__)


@patient_bp.route('', methods=['POST'])
@jwt_required()
def create_patient():
    """Create a new patient"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['firstName', 'lastName', 'dateOfBirth', 'gender']
    if not all(k in data for k in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Validate gender
    if data['gender'] not in ['Male', 'Female', 'Other']:
        return jsonify({'error': 'Gender must be Male, Female, or Other'}), 400
    
    try:
        patient = Patient(
            first_name=data['firstName'],
            last_name=data['lastName'],
            date_of_birth=datetime.fromisoformat(data['dateOfBirth'].replace('Z', '+00:00')).date(),
            gender=data['gender'],
            contact_number=data.get('contactNumber'),
            email=data.get('email'),
            address=data.get('address'),
            height=data.get('height'),
            weight=data.get('weight'),
            eye_color=data.get('eyeColor'),
            hair_color=data.get('hairColor'),
            skin_tone=data.get('skinTone'),
            nationality=data.get('nationality'),
            tribe=data.get('tribe'),
            photo=data.get('photo'),
            food_allergies=data.get('foodAllergies', []),
            medication_allergies=data.get('medicationAllergies', []),
            medical_history=data.get('medicalHistory', [])
        )
        
        db.session.add(patient)
        db.session.commit()
        
        # Log the action
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        AuditLog.log_action(
            user_id=current_user_id,
            action='create',
            resource_type='patient',
            resource_id=patient.id,
            details=f"{current_user.name} registered new patient: {patient.first_name} {patient.last_name}",
            ip_address=request.remote_addr
        )
        
        # Emit real-time notification
        socketio.emit('patient_created', patient.to_dict())
        
        return jsonify(patient.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@patient_bp.route('', methods=['GET'])
@jwt_required()
def get_all_patients():
    """Get all patients"""
    try:
        patients = Patient.query.order_by(Patient.created_at.desc()).all()
        return jsonify([p.to_dict() for p in patients]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_patient(id):
    """Get patient by ID"""
    patient = Patient.query.get(id)
    
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    return jsonify(patient.to_dict()), 200


@patient_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_patient(id):
    """Update patient by ID"""
    patient = Patient.query.get(id)
    
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    data = request.get_json()
    
    try:
        if 'firstName' in data:
            patient.first_name = data['firstName']
        if 'lastName' in data:
            patient.last_name = data['lastName']
        if 'dateOfBirth' in data:
            patient.date_of_birth = datetime.fromisoformat(data['dateOfBirth'].replace('Z', '+00:00')).date()
        if 'gender' in data:
            if data['gender'] not in ['Male', 'Female', 'Other']:
                return jsonify({'error': 'Gender must be Male, Female, or Other'}), 400
            patient.gender = data['gender']
        if 'contactNumber' in data:
            patient.contact_number = data['contactNumber']
        if 'email' in data:
            patient.email = data['email']
        if 'address' in data:
            patient.address = data['address']
        if 'medicalHistory' in data:
            patient.medical_history = data['medicalHistory']
        if 'height' in data:
            patient.height = data['height']
        if 'weight' in data:
            patient.weight = data['weight']
        if 'eyeColor' in data:
            patient.eye_color = data['eyeColor']
        if 'hairColor' in data:
            patient.hair_color = data['hairColor']
        if 'skinTone' in data:
            patient.skin_tone = data['skinTone']
        if 'nationality' in data:
            patient.nationality = data['nationality']
        if 'tribe' in data:
            patient.tribe = data['tribe']
        if 'photo' in data:
            patient.photo = data['photo']
        if 'foodAllergies' in data:
            patient.food_allergies = data['foodAllergies']
        if 'medicationAllergies' in data:
            patient.medication_allergies = data['medicationAllergies']
        
        db.session.commit()
        
        # Log the action
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        AuditLog.log_action(
            user_id=current_user_id,
            action='update',
            resource_type='patient',
            resource_id=patient.id,
            details=f"{current_user.name} updated patient record: {patient.first_name} {patient.last_name}",
            ip_address=request.remote_addr
        )
        
        # Emit real-time notification
        socketio.emit('patient_updated', patient.to_dict())
        
        return jsonify(patient.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@patient_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_patient(id):
    """Delete patient by ID"""
    patient = Patient.query.get(id)
    
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    patient_name = f"{patient.first_name} {patient.last_name}"
    
    try:
        db.session.delete(patient)
        db.session.commit()
        
        # Log the action
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        AuditLog.log_action(
            user_id=current_user_id,
            action='delete',
            resource_type='patient',
            resource_id=id,
            details=f"{current_user.name} deleted patient record: {patient_name}",
            ip_address=request.remote_addr
        )
        
        # Emit real-time notification
        socketio.emit('patient_deleted', {'id': id})
        
        return jsonify({'message': 'Patient deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/search', methods=['GET'])
@jwt_required()
def search_patients():
    """Search patients by name or email"""
    query = request.args.get('q', '')
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    patients = Patient.query.filter(
        (Patient.first_name.ilike(f'%{query}%')) |
        (Patient.last_name.ilike(f'%{query}%')) |
        (Patient.email.ilike(f'%{query}%'))
    ).all()
    
    return jsonify([p.to_dict() for p in patients]), 200
