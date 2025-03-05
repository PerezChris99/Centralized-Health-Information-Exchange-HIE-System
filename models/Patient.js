const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  contactInfo: { type: String },
  medicalHistory: { type: [String] },
}, { timestamps: true });

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
