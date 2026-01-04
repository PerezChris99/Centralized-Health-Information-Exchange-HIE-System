"""
Script to add new columns to existing database
Run with: python scripts/database/migrate_db.py

This script manually adds columns to the patients table.
Use this for quick schema updates without full Alembic migrations.
"""
import sqlite3
import os

# Database path - adjust relative to script location
db_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'instance', 
    'health_exchange.db'
)

# New columns to add to patients table
new_columns = [
    ("nin", "VARCHAR(20)"),
    ("village", "VARCHAR(100)"),
    ("district", "VARCHAR(100)"),
    ("next_of_kin_name", "VARCHAR(100)"),
    ("next_of_kin_contact", "VARCHAR(20)"),
    ("next_of_kin_relationship", "VARCHAR(50)"),
    ("blood_group", "VARCHAR(5)"),
    ("genotype", "VARCHAR(5)"),
    ("chronic_conditions", "JSON"),
]


def migrate():
    """Run the migration"""
    print(f"Database path: {db_path}")
    
    if not os.path.exists(db_path):
        print("Error: Database file not found!")
        print("Make sure the application has been run at least once to create the database.")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get existing columns
    cursor.execute("PRAGMA table_info(patients)")
    existing_columns = [row[1] for row in cursor.fetchall()]

    print(f"Existing columns: {existing_columns}")
    print(f"\nAdding new columns...")

    # Add missing columns
    added = 0
    for col_name, col_type in new_columns:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE patients ADD COLUMN {col_name} {col_type}")
                print(f"  ✓ Added column: {col_name} ({col_type})")
                added += 1
            except sqlite3.OperationalError as e:
                print(f"  ✗ Error adding {col_name}: {e}")
        else:
            print(f"  - Column already exists: {col_name}")

    conn.commit()
    conn.close()

    print(f"\nMigration complete! Added {added} new column(s).")
    return True


if __name__ == '__main__':
    migrate()
