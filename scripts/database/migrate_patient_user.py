"""
Migration script to add user_id column to patients table for patient login capability.
Run with: python scripts/database/migrate_patient_user.py

This enables linking patient records to user accounts for patient portal access.
"""
import sqlite3
import os

# Database path - adjust relative to script location
db_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'instance', 
    'health_exchange.db'
)


def migrate():
    """Add user_id column to patients table"""
    print(f"Connecting to database: {db_path}")
    
    if not os.path.exists(db_path):
        print("Error: Database file not found!")
        print("Make sure the application has been run at least once to create the database.")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(patients)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'user_id' in columns:
            print("Column 'user_id' already exists in patients table. No migration needed.")
            return True
        
        # Add the new column (without UNIQUE constraint initially - SQLite limitation)
        print("Adding 'user_id' column to patients table...")
        cursor.execute("""
            ALTER TABLE patients 
            ADD COLUMN user_id INTEGER REFERENCES users(id)
        """)
        
        # Create a unique index separately (this is how SQLite handles UNIQUE for existing tables)
        print("Creating unique index on user_id column...")
        cursor.execute("""
            CREATE UNIQUE INDEX idx_patients_user_id ON patients(user_id)
            WHERE user_id IS NOT NULL
        """)
        
        conn.commit()
        print("\n" + "="*60)
        print("Migration successful!")
        print("="*60)
        print("The 'user_id' column has been added to the patients table.")
        print("Patients can now be linked to user accounts for login capability.")
        print("\nHow patient linking works:")
        print("  1. Provider creates patient record with email")
        print("  2. Patient registers with same email")
        print("  3. System automatically links the accounts")
        print("  4. Patient sees their medical data immediately")
        print("="*60)
        return True
        
    except sqlite3.Error as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()


if __name__ == '__main__':
    success = migrate()
    exit(0 if success else 1)
