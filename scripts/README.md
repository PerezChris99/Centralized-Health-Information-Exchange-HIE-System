# Scripts Directory

This directory contains utility scripts organized by purpose.

## Directory Structure

```
scripts/
├── admin/          # Admin user management scripts
├── database/       # Database migration scripts
└── utilities/      # Debug and utility scripts
```

## Usage

All scripts should be run from the project root directory:

```bash
# Admin scripts
python scripts/admin/create_admin.py
python scripts/admin/reset_passwords.py

# Database scripts
python scripts/database/migrate_db.py
python scripts/database/migrate_patient_user.py

# Utility scripts
python scripts/utilities/check_users.py
python scripts/utilities/fix_patient_role.py
```

## Script Descriptions

### Admin Scripts (`scripts/admin/`)

| Script | Description |
|--------|-------------|
| `create_admin.py` | Create an admin user account |
| `reset_passwords.py` | Reset passwords for specified users |

### Database Scripts (`scripts/database/`)

| Script | Description |
|--------|-------------|
| `migrate_db.py` | Add new columns to existing tables |
| `migrate_patient_user.py` | Add user_id linking for patient accounts |

### Utility Scripts (`scripts/utilities/`)

| Script | Description |
|--------|-------------|
| `check_users.py` | List all users in the database |
| `fix_patient_role.py` | Fix user roles and link patient records |

## Notes

- Make sure the virtual environment is activated before running scripts
- Database scripts require the database to exist (run app.py first)
- Admin scripts require proper configuration in config.py
