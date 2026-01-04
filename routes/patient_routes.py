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
from services.logging_service import ActivityLogger

patient_bp = Blueprint('patients', __name__)


@patient_bp.route('', methods=['POST'])
@jwt_required()
def create_patient():
    """Create a new patient"""
    data = request.get_json()
    current_user_id = get_jwt_identity()
    ip_address = request.remote_addr
    
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
            # Ugandan Specific
            nin=data.get('nin'),
            village=data.get('village'),
            district=data.get('district'),
            # Next of Kin
            next_of_kin_name=data.get('nextOfKinName'),
            next_of_kin_contact=data.get('nextOfKinContact'),
            next_of_kin_relationship=data.get('nextOfKinRelationship'),
            # Medical
            blood_group=data.get('bloodGroup'),
            genotype=data.get('genotype'),
            chronic_conditions=data.get('chronicConditions', []),
            # Physical
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
        
        # Log the action to database
        current_user = User.query.get(current_user_id)
        AuditLog.log_action(
            user_id=current_user_id,
            action='create',
            resource_type='patient',
            resource_id=patient.id,
            details=f"{current_user.name} registered new patient: {patient.first_name} {patient.last_name}",
            ip_address=ip_address
        )
        
        # Log to file
        ActivityLogger.log_patient(
            action='created',
            patient_name=f"{patient.first_name} {patient.last_name}",
            patient_id=patient.id,
            user_id=current_user_id,
            user_name=current_user.name if current_user else None,
            ip_address=ip_address,
            details=f"NIN: {patient.nin or 'N/A'}"
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
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # If user is a patient, only return their own record
        if user and user.role == 'patient':
            patient = Patient.query.filter_by(user_id=current_user_id).first()
            if patient:
                return jsonify([patient.to_dict()]), 200
            return jsonify([]), 200
        
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
        ip_address = request.remote_addr
        
        AuditLog.log_action(
            user_id=current_user_id,
            action='update',
            resource_type='patient',
            resource_id=patient.id,
            details=f"{current_user.name} updated patient record: {patient.first_name} {patient.last_name}",
            ip_address=ip_address
        )
        
        # Log to file
        ActivityLogger.log_patient(
            action='updated',
            patient_name=f"{patient.first_name} {patient.last_name}",
            patient_id=patient.id,
            user_id=current_user_id,
            user_name=current_user.name if current_user else None,
            ip_address=ip_address,
            details=f"Fields updated: {list(data.keys())}"
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
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    ip_address = request.remote_addr
    
    try:
        db.session.delete(patient)
        db.session.commit()
        
        # Log the action to database
        AuditLog.log_action(
            user_id=current_user_id,
            action='delete',
            resource_type='patient',
            resource_id=id,
            details=f"{current_user.name} deleted patient record: {patient_name}",
            ip_address=ip_address
        )
        
        # Log to file
        ActivityLogger.log_patient(
            action='deleted',
            patient_name=patient_name,
            patient_id=id,
            user_id=current_user_id,
            user_name=current_user.name if current_user else None,
            ip_address=ip_address,
            details="Patient record permanently removed"
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


@patient_bp.route('/activity', methods=['POST'])
@jwt_required()
def log_patient_activity():
    """Log patient dashboard activity for admin monitoring"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    ip_address = request.remote_addr
    data = request.get_json()
    
    if not user or user.role != 'patient':
        return jsonify({'error': 'Unauthorized'}), 403
    
    action = data.get('action', 'view')
    resource = data.get('resource', 'dashboard')
    details = data.get('details', '')
    
    # Get patient info
    patient = Patient.query.filter_by(user_id=current_user_id).first()
    patient_name = f"{patient.first_name} {patient.last_name}" if patient else user.name
    
    # Log to database audit log
    AuditLog.log_action(
        user_id=current_user_id,
        action=action,
        resource_type=f'patient_{resource}',
        resource_id=patient.id if patient else current_user_id,
        details=f"Patient {patient_name}: {details}",
        ip_address=ip_address
    )
    
    # Log to file
    ActivityLogger.log_patient(
        action=action,
        patient_name=patient_name,
        patient_id=patient.id if patient else 0,
        user_id=current_user_id,
        ip_address=ip_address,
        details=details
    )
    
    return jsonify({'success': True}), 200


@patient_bp.route('/<int:id>/photo', methods=['PUT'])
@jwt_required()
def update_patient_photo(id):
    """Update patient profile photo"""
    patient = Patient.query.get(id)
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    ip_address = request.remote_addr
    
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    # Verify the patient owns this profile or is admin
    if user.role == 'patient' and patient.user_id != current_user_id:
        return jsonify({'error': 'Unauthorized to update this profile'}), 403
    
    data = request.get_json()
    photo_data = data.get('photo')
    
    if not photo_data:
        return jsonify({'error': 'No photo data provided'}), 400
    
    try:
        patient.photo = photo_data
        db.session.commit()
        
        # Log the action
        AuditLog.log_action(
            user_id=current_user_id,
            action='update',
            resource_type='patient_photo',
            resource_id=patient.id,
            details=f"Profile photo updated for {patient.first_name} {patient.last_name}",
            ip_address=ip_address
        )
        
        ActivityLogger.log_patient(
            action='photo_updated',
            patient_name=f"{patient.first_name} {patient.last_name}",
            patient_id=patient.id,
            user_id=current_user_id,
            ip_address=ip_address,
            details="Profile photo updated"
        )
        
        return jsonify({'success': True, 'message': 'Photo updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
