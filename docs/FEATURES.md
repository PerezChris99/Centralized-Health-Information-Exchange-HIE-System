# Centralized Health Information Exchange System - Features Documentation

## Overview

This document details the impressive features and enhancements implemented in the HIE Uganda system, focusing on the automated account matching functionality, patient portal capabilities, comprehensive audit logging, and other key improvements.

---

## 🔗 Automated Patient Account Matching

One of the most powerful features of the system is the **automatic patient record linking** when users register. This eliminates the need for manual intervention in most cases.

### How It Works

When a patient registers for an account, the system automatically attempts to link their new user account to an existing patient record (if one was created by a healthcare provider).

#### Matching Hierarchy

The system uses a three-tier matching approach:

```
1. Primary Match: Email (Case-Insensitive)
   └── johndoe@gmail.com = JOHNDOE@GMAIL.COM ✓

2. Fallback Match: Full Name + Date of Birth
   └── When emails don't match (provider entered different email)
   └── John Doe + 1990-05-15 → Matches existing patient record

3. Login Fallback: Name-Only Match
   └── For subsequent logins if no patient linked yet
   └── Attempts to match by first + last name
```

#### Case-Insensitive Email Matching

All email comparisons use `db.func.lower()` for case-insensitive matching:

```python
# Registration check
existing_patients = Patient.query.filter(
    db.func.lower(Patient.email) == email_lower,
    Patient.user_id.is_(None)
).all()

# Login check
user = User.query.filter(
    db.func.lower(User.email) == data['email'].strip().lower()
).first()
```

#### Multi-Patient Disambiguation

When multiple patient records exist with the same email (rare but possible), the system:

1. **Attempts DOB + Name matching** to narrow down candidates
2. **Falls back to NIN verification** if multiple candidates remain
3. **Returns clear error messages** with guidance for the user

```python
if len(candidates) > 1:
    return jsonify({
        'success': False,
        'error': 'Multiple patient records found. Please provide your NIN to verify identity.',
        'requires_nin': True,
        'match_count': len(candidates)
    }), 400
```

### Benefits

- **Seamless onboarding**: Patients see their medical history immediately after registration
- **Data consistency**: Patient uses the exact name from provider records
- **Zero manual intervention**: No database edits needed for standard registrations
- **Error handling**: Clear guidance when automatic matching isn't possible

---

## 🏥 Patient Portal Dashboard

A world-class patient experience with comprehensive self-service capabilities.

### Features

#### 1. Interactive Calendar
- Monthly calendar view with appointment markers
- Click any date to see scheduled appointments
- Visual indicators for upcoming, past, and cancelled appointments

#### 2. Editable Patient Profile
- Update personal information
- Change contact details
- View and update medical specifics (blood group, allergies, etc.)

#### 3. Photo Upload
- Profile photo support
- Base64 encoding for storage
- Instant preview before saving

#### 4. Activity Logging
- All patient actions are logged
- View activity history in the notifications section
- Real-time notification sounds

#### 5. Section Persistence
- Dashboard remembers your last viewed section
- URL hash-based navigation (`#overview`, `#appointments`, etc.)
- Session storage backup

### Navigation Sections

| Section | Description |
|---------|-------------|
| Overview | Quick stats, upcoming appointments, recent records |
| Appointments | Full appointment history with calendar integration |
| Records | Medical records, lab results, prescriptions |
| Profile | Personal and medical information management |
| Notifications | Activity feed and system notifications |

---

## 📋 Comprehensive Audit Logging

Every action in the system is logged for compliance and security.

### Log Categories

```
logs/
├── auth.log           # Authentication events (login, register, logout)
├── patient.log        # Patient record operations (create, update, view)
├── appointment.log    # Appointment scheduling and modifications
├── medical_records.log # Medical record access and changes
├── security.log       # Security events (failed logins, blocked accounts)
└── system.log         # System-level events
```

### Log Format

```
2026-01-04 14:32:15 | INFO | SUCCESS | LOGIN | User: john@example.com | ID: 42 | IP: 192.168.1.100 | Role: patient
```

### ActivityLogger Service

Centralized logging through the `ActivityLogger` class:

```python
from services.logging_service import ActivityLogger

# Log authentication events
ActivityLogger.log_auth('login', user.email, user_id=user.id, 
                        ip_address=ip_address, success=True)

# Log patient record access
ActivityLogger.log_patient('view', patient_name, patient.id, 
                           user_id=current_user.id, ip_address=ip_address)

# Log security events
ActivityLogger.log_security('blocked_login_attempt', user_id=user.id,
                            details="Account blocked due to suspicious activity")
```

### Rotating Log Files

- Maximum file size: 10MB
- Backup count: 5 files per category
- Automatic rotation when limit reached

---

## 🛡️ Security Features

### JWT Authentication

- Access tokens with 24-hour expiry
- Refresh tokens with 30-day expiry
- Secure token management in localStorage

### Session Tracking

```python
class UserSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    session_token = db.Column(db.String(64))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime)
    last_activity = db.Column(db.DateTime)
```

### Account Blocking

- Automatic blocking for suspicious activity
- Admin-controlled unblocking
- Clear user feedback on blocked accounts

```python
if user.is_blocked:
    return jsonify({
        'success': False,
        'error': 'Your account has been blocked.',
        'blocked': True,
        'blocked_reason': user.blocked_reason
    }), 403
```

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| Admin | Full system access, user management, logs |
| Doctor | Patient records, appointments, prescriptions |
| Nurse | Patient vitals, appointment check-ins |
| Patient | Own records, appointments, profile |

---

## 🇺🇬 Uganda-Specific Features

### National ID Integration

- NIN (National Identification Number) storage
- Used for multi-patient disambiguation
- Unique identifier validation

