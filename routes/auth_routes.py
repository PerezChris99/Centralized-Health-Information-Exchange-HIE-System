"""
Authentication routes for user registration, login, and password management
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from datetime import datetime
import hashlib

from extensions import db
from models.user import User
from models.patient import Patient
from models.user_session import UserSession
from models.audit_log import AuditLog
from services.email_service import send_email
from services.logging_service import ActivityLogger

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    ip_address = request.remote_addr
    
    # Validate required fields
    if not all(k in data for k in ['name', 'email', 'password']):
        return jsonify({'success': False, 'error': 'Name, email and password are required'}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        ActivityLogger.log_auth('register', data['email'], ip_address=ip_address, 
                                details="Registration failed - email already exists", success=False)
        return jsonify({'success': False, 'error': 'Email already registered'}), 400
    
    # Create new user
    user = User(
        name=data['name'],
        email=data['email'],
        role=data.get('role', 'user')
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    # Log successful registration
    ActivityLogger.log_auth('register', data['email'], user_id=user.id, ip_address=ip_address,
                            details=f"New {user.role} account created", success=True)
    
    # If registering as a patient, link to patient record if email matches
    if user.role == 'patient':
        patient = Patient.query.filter_by(email=data['email']).first()
        if patient and not patient.user_id:
            patient.user_id = user.id
            db.session.commit()
            ActivityLogger.log_auth('patient_linked', data['email'], user_id=user.id,
                                    ip_address=ip_address, details=f"Linked to patient record ID: {patient.id}")
    
    return jsonify({
        'success': True,
        'message': 'Registration successful. Please login to continue.'
    }), 201


@auth_bp.route('/register/patient', methods=['POST'])
def register_patient():
    """Register a new patient user account"""
    data = request.get_json()
    ip_address = request.remote_addr
    
    # Validate required fields
    required = ['firstName', 'lastName', 'email', 'password', 'dateOfBirth', 'gender']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
    # Check if user already exists (case-insensitive)
    if User.query.filter(db.func.lower(User.email) == data['email'].strip().lower()).first():
        ActivityLogger.log_auth('patient_register', data['email'], ip_address=ip_address,
                                details="Registration failed - email already exists", success=False)
        return jsonify({'success': False, 'error': 'Email already registered'}), 400
    
    try:
        # Check if patient records already exist with this email (created by provider)
        # Use case-insensitive matching for email and get all unlinked patients
        email_lower = data['email'].strip().lower()
        existing_patients = Patient.query.filter(
            db.func.lower(Patient.email) == email_lower,
            Patient.user_id.is_(None)
        ).all()
        
        print(f"DEBUG: Looking for patients with email '{email_lower}', found {len(existing_patients)} unlinked records")
        
        matched_patient = None
        
        # If no email match, also try matching by name + DOB (common scenario where emails differ)
        if len(existing_patients) == 0:
            reg_dob = datetime.strptime(data['dateOfBirth'], '%Y-%m-%d').date()
            reg_first = data['firstName'].strip().lower()
            reg_last = data['lastName'].strip().lower()
            
            # Look for patients with matching name and DOB that don't have a user yet
            name_dob_matches = Patient.query.filter(
                db.func.lower(Patient.first_name) == reg_first,
                db.func.lower(Patient.last_name) == reg_last,
                Patient.date_of_birth == reg_dob,
                Patient.user_id.is_(None)
            ).all()
            
            print(f"DEBUG: No email match. Trying name+DOB match for '{reg_first} {reg_last}' ({reg_dob}), found {len(name_dob_matches)} records")
            
            if len(name_dob_matches) == 1:
                matched_patient = name_dob_matches[0]
                print(f"DEBUG: Matched patient by name+DOB: ID {matched_patient.id}")
            elif len(name_dob_matches) > 1:
                # Multiple matches by name+DOB - unusual but possible (e.g. twins)
                # Check if any has matching NIN
                reg_nin = data.get('nin', '').strip().upper() if data.get('nin') else None
                if reg_nin:
                    for p in name_dob_matches:
                        if p.nin and p.nin.strip().upper() == reg_nin:
                            matched_patient = p
                            break
                
                if not matched_patient:
                    return jsonify({
                        'success': False,
                        'error': f'Found {len(name_dob_matches)} patient records matching your name and date of birth but with different emails. Please contact support to link your account.',
                        'multiple_name_matches': True,
                        'match_count': len(name_dob_matches)
                    }), 400
        
        elif len(existing_patients) == 1:
            # Single match - use it directly
            matched_patient = existing_patients[0]
        elif len(existing_patients) > 1:
            # Multiple matches - need to disambiguate using DOB, name, and optionally NIN
            reg_dob = datetime.strptime(data['dateOfBirth'], '%Y-%m-%d').date()
            reg_first = data['firstName'].strip().lower()
            reg_last = data['lastName'].strip().lower()
            reg_nin = data.get('nin', '').strip().upper() if data.get('nin') else None
            
            # Try to find exact match by DOB + name
            candidates = []
            for p in existing_patients:
                dob_match = p.date_of_birth == reg_dob
                name_match = (p.first_name.strip().lower() == reg_first and 
                             p.last_name.strip().lower() == reg_last)
                nin_match = reg_nin and p.nin and p.nin.strip().upper() == reg_nin
                
                if dob_match and name_match:
                    candidates.append(p)
                elif nin_match:
                    # NIN is unique - if it matches, this is definitely the patient
                    matched_patient = p
                    break
            
            if matched_patient:
                pass  # Already found by NIN
            elif len(candidates) == 1:
                matched_patient = candidates[0]
            elif len(candidates) > 1:
                # Still multiple matches after DOB+name - require NIN
                return jsonify({
                    'success': False,
                    'error': 'Multiple patient records found with your information. Please provide your National ID Number (NIN) to verify your identity.',
                    'requires_nin': True,
                    'match_count': len(candidates)
                }), 400
            else:
                # No matches by DOB+name - data mismatch
                return jsonify({
                    'success': False,
                    'error': f'Found {len(existing_patients)} patient records with this email but none match your date of birth and name. Please verify your information or contact support.',
                    'data_mismatch': True,
                    'match_count': len(existing_patients)
                }), 400
        
        if matched_patient:
            # Use existing patient's name to ensure consistency with medical records
            user_name = f"{matched_patient.first_name} {matched_patient.last_name}"
            
            # Create user account with patient's existing info
            user = User(
                name=user_name,
                email=data['email'],
                role='patient'
            )
            user.set_password(data['password'])
            db.session.add(user)
            db.session.flush()  # Get user ID without committing
            
            # Link existing patient to new user account
            matched_patient.user_id = user.id
            patient = matched_patient
            
            # Log that this was a linked account
            ActivityLogger.log_auth('patient_register', data['email'], user_id=user.id, 
                                    ip_address=ip_address, 
                                    details=f"Patient account created and linked to existing patient record ID: {patient.id}. "
                                           f"Patient data pre-filled from provider registration. "
                                           f"Matched from {len(existing_patients)} candidate(s).")
        else:
            # No existing patient - create new user and patient from registration data
            user = User(
                name=f"{data['firstName']} {data['lastName']}",
                email=data['email'],
                role='patient'
            )
            user.set_password(data['password'])
            db.session.add(user)
            db.session.flush()  # Get user ID without committing
            
            # Create new patient record
            patient = Patient(
                first_name=data['firstName'],
                last_name=data['lastName'],
                email=data['email'],
                date_of_birth=datetime.strptime(data['dateOfBirth'], '%Y-%m-%d').date(),
                gender=data['gender'],
                contact_number=data.get('contactNumber'),
                address=data.get('address'),
                user_id=user.id
            )
            db.session.add(patient)
            
            # Log new patient creation
            ActivityLogger.log_auth('patient_register', data['email'], user_id=user.id, 
                                    ip_address=ip_address, 
                                    details=f"New patient account created, Patient ID: {patient.id}")
        
        db.session.commit()
        
        # Return success with info about whether data was pre-filled
        return jsonify({
            'success': True,
            'message': 'Patient registration successful. Please login to continue.',
            'linked_existing': matched_patient is not None,
            'patient_name': f"{patient.first_name} {patient.last_name}" if matched_patient else None
        }), 201
        
    except Exception as e:
        db.session.rollback()
        ActivityLogger.log_auth('patient_register', data['email'], ip_address=ip_address,
                                details=f"Registration failed - {str(e)}", success=False)
        return jsonify({'success': False, 'error': str(e)}), 400


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    data = request.get_json()
    ip_address = request.remote_addr
    
    # Validate required fields
    if not all(k in data for k in ['email', 'password']):
        return jsonify({'success': False, 'error': 'Please provide email and password'}), 400
    
    # Find user (case-insensitive email)
    user = User.query.filter(db.func.lower(User.email) == data['email'].strip().lower()).first()
    
    if not user or not user.check_password(data['password']):
        ActivityLogger.log_auth('login', data['email'], ip_address=ip_address,
                                details="Invalid credentials", success=False)
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    
    # Check if user is blocked
    if user.is_blocked:
        ActivityLogger.log_security('blocked_login_attempt', user_id=user.id, 
                                    user_email=user.email, ip_address=ip_address,
                                    details=f"Blocked user attempted login. Reason: {user.blocked_reason}")
        return jsonify({
            'success': False, 
            'error': 'Your account has been blocked due to suspicious activity. Please contact the administrator.',
            'blocked': True,
            'blocked_reason': user.blocked_reason
        }), 403
    
    # Generate tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    # Track session
    user.record_login()
    
    # Create session record
    user_agent = request.headers.get('User-Agent', '')[:500]  # Limit length
    session = UserSession.create_session(
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        session_token=hashlib.sha256(access_token.encode()).hexdigest()[:64]
    )
    
    # Log the login action to database
    AuditLog.log_action(
        user_id=user.id,
        action='login',
        resource_type='user',
        resource_id=user.id,
        details=f"User logged in from IP: {ip_address}",
        ip_address=ip_address
    )
    
    # Log to file
    ActivityLogger.log_auth('login', user.email, user_id=user.id, ip_address=ip_address,
                            details=f"Role: {user.role}", success=True)
    
    # Get patient info if user is a patient
    patient_info = None
    patient_id = None
    if user.role == 'patient':
        # First check by user_id (already linked)
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        # If not found, check by email (case-insensitive)
        if not patient:
            # Get all unlinked patients with this email
            unlinked_patients = Patient.query.filter(
                db.func.lower(Patient.email) == user.email.lower(),
                Patient.user_id.is_(None)
            ).all()
            
            print(f"DEBUG LOGIN: Looking for patients with email '{user.email.lower()}', found {len(unlinked_patients)} unlinked records")
            
            if len(unlinked_patients) == 1:
                # Single match - link it
                patient = unlinked_patients[0]
                patient.user_id = user.id
                db.session.commit()
                ActivityLogger.log_auth('patient_link', user.email, user_id=user.id, 
                                        ip_address=ip_address,
                                        details=f"Auto-linked patient record ID: {patient.id} on login (by email)")
            elif len(unlinked_patients) == 0:
                # No email match - try to match by name
                # Parse user name into first and last name
                name_parts = user.name.strip().split()
                if len(name_parts) >= 2:
                    first_name = name_parts[0].lower()
                    last_name = ' '.join(name_parts[1:]).lower()
                    
                    name_matches = Patient.query.filter(
                        db.func.lower(Patient.first_name) == first_name,
                        db.func.lower(Patient.last_name) == last_name,
                        Patient.user_id.is_(None)
                    ).all()
                    
                    print(f"DEBUG LOGIN: No email match. Trying name match for '{first_name} {last_name}', found {len(name_matches)} records")
                    
                    if len(name_matches) == 1:
                        patient = name_matches[0]
                        patient.user_id = user.id
                        db.session.commit()
                        ActivityLogger.log_auth('patient_link', user.email, user_id=user.id,
                                                ip_address=ip_address,
                                                details=f"Auto-linked patient record ID: {patient.id} on login (by name match)")
            elif len(unlinked_patients) > 1:
                # Multiple unlinked patients - log this but don't auto-link
                # User will need to go through verification process
                ActivityLogger.log_security('multiple_patient_records', user_id=user.id,
                                            user_email=user.email, ip_address=ip_address,
                                            details=f"Found {len(unlinked_patients)} unlinked patient records with same email. Manual verification required.")
        
        if patient:
            patient_info = patient.to_dict()
            patient_id = patient.id
    
    # Build user data with patient_id if applicable
    user_data = user.to_dict()
    if patient_id:
        user_data['patient_id'] = patient_id
    
    response_data = {
        'success': True,
        'token': access_token,
        'refresh_token': refresh_token,
        'sessionId': session.id,
        'user': user_data
    }
    
    if patient_info:
        response_data['patient'] = patient_info
    
    return jsonify(response_data), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user and end session"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    ip_address = request.remote_addr
    
    if user:
        # End all active sessions for this user
        active_sessions = UserSession.query.filter_by(user_id=user_id, is_active=True).all()
        for session in active_sessions:
            session.end_session()
        
        user.record_logout()
        
        # Log the logout action to database
        AuditLog.log_action(
            user_id=user.id,
            action='logout',
            resource_type='user',
            resource_id=user.id,
            details="User logged out",
            ip_address=ip_address
        )
        
        # Log to file
        ActivityLogger.log_auth('logout', user.email, user_id=user.id, ip_address=ip_address)
    
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200


@auth_bp.route('/activity', methods=['POST'])
@jwt_required()
def update_activity():
    """Update user activity timestamp (heartbeat)"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user:
        user.update_activity()
        
        # Update active session
        active_session = UserSession.query.filter_by(user_id=user_id, is_active=True).first()
        if active_session:
            active_session.update_activity()
    
    return jsonify({'success': True}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """Get current logged in user"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    # Check if user is blocked
    if user.is_blocked:
        return jsonify({
            'success': False, 
            'error': 'Your account has been blocked',
            'blocked': True,
            'blocked_reason': user.blocked_reason
        }), 403
    
    # Build response data
    user_data = user.to_dict()
    
    # Add patient_id if user is a patient
    if user.role == 'patient':
        # First check by user_id
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        # If not found, check by email (case-insensitive) and link if single match
        if not patient:
            unlinked_patients = Patient.query.filter(
                db.func.lower(Patient.email) == user.email.lower(),
                Patient.user_id.is_(None)
            ).all()
            
            if len(unlinked_patients) == 1:
                patient = unlinked_patients[0]
                # Link the patient to this user
                patient.user_id = user.id
                db.session.commit()
        
        if patient:
            user_data['patient_id'] = patient.id
            user_data['patientId'] = patient.id  # Also include camelCase version
    
    return jsonify({
        'success': True,
        'data': user_data,
        'patient_id': user_data.get('patient_id'),
        'patientId': user_data.get('patient_id')
    }), 200


@auth_bp.route('/check-status', methods=['GET'])
@jwt_required()
def check_account_status():
    """Check if user account is blocked - for periodic status checks"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    if user.is_blocked:
        return jsonify({
            'success': False,
            'blocked': True,
            'blocked_reason': user.blocked_reason or 'Suspicious activity detected',
            'blocked_at': user.blocked_at.isoformat() if user.blocked_at else None
        }), 403
    
    return jsonify({
        'success': True,
        'blocked': False
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        'success': True,
        'token': access_token
    }), 200


@auth_bp.route('/forgotpassword', methods=['POST'])
def forgot_password():
    """Request password reset email"""
    data = request.get_json()
    
    if not data.get('email'):
        return jsonify({'success': False, 'error': 'Email is required'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user:
        return jsonify({'success': False, 'error': 'No user with that email'}), 404
    
    # Generate reset token
    reset_token = user.get_reset_password_token()
    db.session.commit()
    
    # Create reset URL
    reset_url = f"{request.host_url}api/auth/resetpassword/{reset_token}"
    
    message = f"""You are receiving this email because you (or someone else) has requested 
the reset of a password. Please make a PUT request to:

{reset_url}

If you did not request this, please ignore this email."""
    
    try:
        send_email(
            to_email=user.email,
            subject='Password Reset Token',
            message=message
        )
        return jsonify({'success': True, 'data': 'Email sent'}), 200
    except Exception as e:
        user.reset_password_token = None
        user.reset_password_expire = None
        db.session.commit()
        return jsonify({'success': False, 'error': 'Email could not be sent'}), 500


@auth_bp.route('/resetpassword/<reset_token>', methods=['PUT'])
def reset_password(reset_token):
    """Reset password using token"""
    data = request.get_json()
    
    if not data.get('password'):
        return jsonify({'success': False, 'error': 'New password is required'}), 400
    
    # Hash the token to compare with stored hash
    hashed_token = hashlib.sha256(reset_token.encode()).hexdigest()
    
    # Find user with valid token
    user = User.query.filter(
        User.reset_password_token == hashed_token,
        User.reset_password_expire > datetime.utcnow()
    ).first()
    
    if not user:
        return jsonify({'success': False, 'error': 'Invalid or expired token'}), 400
    
    # Set new password
    user.set_password(data['password'])
    user.reset_password_token = None
    user.reset_password_expire = None
    db.session.commit()
    
    # Generate new tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    return jsonify({
        'success': True,
        'token': access_token,
        'refresh_token': refresh_token
    }), 200
