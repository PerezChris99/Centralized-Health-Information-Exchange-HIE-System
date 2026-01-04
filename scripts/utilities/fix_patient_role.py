"""
Fix user role to 'patient' for users that should be patients
Run with: python scripts/utilities/fix_patient_role.py

This script:
1. Finds users with role 'user' who should be 'patient'
2. Updates their role to 'patient'
3. Attempts to link them to existing patient records by email
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app import create_app
from extensions import db
from models.user import User
from models.patient import Patient


def fix_patient_roles():
    """Fix user roles and link patient records"""
    app = create_app()

    with app.app_context():
        # Find users with role 'user' who should be 'patient'
        users = User.query.filter_by(role='user').all()
        
        if not users:
            print("No users with role 'user' found. Nothing to fix.")
            return
        
        print(f"\nFound {len(users)} users with role 'user':")
        print("-" * 60)
        
        for user in users:
            print(f"\n  User ID: {user.id}")
            print(f"  Name: {user.name}")
            print(f"  Email: {user.email}")
            
            # Update role to patient
            user.role = 'patient'
            print(f"  → Changed role to 'patient'")
            
            # Check if there's a patient record linked
            patient = Patient.query.filter_by(user_id=user.id).first()
            if patient:
                print(f"  → Already linked to Patient ID: {patient.id}")
            else:
                # Check if there's a patient record with same email
                patient = Patient.query.filter_by(email=user.email).first()
                if patient and not patient.user_id:
                    patient.user_id = user.id
                    print(f"  → Linked to existing Patient ID: {patient.id}")
                else:
                    print(f"  → No patient record found to link")
        
        db.session.commit()
        print("\n" + "="*60)
        print("Done! All users with role 'user' have been updated to 'patient'.")
        print("="*60)


if __name__ == '__main__':
    fix_patient_roles()
