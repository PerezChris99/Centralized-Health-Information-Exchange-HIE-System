const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const patientRoutes = require('./routes/patientRoutes');
const { initNotificationService } = require('./services/notificationService');

const app = express();
const PORT = process.env.PORT || 3000;

// Load environment variables
dotenv.config();

// Middleware
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic authentication middleware
const authenticateUser = (req, res, next) => {
    // This is a placeholder. Implement proper authentication logic here
    const isAuthenticated = req.session?.isAuthenticated;
    if (isAuthenticated) {
        next();
    } else {
        res.redirect('/login.html');
    }
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', authenticateUser, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API routes for login
app.post('/api/login', express.json(), (req, res) => {
    // Implement login logic here
    // For demonstration, always succeed
    req.session.isAuthenticated = true;
    res.json({ success: true });
});

app.get('/api/logout', (req, res) => {
    req.session = null;
    res.redirect('/login');
});

// Routes
app.use('/api/patients', patientRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Server URL: http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/patients`);
  // Open browser automatically (optional)
  require('open')(`http://localhost:${PORT}`);
});

// Initialize socket.io notification service
initNotificationService(server);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  // Close server & exit process
  server.close(() => process.exit(1));
});
