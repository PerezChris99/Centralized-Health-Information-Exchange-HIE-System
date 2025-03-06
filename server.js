const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const connectDB = require('./config/db');
const patientRoutes = require('./routes/patientRoutes');
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const { initNotificationService } = require('./services/notificationService');
const auth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const server = http.createServer(app);

connectDB();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patients', auth, patientRoutes);
app.use('/api/appointments', appointmentRoutes);

initNotificationService(server);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
