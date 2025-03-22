const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const { connectDB } = require('./db/mongoose');
const patientRoutes = require('./routes/patientRoutes');
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const { initNotificationService } = require('./services/notificationService');
const auth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const socketIo = require('socket.io');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/patients', auth, patientRoutes);
app.use('/api/appointments', appointmentRoutes);

// Patient Schema
const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  contactInfo: { type: String },
  medicalHistory: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Patient = mongoose.model('Patient', PatientSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Set up Socket.IO connections
io.on('connection', (socket) => {
  console.log('Client connected to notification service');
  
  // Send initial patients data
  Patient.find().sort({ createdAt: -1 })
    .then(patients => {
      socket.emit('initialPatients', patients);
    })
    .catch(err => {
      console.error('Error retrieving patients:', err);
      socket.emit('error', { message: 'Failed to retrieve patients' });
    });
  
  // Handle new patient addition
  socket.on('addPatient', async (patientData, callback) => {
    try {
      // Validate required fields
      if (!patientData.name || !patientData.age || !patientData.gender) {
        const error = 'Name, age and gender are required fields';
        console.error('Validation error:', error);
        if (callback) callback({ error });
        return;
      }
      
      // Create new patient
      const newPatient = new Patient(patientData);
      const savedPatient = await newPatient.save();
      
      // Broadcast to all clients
      io.emit('patientAdded', savedPatient);
      
      // Acknowledge the submission
      if (callback) callback({ success: true });
      
      console.log('New patient added:', savedPatient.name);
    } catch (error) {
      console.error('Error adding patient:', error);
      if (callback) callback({ error: error.message });
      socket.emit('error', { message: 'Failed to add patient' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected from notification service');
  });
});

initNotificationService(server);

app.use(errorHandler);

// Start the server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Access the application at: http://localhost:${PORT}`);
      console.log(`Open http://localhost:${PORT} in your browser to view the dashboard`);
    });
    
    // Socket.io or other service setup...
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
