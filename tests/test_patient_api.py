"""
Tests for Patient API endpoints
"""
import pytest
from datetime import date


class TestPatientAPI:
    """Test cases for patient endpoints"""
    
    def test_create_patient(self, client, auth_headers):
        """Test creating a new patient"""
        response = client.post('/api/patients', 
            json={
                'firstName': 'John',
                'lastName': 'Doe',
                'dateOfBirth': '1990-01-15',
                'gender': 'Male',
                'email': 'john.doe@example.com',
                'contactNumber': '555-0123'
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['firstName'] == 'John'
        assert data['lastName'] == 'Doe'
    
    def test_create_patient_missing_fields(self, client, auth_headers):
        """Test creating patient with missing required fields"""
        response = client.post('/api/patients',
            json={
                'firstName': 'John'
            },
            headers=auth_headers
        )
        
        assert response.status_code == 400
    
    def test_get_all_patients(self, client, auth_headers):
        """Test getting all patients"""
        # First create a patient
        client.post('/api/patients',
            json={
                'firstName': 'Jane',
                'lastName': 'Smith',
                'dateOfBirth': '1985-05-20',
                'gender': 'Female'
            },
            headers=auth_headers
        )
        
        response = client.get('/api/patients', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_get_patient_by_id(self, client, auth_headers):
        """Test getting a patient by ID"""
        # Create patient
        create_response = client.post('/api/patients',
            json={
                'firstName': 'Bob',
                'lastName': 'Johnson',
                'dateOfBirth': '1975-12-01',
                'gender': 'Male'
            },
            headers=auth_headers
        )
        
        patient_id = create_response.get_json()['id']
        
        response = client.get(f'/api/patients/{patient_id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['firstName'] == 'Bob'
    
    def test_update_patient(self, client, auth_headers):
        """Test updating a patient"""
        # Create patient
        create_response = client.post('/api/patients',
            json={
                'firstName': 'Alice',
                'lastName': 'Williams',
                'dateOfBirth': '1992-08-10',
                'gender': 'Female'
            },
            headers=auth_headers
        )
        
        patient_id = create_response.get_json()['id']
        
        # Update patient
        response = client.put(f'/api/patients/{patient_id}',
            json={
                'contactNumber': '555-9999'
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['contactNumber'] == '555-9999'
    
    def test_delete_patient(self, client, auth_headers):
        """Test deleting a patient"""
        # Create patient
        create_response = client.post('/api/patients',
            json={
                'firstName': 'ToDelete',
                'lastName': 'Patient',
                'dateOfBirth': '2000-01-01',
                'gender': 'Other'
            },
            headers=auth_headers
        )
        
        patient_id = create_response.get_json()['id']
        
        # Delete patient
        response = client.delete(f'/api/patients/{patient_id}', headers=auth_headers)
        
        assert response.status_code == 200
        
        # Verify patient is deleted
        get_response = client.get(f'/api/patients/{patient_id}', headers=auth_headers)
        assert get_response.status_code == 404
    
    def test_unauthorized_access(self, client):
        """Test accessing patients without authentication"""
        response = client.get('/api/patients')
        
        assert response.status_code == 401
