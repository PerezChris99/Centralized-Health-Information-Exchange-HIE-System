"""
Migration script to add user_id column to patients table for patient login capability.
Run this script to update the database schema.
"""
import sqlite3
import os

# Database path
db_path = os.path.join(os.path.dirname(__file__), 'instance', 'health_exchange.db')

def migrate():
    """Add user_id column to patients table"""
    print(f"Connecting to database: {db_path}")
    
    if not os.path.exists(db_path):
        print("Error: Database file not found!")
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
        print("Migration successful! 'user_id' column added to patients table.")
        print("\nPatients can now be linked to user accounts for login capability.")
        return True
        
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
