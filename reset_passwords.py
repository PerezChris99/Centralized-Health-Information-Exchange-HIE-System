from app import create_app
from extensions import db
from models.user import User

app = create_app()

with app.app_context():
    # Reset Admin
    admin = User.query.filter_by(email='admin@healthexchange.com').first()
    if admin:
        admin.set_password('admin123')
        print("Reset admin password to 'admin123'")
    
    # Reset Provider
    provider = User.query.filter_by(email='kweeziperez712@gmail.com').first()
    if provider:
        provider.set_password('password123')
        print("Reset provider password to 'password123'")
    
    db.session.commit()
