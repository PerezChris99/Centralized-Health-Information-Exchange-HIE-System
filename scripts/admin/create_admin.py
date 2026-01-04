"""
Script to create an admin user
Run with: python scripts/admin/create_admin.py

Options:
  --email     Admin email (default: admin@healthexchange.com)
  --password  Admin password (default: admin123)
  --name      Admin name (default: System Administrator)
  --force     Force recreate if exists
"""
import sys
import os
import argparse

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app import create_app
from extensions import db
from models.user import User
from models.audit_log import AuditLog


def create_admin(email='admin@healthexchange.com', password='admin123', 
                 name='System Administrator', force=False):
    """Create an admin user"""
    app = create_app()
    
    with app.app_context():
        # Check if admin already exists
        existing_admin = User.query.filter_by(email=email).first()
        
        if existing_admin:
            if force:
                print(f"Removing existing admin: {email}")
                db.session.delete(existing_admin)
                db.session.commit()
            else:
                print(f"Admin user already exists: {email}")
                print("Use --force to recreate the admin account")
                return existing_admin
        
        # Create admin user
        admin = User(
            name=name,
            email=email,
            role='admin'
        )
        admin.set_password(password)
        
        db.session.add(admin)
        db.session.commit()
        
        # Log the creation
        AuditLog.log_action(
            user_id=admin.id,
            action='create_admin',
            resource_type='user',
            resource_id=admin.id,
            details=f"Admin account created via script: {email}"
        )
        
        print(f"\n{'='*50}")
        print("Admin user created successfully!")
        print(f"{'='*50}")
        print(f"Email: {email}")
        print(f"Password: {password}")
        print(f"Name: {name}")
        print(f"{'='*50}")
        print("\nYou can now login at /login.html")
        
        return admin


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Create an admin user')
    parser.add_argument('--email', default='admin@healthexchange.com', help='Admin email')
    parser.add_argument('--password', default='admin123', help='Admin password')
    parser.add_argument('--name', default='System Administrator', help='Admin name')
    parser.add_argument('--force', action='store_true', help='Force recreate if exists')
    
    args = parser.parse_args()
    
    create_admin(
        email=args.email,
        password=args.password,
        name=args.name,
        force=args.force
    )
