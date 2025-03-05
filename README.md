# Centralized Health Information Exchange System

## Overview
The Centralized Health Information Exchange System is a web-based API that consolidates patient records from multiple healthcare facilities, enabling real-time data sharing and improved decision-making.

## Features
- Consolidate patient records from multiple healthcare facilities
- Real-time data sharing using Socket.IO
- CRUD operations for patient records
- Simple HTML dashboard for real-time updates

## Technologies Used
- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- HTML/CSS/JavaScript

## Getting Started

### Prerequisites
- Node.js
- MongoDB

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/health-information-exchange.git
   cd health-information-exchange
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following environment variables:
   ```plaintext
   MONGODB_URI=mongodb://localhost:27017/health_exchange
   PORT=5000
   ```

4. Start the MongoDB server:
   ```bash
   mongod
   ```

5. Start the application:
   ```bash
   npm start
   ```

6. Open your browser and navigate to `http://localhost:5000` to access the dashboard.

## API Endpoints

### Patients
- `POST /api/patients` - Create a new patient
- `GET /api/patients` - Retrieve all patients
- `GET /api/patients/:id` - Retrieve a patient by ID
- `PUT /api/patients/:id` - Update a patient by ID
- `DELETE /api/patients/:id` - Delete a patient by ID

## Real-time Notifications
The application uses Socket.IO to provide real-time notifications when a patient record is created or updated. The dashboard connects to the Socket.IO server to receive these updates.

## Dashboard
The dashboard is a simple HTML page that displays real-time updates of patient data. It includes a table listing current patients and a form to add new patients.

## Heart Rate Monitor
![Heart Rate Monitor](https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif)

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any changes.

## Contact
For any questions or inquiries, please contact kweeziperez712@gmail.com.

## Legal Notice
© Kweezi Perez Christopher. All rights reserved. Unauthorized use of this project without express permission from the owner is strictly prohibited and will result in legal action.
