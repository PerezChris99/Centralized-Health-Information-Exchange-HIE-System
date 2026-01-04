"""
Centralized Health Information Exchange System - Flask Backend
"""
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from datetime import timedelta
import os

from config import Config
from extensions import db, migrate, socketio
from routes.auth_routes import auth_bp
from routes.patient_routes import patient_bp
from routes.appointment_routes import appointment_bp
from routes.medical_record_routes import medical_record_bp
from routes.user_routes import user_bp
from routes.admin_routes import admin_bp

def create_app(config_class=Config):
    """Application factory pattern"""
    app = Flask(__name__, static_folder='public', static_url_path='')
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    JWTManager(app)
    socketio.init_app(app, cors_allowed_origins="*")
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(patient_bp, url_prefix='/api/patients')
    app.register_blueprint(appointment_bp, url_prefix='/api/appointments')
    app.register_blueprint(medical_record_bp, url_prefix='/api/medical-records')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # Serve static files
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.route('/login')
    def login_page():
        return send_from_directory(app.static_folder, 'login.html')
    
    @app.route('/register')
    def register_page():
        return send_from_directory(app.static_folder, 'register.html')
    
    @app.route('/patient-register')
    def patient_register_page():
        return send_from_directory(app.static_folder, 'patient-register.html')
    
    @app.route('/dashboard')
    def dashboard():
        return send_from_directory(app.static_folder, 'dashboard.html')
    
    @app.route('/patient-dashboard')
    def patient_dashboard():
        return send_from_directory(app.static_folder, 'patient-dashboard.html')
    
    @app.route('/admin')
    def admin_dashboard():
        return send_from_directory(app.static_folder, 'admin.html')
    
    @app.route('/api-docs')
    def api_docs():
        return send_from_directory(app.static_folder, 'api-docs.html')
    
    @app.route('/faq')
    def faq():
        return send_from_directory(app.static_folder, 'faq.html')
    
    @app.route('/contact')
    def contact():
        return send_from_directory(app.static_folder, 'contact.html')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app


# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('join')
def handle_join(room):
    from flask_socketio import join_room
    join_room(room)
    print(f'Client joined room: {room}')

@socketio.on('leave')
def handle_leave(room):
    from flask_socketio import leave_room
    leave_room(room)
    print(f'Client left room: {room}')


if __name__ == '__main__':
    app = create_app()
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
