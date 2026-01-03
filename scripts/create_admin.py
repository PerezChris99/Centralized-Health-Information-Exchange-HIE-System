"""
Script to create an admin user
Run with: python scripts/create_admin.py

Options:
  --email     Admin email (default: admin@healthexchange.com)
  --password  Admin password (default: admin123)
  --name      Admin name (default: System Administrator)
  --force     Force recreate if exists
"""
import sys
import os
import argparse

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
        
        # Log admin creation
        AuditLog.log_action(
            user_id=admin.id,
            action='create',
            resource_type='user',
            resource_id=admin.id,
            details=f'Admin account created: {email}',
            ip_address='127.0.0.1'
        )
        
        print("\n" + "="*50)
        print("🔐 ADMIN ACCOUNT CREATED SUCCESSFULLY")
        print("="*50)
        print(f"  Name:     {name}")
        print(f"  Email:    {email}")
        print(f"  Password: {password}")
        print(f"  Role:     admin")
        print("="*50)
        print("\n⚠️  IMPORTANT SECURITY NOTES:")
        print("  1. Change the password after first login!")
        print("  2. Store credentials securely")
        print("  3. Enable 2FA if available")
        print("  4. Review audit logs regularly")
        print("\n📌 Login URL: http://localhost:5000/login")
        print("📌 Admin Dashboard: http://localhost:5000/admin")
        print()
        
        return admin


def list_admins():
    """List all admin users"""
    app = create_app()
    
    with app.app_context():
        admins = User.query.filter_by(role='admin').all()
        
        if not admins:
            print("No admin users found.")
            return
        
        print("\n" + "="*60)
        print("📋 ADMIN USERS")
        print("="*60)
        for admin in admins:
            status = "🟢 Online" if admin.is_online else "⚫ Offline"
            last_login = admin.last_login.strftime('%Y-%m-%d %H:%M') if admin.last_login else 'Never'
            print(f"  ID: {admin.id}")
            print(f"  Name: {admin.name}")
            print(f"  Email: {admin.email}")
            print(f"  Status: {status}")
            print(f"  Last Login: {last_login}")
            print(f"  Login Count: {admin.login_count or 0}")
            print("-"*60)
        print()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Create or manage admin accounts')
    parser.add_argument('--email', default='admin@healthexchange.com', help='Admin email')
    parser.add_argument('--password', default='admin123', help='Admin password')
    parser.add_argument('--name', default='System Administrator', help='Admin name')
    parser.add_argument('--force', action='store_true', help='Force recreate if exists')
    parser.add_argument('--list', action='store_true', help='List all admin users')
    
    args = parser.parse_args()
    
    if args.list:
        list_admins()
    else:
        create_admin(
            email=args.email,
            password=args.password,
            name=args.name,
            force=args.force
        )
