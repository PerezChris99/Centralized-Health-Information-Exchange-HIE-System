"""
Utility script to list all users in the database
Run with: python scripts/utilities/check_users.py

Useful for debugging and verifying user accounts.
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app import create_app
from extensions import db
from models.user import User


def check_users():
    """List all users in the database"""
    app = create_app()

    with app.app_context():
        users = User.query.all()
        
        print(f"\n{'='*70}")
        print(f"Found {len(users)} users in the database:")
        print(f"{'='*70}")
        print(f"{'ID':<6} {'Name':<25} {'Email':<30} {'Role':<10}")
        print(f"{'-'*70}")
        
        for user in users:
            print(f"{user.id:<6} {user.name[:24]:<25} {user.email[:29]:<30} {user.role:<10}")
        
        print(f"{'='*70}\n")
        
        # Summary by role
        roles = {}
        for user in users:
            roles[user.role] = roles.get(user.role, 0) + 1
        
        print("Summary by role:")
        for role, count in sorted(roles.items()):
            print(f"  {role}: {count}")


if __name__ == '__main__':
    check_users()
