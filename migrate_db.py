"""
Script to add new columns to existing database
"""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'instance', 'health_exchange.db')

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

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get existing columns
cursor.execute("PRAGMA table_info(patients)")
existing_columns = [row[1] for row in cursor.fetchall()]

print(f"Existing columns: {existing_columns}")

# Add missing columns
for col_name, col_type in new_columns:
    if col_name not in existing_columns:
        try:
            cursor.execute(f"ALTER TABLE patients ADD COLUMN {col_name} {col_type}")
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError as e:
            print(f"Error adding {col_name}: {e}")
    else:
        print(f"Column already exists: {col_name}")

conn.commit()
conn.close()

print("\nMigration complete!")
