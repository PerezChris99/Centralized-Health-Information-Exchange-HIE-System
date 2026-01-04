"""
Admin routes for dashboard statistics, user management, and audit logs
"""
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from datetime import datetime, timedelta
from sqlalchemy import func, desc
import json
import csv
import io

from extensions import db
from models.user import User
from models.patient import Patient
from models.appointment import Appointment
from models.medical_record import MedicalRecord
from models.audit_log import AuditLog
from models.user_session import UserSession

admin_bp = Blueprint('admin', __name__)


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


# ========================
# Dashboard Statistics
# ========================

@admin_bp.route('/stats/overview', methods=['GET'])
@admin_required
def get_overview_stats():
    """Get overview statistics for the admin dashboard"""
    try:
        # Basic counts
        total_users = User.query.count()
        total_patients = Patient.query.count()
        total_appointments = Appointment.query.count()
        total_records = MedicalRecord.query.count()
        
        # Online/offline users
        online_users = User.query.filter_by(is_online=True).count()
        offline_users = total_users - online_users
        
        # Users by role
        users_by_role = db.session.query(
            User.role, func.count(User.id)
        ).group_by(User.role).all()
        role_distribution = {role: count for role, count in users_by_role}
        
        # Today's stats
        today = datetime.utcnow().date()
        today_start = datetime.combine(today, datetime.min.time())
        
        new_users_today = User.query.filter(User.created_at >= today_start).count()
        new_patients_today = Patient.query.filter(Patient.created_at >= today_start).count()
        appointments_today = Appointment.query.filter(Appointment.date >= today_start).count()
        
        # This week stats
        week_start = today_start - timedelta(days=7)
        new_users_week = User.query.filter(User.created_at >= week_start).count()
        new_patients_week = Patient.query.filter(Patient.created_at >= week_start).count()
        
        return jsonify({
            'success': True,
            'data': {
                'totals': {
                    'users': total_users,
                    'patients': total_patients,
                    'appointments': total_appointments,
                    'medicalRecords': total_records
                },
                'userStatus': {
                    'online': online_users,
                    'offline': offline_users
                },
                'roleDistribution': role_distribution,
                'today': {
                    'newUsers': new_users_today,
                    'newPatients': new_patients_today,
                    'appointments': appointments_today
                },
                'thisWeek': {
                    'newUsers': new_users_week,
                    'newPatients': new_patients_week
                }
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/stats/charts', methods=['GET'])
@admin_required
def get_chart_data():
    """Get data for charts - registrations, appointments, etc. over time"""
    try:
        # Get the last 30 days
        today = datetime.utcnow().date()
        dates = [(today - timedelta(days=i)) for i in range(29, -1, -1)]
        
        # User registrations by day
        user_data = []
        for date in dates:
            start = datetime.combine(date, datetime.min.time())
            end = start + timedelta(days=1)
            count = User.query.filter(User.created_at >= start, User.created_at < end).count()
            user_data.append({'date': date.isoformat(), 'count': count})
        
        # Patient registrations by day
        patient_data = []
        for date in dates:
            start = datetime.combine(date, datetime.min.time())
            end = start + timedelta(days=1)
            count = Patient.query.filter(Patient.created_at >= start, Patient.created_at < end).count()
            patient_data.append({'date': date.isoformat(), 'count': count})
        
        # Appointments by day
        appointment_data = []
        for date in dates:
            start = datetime.combine(date, datetime.min.time())
            end = start + timedelta(days=1)
            count = Appointment.query.filter(Appointment.date >= start, Appointment.date < end).count()
            appointment_data.append({'date': date.isoformat(), 'count': count})
        
        # Appointment status distribution
        appointment_status = db.session.query(
            Appointment.status, func.count(Appointment.id)
        ).group_by(Appointment.status).all()
        status_distribution = {status: count for status, count in appointment_status}
        
        # Patient gender distribution
        gender_dist = db.session.query(
            Patient.gender, func.count(Patient.id)
        ).group_by(Patient.gender).all()
        gender_distribution = {gender: count for gender, count in gender_dist}
        
        # Actions by type (from audit log)
        action_dist = db.session.query(
            AuditLog.action, func.count(AuditLog.id)
        ).group_by(AuditLog.action).all()
        action_distribution = {action: count for action, count in action_dist}
        
        return jsonify({
            'success': True,
            'data': {
                'userRegistrations': user_data,
                'patientRegistrations': patient_data,
                'appointmentsByDay': appointment_data,
                'appointmentStatus': status_distribution,
                'genderDistribution': gender_distribution,
                'actionDistribution': action_distribution
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ========================
# User Management & Activity
# ========================

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users_with_activity():
    """Get all users with activity tracking information"""
    try:
        users = User.query.order_by(desc(User.last_login)).all()
        return jsonify({
            'success': True,
            'count': len(users),
            'data': [u.to_dict(include_email=True, include_activity=True) for u in users]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/users/online', methods=['GET'])
@admin_required
def get_online_users():
    """Get currently online users"""
    try:
        # Consider users online if they had activity in the last 5 minutes
        threshold = datetime.utcnow() - timedelta(minutes=5)
        
        online_users = User.query.filter(
            db.or_(
                User.is_online == True,
                User.last_activity >= threshold
            )
        ).all()
        
        return jsonify({
            'success': True,
            'count': len(online_users),
            'data': [u.to_dict(include_email=True, include_activity=True) for u in online_users]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/users/offline', methods=['GET'])
@admin_required
def get_offline_users():
    """Get offline users"""
    try:
        threshold = datetime.utcnow() - timedelta(minutes=5)
        
        offline_users = User.query.filter(
            db.and_(
                db.or_(User.is_online == False, User.is_online == None),
                db.or_(User.last_activity < threshold, User.last_activity == None)
            )
        ).order_by(desc(User.last_login)).all()
        
        return jsonify({
            'success': True,
            'count': len(offline_users),
            'data': [u.to_dict(include_email=True, include_activity=True) for u in offline_users]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/sessions', methods=['GET'])
@admin_required
def get_user_sessions():
    """Get all user sessions with filtering options"""
    try:
        # Query params for filtering
        user_id = request.args.get('user_id', type=int)
        is_active = request.args.get('active', type=str)
        limit = request.args.get('limit', 100, type=int)
        
        query = UserSession.query
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        if is_active:
            query = query.filter_by(is_active=is_active.lower() == 'true')
        
        sessions = query.order_by(desc(UserSession.login_time)).limit(limit).all()
        
        return jsonify({
            'success': True,
            'count': len(sessions),
            'data': [s.to_dict() for s in sessions]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ========================
# Audit Logs
# ========================

@admin_bp.route('/logs', methods=['GET'])
@admin_required
def get_audit_logs():
    """Get audit logs with filtering and pagination"""
    try:
        # Query params
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        user_id = request.args.get('user_id', type=int)
        action = request.args.get('action', type=str)
        resource_type = request.args.get('resource_type', type=str)
        date_from = request.args.get('date_from', type=str)
        date_to = request.args.get('date_to', type=str)
        
        query = AuditLog.query
        
        # Apply filters
        if user_id:
            query = query.filter_by(user_id=user_id)
        if action:
            query = query.filter_by(action=action)
        if resource_type:
            query = query.filter_by(resource_type=resource_type)
        if date_from:
            query = query.filter(AuditLog.timestamp >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(AuditLog.timestamp <= datetime.fromisoformat(date_to))
        
        # Order by most recent and paginate
        pagination = query.order_by(desc(AuditLog.timestamp)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'data': [log.to_dict() for log in pagination.items],
            'pagination': {
                'page': page,
                'perPage': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'hasNext': pagination.has_next,
                'hasPrev': pagination.has_prev
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/logs/patient-activities', methods=['GET'])
@admin_required
def get_patient_activities():
    """Get patient-specific activities for admin monitoring"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        patient_id = request.args.get('patient_id', type=int)
        date_from = request.args.get('date_from', type=str)
        date_to = request.args.get('date_to', type=str)
        
        # Filter for patient-related activities
        query = AuditLog.query.filter(
            AuditLog.resource_type.like('patient%')
        )
        
        # Join with User to get only patient users
        query = query.join(User, AuditLog.user_id == User.id).filter(
            User.role == 'patient'
        )
        
        if patient_id:
            # Get the patient's user_id
            patient = Patient.query.get(patient_id)
            if patient and patient.user_id:
                query = query.filter(AuditLog.user_id == patient.user_id)
        
        if date_from:
            query = query.filter(AuditLog.timestamp >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(AuditLog.timestamp <= datetime.fromisoformat(date_to))
        
        pagination = query.order_by(desc(AuditLog.timestamp)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Enrich data with patient info
        activities = []
        for log in pagination.items:
            log_dict = log.to_dict()
            # Get patient info
            patient = Patient.query.filter_by(user_id=log.user_id).first()
            if patient:
                log_dict['patient'] = {
                    'id': patient.id,
                    'name': f"{patient.first_name} {patient.last_name}",
                    'email': patient.email
                }
            activities.append(log_dict)
        
        return jsonify({
            'success': True,
            'data': activities,
            'pagination': {
                'page': page,
                'perPage': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'hasNext': pagination.has_next,
                'hasPrev': pagination.has_prev
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/logs/export', methods=['GET'])
@admin_required
def export_audit_logs():
    """Export audit logs as CSV or JSON for backup"""
    try:
        format_type = request.args.get('format', 'json')
        date_from = request.args.get('date_from', type=str)
        date_to = request.args.get('date_to', type=str)
        
        query = AuditLog.query
        
        if date_from:
            query = query.filter(AuditLog.timestamp >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(AuditLog.timestamp <= datetime.fromisoformat(date_to))
        
        logs = query.order_by(desc(AuditLog.timestamp)).all()
        
        if format_type == 'csv':
            # Generate CSV
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['ID', 'User ID', 'User Name', 'Action', 'Resource Type', 
                           'Resource ID', 'Details', 'IP Address', 'Timestamp'])
            
            for log in logs:
                writer.writerow([
                    log.id,
                    log.user_id,
                    log.user.name if log.user else 'N/A',
                    log.action,
                    log.resource_type,
                    log.resource_id,
                    log.details,
                    log.ip_address,
                    log.timestamp.isoformat() if log.timestamp else 'N/A'
                ])
            
            output.seek(0)
            return Response(
                output.getvalue(),
                mimetype='text/csv',
                headers={'Content-Disposition': f'attachment; filename=audit_logs_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv'}
            )
        else:
            # Generate JSON
            logs_data = [log.to_dict() for log in logs]
            return Response(
                json.dumps({'exportDate': datetime.utcnow().isoformat(), 'logs': logs_data}, indent=2),
                mimetype='application/json',
                headers={'Content-Disposition': f'attachment; filename=audit_logs_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json'}
            )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/logs/plain', methods=['GET'])
@admin_required
def get_audit_logs_plain():
    """Get audit logs as plain text format for easy reading"""
    try:
        limit = request.args.get('limit', 100, type=int)
        
        logs = AuditLog.query.order_by(desc(AuditLog.timestamp)).limit(limit).all()
        
        plain_logs = []
        for log in logs:
            user_name = log.user.name if log.user else 'Unknown'
            timestamp = log.timestamp.strftime('%Y-%m-%d %H:%M:%S') if log.timestamp else 'N/A'
            
            plain_text = f"[{timestamp}] {user_name} ({log.user_id}) - {log.action.upper()} {log.resource_type} #{log.resource_id}"
            if log.details:
                plain_text += f" | {log.details}"
            if log.ip_address:
                plain_text += f" | IP: {log.ip_address}"
            
            plain_logs.append(plain_text)
        
        return jsonify({
            'success': True,
            'count': len(plain_logs),
            'data': plain_logs,
            'formatted': '\n'.join(plain_logs)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/logs/summary', methods=['GET'])
@admin_required
def get_logs_summary():
    """Get summary of audit log activity"""
    try:
        # Total logs
        total_logs = AuditLog.query.count()
        
        # Logs by action
        logs_by_action = db.session.query(
            AuditLog.action, func.count(AuditLog.id)
        ).group_by(AuditLog.action).all()
        
        # Logs by resource type
        logs_by_resource = db.session.query(
            AuditLog.resource_type, func.count(AuditLog.id)
        ).group_by(AuditLog.resource_type).all()
        
        # Most active users
        most_active = db.session.query(
            AuditLog.user_id, User.name, func.count(AuditLog.id).label('count')
        ).join(User).group_by(AuditLog.user_id, User.name).order_by(
            desc('count')
        ).limit(10).all()
        
        # Today's activity
        today_start = datetime.combine(datetime.utcnow().date(), datetime.min.time())
        today_logs = AuditLog.query.filter(AuditLog.timestamp >= today_start).count()
        
        return jsonify({
            'success': True,
            'data': {
                'totalLogs': total_logs,
                'todayLogs': today_logs,
                'byAction': {action: count for action, count in logs_by_action},
                'byResourceType': {resource: count for resource, count in logs_by_resource},
                'mostActiveUsers': [
                    {'userId': uid, 'name': name, 'actionCount': count}
                    for uid, name, count in most_active
                ]
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ========================
# System Health
# ========================

@admin_bp.route('/system/health', methods=['GET'])
@admin_required
def get_system_health():
    """Get comprehensive system health information with issues and fixes"""
    try:
        issues = []
        warnings = []
        overall_status = 'healthy'
        health_score = 100
        
        # 1. Database connectivity check
        try:
            db_stats = {
                'users': User.query.count(),
                'patients': Patient.query.count(),
                'appointments': Appointment.query.count(),
                'medicalRecords': MedicalRecord.query.count(),
                'auditLogs': AuditLog.query.count(),
                'sessions': UserSession.query.count()
            }
            db_status = 'connected'
        except Exception as db_err:
            db_status = 'error'
            db_stats = {}
            issues.append({
                'component': 'Database',
                'severity': 'critical',
                'issue': f'Database connection failed: {str(db_err)}',
                'fix': 'Check database configuration in config.py. Ensure the database file exists and has proper permissions.',
                'icon': 'fa-database'
            })
            health_score -= 40
            overall_status = 'critical'
        
        # 2. Check for stale sessions (sessions marked active but no activity in 24+ hours)
        stale_threshold = datetime.utcnow() - timedelta(hours=24)
        stale_sessions = UserSession.query.filter(
            UserSession.is_active == True,
            UserSession.last_activity < stale_threshold
        ).count()
        
        if stale_sessions > 0:
            warnings.append({
                'component': 'Sessions',
                'severity': 'warning',
                'issue': f'{stale_sessions} stale session(s) detected (active but no activity in 24+ hours)',
                'fix': 'Run session cleanup: These sessions should be automatically ended. Consider implementing a session timeout.',
                'icon': 'fa-clock',
                'action': 'cleanup_sessions'
            })
            health_score -= 5
        
        # 3. Check for users marked online but inactive for 30+ minutes
        inactive_threshold = datetime.utcnow() - timedelta(minutes=30)
        ghost_users = User.query.filter(
            User.is_online == True,
            User.last_activity < inactive_threshold
        ).count()
        
        if ghost_users > 0:
            warnings.append({
                'component': 'Users',
                'severity': 'warning',
                'issue': f'{ghost_users} user(s) marked online but inactive for 30+ minutes',
                'fix': 'These users may have closed their browser without logging out. Their status will update on next activity check.',
                'icon': 'fa-user-clock',
                'action': 'cleanup_online_status'
            })
            health_score -= 3
        
        # 4. Check for blocked users
        blocked_users = User.query.filter_by(is_blocked=True).count()
        if blocked_users > 0:
            warnings.append({
                'component': 'Security',
                'severity': 'info',
                'issue': f'{blocked_users} user(s) currently blocked',
                'fix': 'Review blocked users in User Management. Unblock if the issue has been resolved.',
                'icon': 'fa-ban'
            })
        
        # 5. Check audit log growth
        day_ago = datetime.utcnow() - timedelta(days=1)
        logs_last_24h = AuditLog.query.filter(AuditLog.timestamp >= day_ago).count()
        total_logs = db_stats.get('auditLogs', 0)
        
        if total_logs > 100000:
            warnings.append({
                'component': 'Audit Logs',
                'severity': 'warning',
                'issue': f'Audit log table has {total_logs:,} records - may impact performance',
                'fix': 'Consider archiving old audit logs using the backup feature, then clearing old records.',
                'icon': 'fa-archive',
                'action': 'archive_logs'
            })
            health_score -= 5
        
        # 6. Check for orphaned medical records (no associated patient)
        orphaned_records = MedicalRecord.query.filter(
            ~MedicalRecord.patient_id.in_(db.session.query(Patient.id))
        ).count() if db_stats else 0
        
        if orphaned_records > 0:
            issues.append({
                'component': 'Data Integrity',
                'severity': 'error',
                'issue': f'{orphaned_records} medical record(s) without associated patient',
                'fix': 'Review and clean up orphaned records. These may be from deleted patients.',
                'icon': 'fa-unlink',
                'action': 'cleanup_orphaned_records'
            })
            health_score -= 10
            if overall_status == 'healthy':
                overall_status = 'degraded'
        
        # 7. Check for orphaned appointments (no associated patient or doctor)
        orphaned_appointments = Appointment.query.filter(
            db.or_(
                ~Appointment.patient_id.in_(db.session.query(Patient.id)),
                ~Appointment.doctor_id.in_(db.session.query(User.id))
            )
        ).count() if db_stats else 0
        
        if orphaned_appointments > 0:
            issues.append({
                'component': 'Data Integrity',
                'severity': 'error',
                'issue': f'{orphaned_appointments} appointment(s) with missing patient or doctor',
                'fix': 'Review appointments with missing references. Consider cleaning up or reassigning.',
                'icon': 'fa-calendar-times',
                'action': 'cleanup_orphaned_appointments'
            })
            health_score -= 10
            if overall_status == 'healthy':
                overall_status = 'degraded'
        
        # 8. Check for admin users (should have at least one)
        admin_count = User.query.filter_by(role='admin').count()
        if admin_count == 0:
            issues.append({
                'component': 'Security',
                'severity': 'critical',
                'issue': 'No admin users found in the system',
                'fix': 'Create an admin user using the create_admin.py script: python scripts/create_admin.py',
                'icon': 'fa-user-shield'
            })
            health_score -= 20
            overall_status = 'critical'
        
        # 9. Active sessions count
        active_sessions = UserSession.query.filter_by(is_active=True).count()
        
        # 10. Recent activity (last hour)
        hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_logs = AuditLog.query.filter(AuditLog.timestamp >= hour_ago).count()
        
        # 11. Check online users
        online_users = User.query.filter_by(is_online=True).count()
        
        # Determine final status
        if health_score < 60:
            overall_status = 'critical'
        elif health_score < 80:
            overall_status = 'degraded'
        elif health_score < 95:
            overall_status = 'warning'
        
        return jsonify({
            'success': True,
            'data': {
                'status': overall_status,
                'healthScore': max(0, health_score),
                'timestamp': datetime.utcnow().isoformat(),
                'database': {
                    'status': db_status,
                    'stats': db_stats
                },
                'activeSessions': active_sessions,
                'onlineUsers': online_users,
                'recentActivity': recent_logs,
                'logsLast24h': logs_last_24h,
                'blockedUsers': blocked_users,
                'issues': issues,
                'warnings': warnings,
                'summary': {
                    'criticalIssues': len([i for i in issues if i['severity'] == 'critical']),
                    'errors': len([i for i in issues if i['severity'] == 'error']),
                    'warnings': len(warnings),
                    'totalProblems': len(issues) + len(warnings)
                }
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False, 
            'message': str(e), 
            'data': {
                'status': 'error',
                'healthScore': 0,
                'issues': [{
                    'component': 'System',
                    'severity': 'critical',
                    'issue': f'System health check failed: {str(e)}',
                    'fix': 'Check server logs for detailed error information. Restart the application if necessary.',
                    'icon': 'fa-exclamation-triangle'
                }],
                'warnings': []
            }
        }), 500


# ========================
# User Block/Unblock
# ========================

@admin_bp.route('/users/<int:user_id>/block', methods=['POST'])
@admin_required
def block_user(user_id):
    """Block a user account due to suspicious activity"""
    try:
        current_admin_id = get_jwt_identity()
        
        # Can't block yourself
        if user_id == current_admin_id:
            return jsonify({'success': False, 'message': 'You cannot block your own account'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Can't block other admins
        if user.role == 'admin':
            return jsonify({'success': False, 'message': 'Cannot block admin accounts'}), 400
        
        data = request.get_json() or {}
        reason = data.get('reason', 'Suspicious activity detected')
        
        user.is_blocked = True
        user.blocked_reason = reason
        user.blocked_at = datetime.utcnow()
        user.blocked_by = current_admin_id
        user.is_online = False  # Force logout
        
        # End all active sessions
        active_sessions = UserSession.query.filter_by(user_id=user_id, is_active=True).all()
        for session in active_sessions:
            session.end_session()
        
        db.session.commit()
        
        # Log the action
        AuditLog.log_action(
            user_id=current_admin_id,
            action='block',
            resource_type='user',
            resource_id=user_id,
            details=f"Blocked user {user.name} ({user.email}). Reason: {reason}",
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'success': True,
            'message': f'User {user.name} has been blocked',
            'data': user.to_dict(include_email=True, include_activity=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/users/<int:user_id>/unblock', methods=['POST'])
@admin_required
def unblock_user(user_id):
    """Unblock a previously blocked user account"""
    try:
        current_admin_id = get_jwt_identity()
        data = request.get_json() or {}
        reason = data.get('reason', 'Account restored')
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        if not user.is_blocked:
            return jsonify({'success': False, 'message': 'User is not blocked'}), 400
        
        user.is_blocked = False
        user.blocked_reason = None
        user.blocked_at = None
        user.blocked_by = None
        
        db.session.commit()
        
        # Log the action with reason
        AuditLog.log_action(
            user_id=current_admin_id,
            action='unblock',
            resource_type='user',
            resource_id=user_id,
            details=f"Unblocked user {user.name} ({user.email}). Reason: {reason}",
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'success': True,
            'message': f'User {user.name} has been unblocked',
            'data': user.to_dict(include_email=True, include_activity=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# ========================
# User Activity Details
# ========================

@admin_bp.route('/users/<int:user_id>/activity', methods=['GET'])
@admin_required
def get_user_activity(user_id):
    """Get detailed activity for a specific user"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Get user's recent sessions
        sessions = UserSession.query.filter_by(user_id=user_id).order_by(
            desc(UserSession.login_time)
        ).limit(20).all()
        
        # Get user's recent audit logs
        logs = AuditLog.query.filter_by(user_id=user_id).order_by(
            desc(AuditLog.timestamp)
        ).limit(50).all()
        
        # Calculate activity stats
        total_session_time = sum(s.duration_seconds for s in sessions)
        avg_session_time = total_session_time // len(sessions) if sessions else 0
        
        # Actions breakdown
        action_counts = db.session.query(
            AuditLog.action, func.count(AuditLog.id)
        ).filter_by(user_id=user_id).group_by(AuditLog.action).all()
        
        return jsonify({
            'success': True,
            'data': {
                'user': user.to_dict(include_email=True, include_activity=True),
                'sessions': [s.to_dict() for s in sessions],
                'recentActivity': [l.to_dict() for l in logs],
                'stats': {
                    'totalSessions': len(sessions),
                    'totalSessionTime': total_session_time,
                    'avgSessionTime': avg_session_time,
                    'actionBreakdown': {action: count for action, count in action_counts}
                }
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/activity/realtime', methods=['GET'])
@admin_required
def get_realtime_activity():
    """Get real-time activity data for live monitoring"""
    try:
        minutes = request.args.get('minutes', 5, type=int)
        threshold = datetime.utcnow() - timedelta(minutes=minutes)
        
        # Recent logs
        recent_logs = AuditLog.query.filter(
            AuditLog.timestamp >= threshold
        ).order_by(desc(AuditLog.timestamp)).all()
        
        # Currently active users
        active_users = User.query.filter(
            db.or_(
                User.is_online == True,
                User.last_activity >= threshold
            )
        ).all()
        
        # Recent logins
        recent_logins = UserSession.query.filter(
            UserSession.login_time >= threshold
        ).order_by(desc(UserSession.login_time)).all()
        
        return jsonify({
            'success': True,
            'data': {
                'timeWindow': f'{minutes} minutes',
                'recentActivity': [l.to_dict() for l in recent_logs[:20]],
                'activeUsers': [u.to_dict(include_activity=True) for u in active_users],
                'recentLogins': [s.to_dict() for s in recent_logins[:10]],
                'activityCount': len(recent_logs),
                'activeUserCount': len(active_users)
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/logs/backup', methods=['POST'])
@admin_required
def backup_logs():
    """Create a backup of audit logs and mark as backed up"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get all logs that haven't been backed up or all logs
        logs = AuditLog.query.order_by(AuditLog.timestamp).all()
        
        # Create backup data
        backup_data = {
            'backupDate': datetime.utcnow().isoformat(),
            'backupBy': current_user_id,
            'totalRecords': len(logs),
            'logs': [log.to_dict() for log in logs]
        }
        
        # Log the backup action
        AuditLog.log_action(
            user_id=current_user_id,
            action='export',
            resource_type='auditLog',
            resource_id=0,
            details=f'Backup created with {len(logs)} records',
            ip_address=request.remote_addr
        )
        
        return Response(
            json.dumps(backup_data, indent=2),
            mimetype='application/json',
            headers={
                'Content-Disposition': f'attachment; filename=audit_backup_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json'
            }
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/stats/hourly', methods=['GET'])
@admin_required
def get_hourly_stats():
    """Get hourly activity breakdown for the last 24 hours"""
    try:
        hours_data = []
        now = datetime.utcnow()
        
        for i in range(24):
            hour_start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=i)
            hour_end = hour_start + timedelta(hours=1)
            
            log_count = AuditLog.query.filter(
                AuditLog.timestamp >= hour_start,
                AuditLog.timestamp < hour_end
            ).count()
            
            login_count = UserSession.query.filter(
                UserSession.login_time >= hour_start,
                UserSession.login_time < hour_end
            ).count()
            
            hours_data.append({
                'hour': hour_start.strftime('%H:00'),
                'date': hour_start.isoformat(),
                'activities': log_count,
                'logins': login_count
            })
        
        hours_data.reverse()
        
        return jsonify({
            'success': True,
            'data': hours_data
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ========================
# Activity Feed
# ========================

@admin_bp.route('/activity-feed', methods=['GET'])
@admin_required
def get_activity_feed():
    """Get human-readable activity feed for the admin dashboard"""
    try:
        limit = request.args.get('limit', 50, type=int)
        
        # Get recent logs with user info
        logs = AuditLog.query.order_by(desc(AuditLog.timestamp)).limit(limit).all()
        
        feed_items = []
        for log in logs:
            user_name = log.user.name if log.user else 'Unknown User'
            user_role = log.user.role if log.user else 'user'
            
            # Generate human-readable description based on action and resource type
            description = generate_activity_description(log, user_name)
            
            # Determine icon and color based on action
            icon, color = get_action_icon_color(log.action)
            
            feed_items.append({
                'id': log.id,
                'timestamp': log.timestamp.isoformat() if log.timestamp else None,
                'timeAgo': time_ago(log.timestamp) if log.timestamp else 'Unknown',
                'user': {
                    'id': log.user_id,
                    'name': user_name,
                    'role': user_role
                },
                'action': log.action,
                'resourceType': log.resource_type,
                'resourceId': log.resource_id,
                'description': description,
                'details': log.details,
                'icon': icon,
                'color': color,
                'ipAddress': log.ip_address
            })
        
        return jsonify({
            'success': True,
            'count': len(feed_items),
            'data': feed_items
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


def generate_activity_description(log, user_name):
    """Generate a human-readable description for an activity"""
    action = log.action
    resource_type = log.resource_type
    resource_id = log.resource_id
    details = log.details or ''
    
    # Use details if available (contains rich info like patient names)
    if details:
        return details
    
    # Fallback to generic descriptions
    action_verbs = {
        'create': 'created',
        'read': 'viewed',
        'update': 'updated',
        'delete': 'deleted',
        'login': 'logged in',
        'logout': 'logged out',
        'export': 'exported'
    }
    
    resource_names = {
        'patient': 'patient record',
        'medicalRecord': 'medical record',
        'appointment': 'appointment',
        'user': 'user account',
        'auditLog': 'audit logs'
    }
    
    verb = action_verbs.get(action, action)
    resource = resource_names.get(resource_type, resource_type)
    
    if action in ['login', 'logout']:
        return f"{user_name} {verb}"
    elif action == 'export':
        return f"{user_name} {verb} {resource}"
    else:
        return f"{user_name} {verb} {resource} #{resource_id}"


def get_action_icon_color(action):
    """Get appropriate icon and color for an action"""
    action_styles = {
        'create': ('fa-plus-circle', 'success'),
        'read': ('fa-eye', 'info'),
        'update': ('fa-edit', 'warning'),
        'delete': ('fa-trash', 'danger'),
        'login': ('fa-sign-in-alt', 'primary'),
        'logout': ('fa-sign-out-alt', 'secondary'),
        'export': ('fa-download', 'info')
    }
    return action_styles.get(action, ('fa-circle', 'secondary'))


def time_ago(dt):
    """Convert datetime to human-readable time ago string"""
    if not dt:
        return 'Unknown'
    
    now = datetime.utcnow()
    diff = now - dt
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return 'Just now'
    elif seconds < 3600:
        mins = int(seconds // 60)
        return f"{mins} minute{'s' if mins != 1 else ''} ago"
    elif seconds < 86400:
        hours = int(seconds // 3600)
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    elif seconds < 604800:
        days = int(seconds // 86400)
        return f"{days} day{'s' if days != 1 else ''} ago"
    else:
        return dt.strftime('%b %d, %Y')
