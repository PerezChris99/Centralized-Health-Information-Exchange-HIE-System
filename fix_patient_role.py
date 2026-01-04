"""
Fix user role to 'patient' for users that should be patients
"""
from app import create_app
from extensions import db
from models.user import User
from models.patient import Patient

app = create_app()

with app.app_context():
    # Find users with role 'user' who should be 'patient'
    users = User.query.filter_by(role='user').all()
    
    print(f"Found {len(users)} users with role 'user':")
    for user in users:
        print(f"  - ID: {user.id}, Name: {user.name}, Email: {user.email}")
        
        # Update role to patient
        user.role = 'patient'
        print(f"    -> Changed role to 'patient'")
        
        # Check if there's a patient record linked
        patient = Patient.query.filter_by(user_id=user.id).first()
        if patient:
            print(f"    -> Already linked to Patient ID: {patient.id}")
        else:
            # Check if there's a patient record with same email
            patient = Patient.query.filter_by(email=user.email).first()
            if patient and not patient.user_id:
                patient.user_id = user.id
                print(f"    -> Linked to existing Patient ID: {patient.id}")
            else:
                print(f"    -> No patient record found")
    
    db.session.commit()
    print("\nDone! All users with role 'user' have been updated to 'patient'.")
