"""
User routes for user management (admin operations)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps

from extensions import db
from models.user import User

user_bp = Blueprint('users', __name__)


def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        return f(*args, **kwargs)
    return decorated_function


def role_required(*roles):
    """Decorator to require specific roles"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)
            
            if not current_user or current_user.role not in roles:
                return jsonify({
                    'success': False,
                    'message': 'Access denied: Insufficient permissions'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


@user_bp.route('', methods=['GET'])
@admin_required
def get_all_users():
    """Get all users - Admin only"""
    try:
        users = User.query.all()
        return jsonify({
            'success': True,
            'count': len(users),
            'data': [u.to_dict() for u in users]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@user_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_user(id):
    """Get user by ID"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Users can only view their own profile unless admin
    if current_user_id != id and current_user.role != 'admin':
        return jsonify({
            'success': False,
            'message': 'Access denied'
        }), 403
    
    user = User.query.get(id)
    
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    return jsonify({
        'success': True,
        'data': user.to_dict()
    }), 200


@user_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_user(id):
    """Update user by ID"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Users can only update their own profile unless admin
    if current_user_id != id and current_user.role != 'admin':
        return jsonify({
            'success': False,
            'message': 'Access denied'
        }), 403
    
    user = User.query.get(id)
    
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    data = request.get_json()
    
    try:
        # Prevent role changes except by admin
        if 'role' in data and current_user.role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Role changes can only be made by administrators'
            }), 403
        
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            # Check if email is already taken
            existing = User.query.filter_by(email=data['email']).first()
            if existing and existing.id != id:
                return jsonify({
                    'success': False,
                    'message': 'Email already in use'
                }), 400
            user.email = data['email']
        if 'password' in data:
            user.set_password(data['password'])
        if 'role' in data and current_user.role == 'admin':
            user.role = data['role']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@user_bp.route('/<int:id>', methods=['DELETE'])
@admin_required
def delete_user(id):
    """Delete user by ID - Admin only"""
    current_user_id = get_jwt_identity()
    
    # Prevent self-deletion
    if current_user_id == id:
        return jsonify({
            'success': False,
            'message': 'Cannot delete your own account'
        }), 400
    
    user = User.query.get(id)
    
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    try:
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@user_bp.route('/providers', methods=['GET'])
@jwt_required()
def get_providers():
    """Get all healthcare providers"""
    try:
        providers = User.query.filter(User.role.in_(['provider', 'admin'])).all()
        return jsonify({
            'success': True,
            'count': len(providers),
            'data': [p.to_dict(include_email=False) for p in providers]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
