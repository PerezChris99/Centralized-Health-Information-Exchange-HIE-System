"""
Script to reset user passwords
Run with: python scripts/admin/reset_passwords.py

This script resets passwords for specified users.
Modify the users dictionary below to set passwords for different users.
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app import create_app
from extensions import db
from models.user import User


def reset_passwords():
    """Reset passwords for specified users"""
    app = create_app()
    
    # Define users and their new passwords
    # Format: 'email': 'new_password'
    users_to_reset = {
        'admin@healthexchange.com': 'admin123',
        # Add more users as needed
        # 'user@example.com': 'newpassword123',
    }
    
    with app.app_context():
        for email, new_password in users_to_reset.items():
            user = User.query.filter_by(email=email).first()
            if user:
                user.set_password(new_password)
                print(f"✓ Reset password for: {email}")
            else:
                print(f"✗ User not found: {email}")
        
        db.session.commit()
        print("\nPassword reset complete!")


if __name__ == '__main__':
    reset_passwords()