### Location Hierarchy

```python
village = db.Column(db.String(100))
district = db.Column(db.String(100))
```

### Demographics

- Nationality tracking
- Tribe/ethnicity recording
- Culturally appropriate data fields

### Next of Kin

Emergency contact information:
- Name
- Contact number
- Relationship to patient

---

## 📊 Patient Data Model

### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| first_name | String | Patient's first name |
| last_name | String | Patient's last name |
| date_of_birth | Date | Birth date for age calculation |
| gender | String | Male, Female, Other |
| email | String | Contact email (optional) |
| contact_number | String | Phone number |

### Medical Specifics

| Field | Type | Description |
|-------|------|-------------|
| blood_group | String | A+, O-, AB+, etc. |
| genotype | String | AA, AS, SS |
| chronic_conditions | JSON | Array of conditions |
| food_allergies | JSON | Food allergy list |
| medication_allergies | JSON | Drug allergy list |

### Physical Characteristics

- Height (cm)
- Weight (kg)
- BMI (auto-calculated)
- Eye color, hair color, skin tone

### Computed Properties

```python
@property
def bmi(self):
    """Calculate BMI from height and weight"""
    if self.height and self.weight and self.height > 0:
        height_m = self.height / 100
        return round(self.weight / (height_m ** 2), 1)
    return None

@property
def bmi_category(self):
    """Get BMI category: Underweight, Normal, Overweight, Obese"""
```

---

## 🔔 Real-Time Notifications

### Socket.IO Integration

- Real-time updates across connected clients
- Appointment reminders
- New record notifications

### Notification Sound

Web Audio API-based notification sounds:

```javascript
const notificationSound = {
    context: null,
    init() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    play() {
        const oscillator = this.context.createOscillator();
        oscillator.frequency.setValueAtTime(800, this.context.currentTime);
        oscillator.frequency.setValueAtTime(600, this.context.currentTime + 0.1);
        // ... smooth frequency transition for pleasant chime
    }
};
```

---

## 📧 Email Service

### Password Reset Flow

1. User requests password reset
2. System generates secure token
3. Email sent with reset link
4. Token validates within expiry window
5. Password updated, token invalidated

### Email Configuration

```python
MAIL_SERVER = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
MAIL_PORT = int(os.environ.get('SMTP_PORT', 587))
MAIL_USE_TLS = True
MAIL_USERNAME = os.environ.get('SMTP_EMAIL')
MAIL_PASSWORD = os.environ.get('SMTP_PASSWORD')
```

---

## 🗄️ Database Migrations

### Alembic Integration

- Version-controlled schema changes
- Rollback capability
- Migration history tracking

```bash
# Create a new migration
flask db migrate -m "Add user_activity_tracking"

# Apply migrations
flask db upgrade

# Rollback one step
flask db downgrade
```

### Manual Migration Scripts

Located in `scripts/database/`:
- `migrate_db.py` - Add new columns to existing tables
- `migrate_patient_user.py` - Add user_id column for patient login

---

## 🚀 Performance Optimizations

### Frontend Loading Order

Patient dashboard loads data in optimal order:

```javascript
async function loadDashboardData() {
    // 1. Load patient info first (sets state.patientId)
    await loadPatientInfo();
    
    // 2. Then load dependent data in parallel
    await Promise.all([
        loadAppointments(),
        loadMedicalRecords(),
        loadNotifications()
    ]);
}
```

### Page Detection

Proper dashboard detection prevents code conflicts:

```javascript
if (path.includes('dashboard.html') && !path.includes('patient-dashboard')) {
    // Provider dashboard code only
}
```

### Version Cache Busting

```html
<script src="js/app.js?v=3"></script>
<script src="js/patient-dashboard.js?v=20"></script>
```

---

## 📁 Project Structure

```
├── app.py                 # Application entry point
├── config.py              # Configuration settings
├── extensions.py          # Flask extensions
├── requirements.txt       # Python dependencies
│
├── models/                # SQLAlchemy models
│   ├── user.py
│   ├── patient.py
│   ├── appointment.py
│   ├── medical_record.py
│   ├── audit_log.py
│   └── user_session.py
│
├── routes/                # API route blueprints
│   ├── auth_routes.py
│   ├── patient_routes.py
│   ├── appointment_routes.py
│   ├── medical_record_routes.py
│   ├── admin_routes.py
│   └── user_routes.py
│
├── services/              # Business logic services
│   ├── email_service.py
│   ├── logging_service.py
│   └── notification_service.py
│
├── scripts/               # Utility scripts
│   ├── admin/             # Admin management
│   ├── database/          # Database migrations
│   └── utilities/         # Debug utilities
│
├── public/                # Static frontend files
│   ├── *.html             # HTML pages
│   ├── css/               # Stylesheets
│   └── js/                # JavaScript files
│
├── docs/                  # Documentation
│   └── FEATURES.md        # This file
│
├── logs/                  # Log files (gitignored)
├── instance/              # Instance-specific files
└── migrations/            # Alembic migrations
```

---

## 🧪 Testing

### Test Suite Location

```
tests/
├── conftest.py           # Pytest fixtures
└── test_patient_api.py   # Patient API tests
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=.

# Run specific test file
pytest tests/test_patient_api.py -v
```

---

## 📝 API Documentation

Interactive API documentation available at `/api-docs.html` when running the application.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/register/patient | Register patient account |
| POST | /api/auth/login | Login and get JWT |
| GET | /api/auth/me | Get current user info |
| GET | /api/patients | List all patients |
| GET | /api/patients/:id | Get patient details |
| POST | /api/appointments | Create appointment |
| GET | /api/medical-records | Get medical records |

---

*Last Updated: January 2026*
*Version: 2.0.0*
