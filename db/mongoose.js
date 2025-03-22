const mongoose = require('mongoose');

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/health_exchange';

// Create connection function
const connectDB = async () => {
  // Only connect if not already connected
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(MONGO_URI, options);
      console.log('MongoDB Connected:', mongoose.connection.host);
    } catch (error) {
      console.error('MongoDB Connection Error:', error);
      process.exit(1);
    }
  }
  return mongoose.connection;
};

module.exports = {
  connectDB,
  mongoose
};
