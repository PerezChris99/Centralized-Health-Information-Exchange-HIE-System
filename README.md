# Centralized Health Information Exchange System

## Overview
The Centralized Health Information Exchange System is a web-based API that consolidates patient records from multiple healthcare facilities, enabling real-time data sharing and improved decision-making.

## Features

### Core Functionality
- **Centralized Patient Registry:** Consolidate patient records from multiple healthcare facilities into a single, secure source of truth.
- **Real-time Data Sharing:** Instant updates across connected clients using Socket.IO for critical alerts and dashboard refreshes.
- **Comprehensive CRUD Operations:** Full management of Patients, Appointments, Medical Records, and User accounts.
- **Security First:** 
  - JWT-based authentication with secure token management.
  - Role-based access control (RBAC) for Admins, Doctors, and Nurses.
  - Comprehensive audit logging for all system actions to ensure compliance.

### Frontend Experience (New!)
- **Modern Landing Page:** 
  - Responsive design with a polished hero section.
  - Auto-counting statistics animation to showcase system scale.
  - Optimized "How It Works" and "Call to Action" sections for better user engagement.
- **Interactive Contact Portal:**
  - Integrated Google Maps for location services.
  - Smart contact forms with validation and feedback.
  - Quick access to emergency contacts and documentation.
- **Admin Dashboard:**
  - Real-time activity feeds.
  - Visual statistics and system health monitoring.
  - User management interface.

## Technologies Used

### Backend
- **Python 3.13+**: Core programming language.
- **Flask**: Lightweight and flexible web framework.
- **SQLAlchemy**: Powerful ORM for database interactions.
- **Flask-SocketIO**: Real-time bidirectional event-based communication.
- **Flask-JWT-Extended**: Secure JSON Web Token authentication.
- **SQLite**: Default database (easily scalable to PostgreSQL).

### Frontend
- **HTML5 & CSS3**: Semantic markup and modern styling variables.
- **Bootstrap 5**: Responsive grid system and components.
- **JavaScript (ES6+)**: Dynamic client-side logic and DOM manipulation.
- **FontAwesome**: Comprehensive icon library.

## Getting Started

### Prerequisites
- Python 3.10 or higher
- pip (Python package manager)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/health-information-exchange.git
   cd health-information-exchange
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the root directory (copy from `.env.example`):
   ```plaintext
   SECRET_KEY=your-secret-key-change-in-production
   JWT_SECRET=jwt-secret-key-change-in-production
   DATABASE_URL=sqlite:///health_exchange.db
   ```

5. Create an admin user:
   ```bash
   python scripts/create_admin.py
   ```

6. Start the application:
   ```bash
   python app.py
   ```

7. Open your browser and navigate to `http://localhost:5000` to access the dashboard.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info (requires auth)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgotpassword` - Request password reset email
- `PUT /api/auth/resetpassword/:token` - Reset password with token

### Patients
- `POST /api/patients` - Create a new patient
- `GET /api/patients` - Retrieve all patients
- `GET /api/patients/:id` - Retrieve a patient by ID
- `PUT /api/patients/:id` - Update a patient by ID
- `DELETE /api/patients/:id` - Delete a patient by ID
- `GET /api/patients/search?q=query` - Search patients

### Appointments
- `POST /api/appointments` - Create a new appointment
- `GET /api/appointments` - Retrieve all appointments
- `GET /api/appointments/:id` - Retrieve an appointment by ID
- `PUT /api/appointments/:id` - Update an appointment by ID
- `DELETE /api/appointments/:id` - Delete an appointment by ID
- `GET /api/appointments/patient/:patientId` - Get patient's appointments
- `GET /api/appointments/doctor/:doctorId` - Get doctor's appointments

### Medical Records
- `POST /api/medical-records` - Create a new medical record
- `GET /api/medical-records` - Retrieve all medical records
- `GET /api/medical-records/:id` - Retrieve a medical record by ID
- `GET /api/medical-records/patient/:patientId` - Get patient's medical records
- `PUT /api/medical-records/:id` - Update a medical record by ID
- `DELETE /api/medical-records/:id` - Delete a medical record by ID

### Users (Admin)
- `GET /api/users` - Retrieve all users (admin only)
- `GET /api/users/:id` - Retrieve a user by ID
- `PUT /api/users/:id` - Update a user by ID
- `DELETE /api/users/:id` - Delete a user by ID (admin only)
- `GET /api/users/providers` - Get all healthcare providers

## User Roles
- **user** - Basic access (view own records)
- **provider** - Healthcare provider (create/edit medical records)
- **admin** - Full system access

## Real-time Notifications
The application uses Socket.IO to provide real-time notifications when patient records are created or updated. Connect to the Socket.IO server to receive these events:
- `patient_created` - New patient added
- `patient_updated` - Patient info updated
- `patient_deleted` - Patient removed
- `appointment_created` - New appointment scheduled
- `appointment_updated` - Appointment modified
- `appointment_deleted` - Appointment cancelled

## Running Tests
```bash
pytest tests/ -v
```

## Project Structure
```
├── app.py              # Main Flask application
├── config.py           # Configuration settings
├── extensions.py       # Flask extensions
├── requirements.txt    # Python dependencies
├── models/             # SQLAlchemy models
│   ├── user.py
│   ├── patient.py
│   ├── appointment.py
│   ├── medical_record.py
│   └── audit_log.py
├── routes/             # API route blueprints
│   ├── auth_routes.py
│   ├── patient_routes.py
│   ├── appointment_routes.py
│   ├── medical_record_routes.py
│   └── user_routes.py
├── services/           # Business logic services
│   ├── email_service.py
│   └── notification_service.py
├── scripts/            # Utility scripts
│   └── create_admin.py
├── tests/              # Test files
│   └── test_patient_api.py
└── public/             # Static frontend files
    ├── index.html
    ├── login.html
    ├── register.html
    ├── dashboard.html
    └── css/
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any changes.

## Contact
For any questions or inquiries, please contact kweeziperez712@gmail.com.

## Legal Notice
© Kweezi Perez Christopher. All rights reserved. Unauthorized use of this project without express permission from the owner is strictly prohibited and will result in legal action.
