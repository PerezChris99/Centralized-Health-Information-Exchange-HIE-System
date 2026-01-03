"""
Medical Record routes for CRUD operations
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from extensions import db
from models.medical_record import MedicalRecord
from models.patient import Patient
from models.user import User
from models.audit_log import AuditLog

medical_record_bp = Blueprint('medical_records', __name__)


@medical_record_bp.route('', methods=['POST'])
@jwt_required()
def create_medical_record():
    """Create a new medical record"""
    data = request.get_json()
    current_user_id = get_jwt_identity()
    
    # Validate patient exists
    if not data.get('patient'):
        return jsonify({'success': False, 'error': 'Patient ID is required'}), 400
    
    patient = Patient.query.get(data['patient'])
    if not patient:
        return jsonify({'success': False, 'error': 'Patient not found'}), 404
    
    try:
        medical_record = MedicalRecord(
            patient_id=data['patient'],
            provider_id=current_user_id,
            visit_date=datetime.fromisoformat(data['visitDate'].replace('Z', '+00:00')) if data.get('visitDate') else datetime.utcnow(),
            diagnosis=data.get('diagnosis', []),
            medications=data.get('medications', []),
            vital_signs=data.get('vitalSigns', {}),
            notes=data.get('notes'),
            lab_results=data.get('labResults', []),
            attachments=data.get('attachments', [])
        )
        
        db.session.add(medical_record)
        db.session.commit()
        
        # Log the action
        current_user = User.query.get(current_user_id)
        AuditLog.log_action(
            user_id=current_user_id,
            action='create',
            resource_type='medicalRecord',
            resource_id=medical_record.id,
            details=f"{current_user.name} created medical record for patient: {patient.first_name} {patient.last_name}",
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'success': True,
            'data': medical_record.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400


@medical_record_bp.route('', methods=['GET'])
@jwt_required()
def get_all_medical_records():
    """Get all medical records"""
    try:
        medical_records = MedicalRecord.query.order_by(MedicalRecord.visit_date.desc()).all()
        return jsonify({
            'success': True,
            'count': len(medical_records),
            'data': [mr.to_dict() for mr in medical_records]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@medical_record_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_medical_record(id):
    """Get medical record by ID"""
    medical_record = MedicalRecord.query.get(id)
    
    if not medical_record:
        return jsonify({'success': False, 'error': 'Medical record not found'}), 404
    
    return jsonify({
        'success': True,
        'data': medical_record.to_dict()
    }), 200


@medical_record_bp.route('/patient/<int:patient_id>', methods=['GET'])
@jwt_required()
def get_patient_medical_records(patient_id):
    """Get all medical records for a specific patient"""
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'success': False, 'error': 'Patient not found'}), 404
    
    medical_records = MedicalRecord.query.filter_by(patient_id=patient_id).order_by(MedicalRecord.visit_date.desc()).all()
    
    return jsonify({
        'success': True,
        'count': len(medical_records),
        'data': [mr.to_dict() for mr in medical_records]
    }), 200


@medical_record_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_medical_record(id):
    """Update medical record by ID"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    medical_record = MedicalRecord.query.get(id)
    
    if not medical_record:
        return jsonify({'success': False, 'error': 'Medical record not found'}), 404
    
    data = request.get_json()
    
    try:
        if 'visitDate' in data:
            medical_record.visit_date = datetime.fromisoformat(data['visitDate'].replace('Z', '+00:00'))
        if 'diagnosis' in data:
            medical_record.diagnosis = data['diagnosis']
        if 'medications' in data:
            medical_record.medications = data['medications']
        if 'vitalSigns' in data:
            medical_record.vital_signs = data['vitalSigns']
        if 'notes' in data:
            medical_record.notes = data['notes']
        if 'labResults' in data:
            medical_record.lab_results = data['labResults']
        if 'attachments' in data:
            medical_record.attachments = data['attachments']
        
        db.session.commit()
        
        # Log the action
        patient = Patient.query.get(medical_record.patient_id)
        AuditLog.log_action(
            user_id=current_user_id,
            action='update',
            resource_type='medicalRecord',
            resource_id=medical_record.id,
            details=f"{current_user.name} updated medical record for patient: {patient.first_name} {patient.last_name}",
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'success': True,
            'data': medical_record.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400


@medical_record_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_medical_record(id):
    """Delete medical record by ID"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    medical_record = MedicalRecord.query.get(id)
    
    if not medical_record:
        return jsonify({'success': False, 'error': 'Medical record not found'}), 404
    
    # Check authorization - only provider who created it or admin can delete
    if medical_record.provider_id != current_user_id and current_user.role != 'admin':
        return jsonify({
            'success': False,
            'error': 'Not authorized to delete this record'
        }), 403
    
    patient = Patient.query.get(medical_record.patient_id)
    patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown"
    record_id = medical_record.id
    
    try:
        db.session.delete(medical_record)
        db.session.commit()
        
        # Log the action
        AuditLog.log_action(
            user_id=current_user_id,
            action='delete',
            resource_type='medicalRecord',
            resource_id=record_id,
            details=f"{current_user.name} deleted medical record for patient: {patient_name}",
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'success': True,
            'message': 'Medical record deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
