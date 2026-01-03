"""
Authentication routes for user registration, login, and password management
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from datetime import datetime
import hashlib

from extensions import db
from models.user import User
from models.user_session import UserSession
from models.audit_log import AuditLog
from services.email_service import send_email

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Validate required fields
    if not all(k in data for k in ['name', 'email', 'password']):
        return jsonify({'success': False, 'error': 'Name, email and password are required'}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
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
    
    return jsonify({
        'success': True,
        'message': 'Registration successful. Please login to continue.'
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    data = request.get_json()
    
    # Validate required fields
    if not all(k in data for k in ['email', 'password']):
        return jsonify({'success': False, 'error': 'Please provide email and password'}), 400
    
    # Find user
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    
    # Check if user is blocked
    if user.is_blocked:
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
    ip_address = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')[:500]  # Limit length
    session = UserSession.create_session(
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        session_token=hashlib.sha256(access_token.encode()).hexdigest()[:64]
    )
    
    # Log the login action
    AuditLog.log_action(
        user_id=user.id,
        action='login',
        resource_type='user',
        resource_id=user.id,
        details=f"User logged in from IP: {ip_address}",
        ip_address=ip_address
    )
    
    return jsonify({
        'success': True,
        'token': access_token,
        'refresh_token': refresh_token,
        'sessionId': session.id,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user and end session"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user:
        # End all active sessions for this user
        active_sessions = UserSession.query.filter_by(user_id=user_id, is_active=True).all()
        for session in active_sessions:
            session.end_session()
        
        user.record_logout()
        
        # Log the logout action
        AuditLog.log_action(
            user_id=user.id,
            action='logout',
            resource_type='user',
            resource_id=user.id,
            details="User logged out",
            ip_address=request.remote_addr
        )
    
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
    
    return jsonify({
        'success': True,
        'data': user.to_dict()
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
