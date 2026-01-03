"""
Test configuration and fixtures for pytest
"""
import pytest
from app import create_app
from config import TestingConfig
from extensions import db
from models.user import User


@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app(TestingConfig)
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_headers(app, client):
    """Create authenticated user and return headers with JWT token"""
    with app.app_context():
        # Create test user
        user = User(
            name='Test User',
            email='test@example.com',
            role='admin'
        )
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
        
        # Login to get token
        response = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'password123'
        })
        
        token = response.get_json()['token']
        
        return {'Authorization': f'Bearer {token}'}
