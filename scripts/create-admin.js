/**
 * Script to create an initial admin user
 * 
 * Usage: node scripts/create-admin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import User model - we define it inline to avoid dependencies
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  firstName: String,
  lastName: String
});

// Create admin user
async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    const User = mongoose.model('User', UserSchema);

    // Check if admin already exists
    const adminExists = await User.findOne({ username: 'admin' });

    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin user
    const admin = await User.create({
      username: 'admin',
      email: 'admin@healthexchange.com',
      password: hashedPassword,
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator'
    });

    console.log(`Admin user created with ID: ${admin._id}`);
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\nIMPORTANT: Change this password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
