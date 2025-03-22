const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const mongoose = require('mongoose');

// Create a new medical record
exports.createMedicalRecord = async (req, res) => {
  try {
    // Validate patient exists
    const patientExists = await Patient.findById(req.body.patient);
    if (!patientExists) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Set provider to current user
    req.body.provider = req.user.id;
    
    const medicalRecord = new MedicalRecord(req.body);
    await medicalRecord.save();
    
    res.status(201).json({
      success: true,
      data: medicalRecord
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get all medical records
exports.getAllMedicalRecords = async (req, res) => {
  try {
    const medicalRecords = await MedicalRecord.find()
      .populate('patient', 'name age gender')
      .populate('provider', 'username role');
      
    res.status(200).json({
      success: true,
      count: medicalRecords.length,
      data: medicalRecords
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get medical records by patient ID
exports.getPatientMedicalRecords = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    // Validate patient ID format
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid patient ID format'
      });
    }
    
    const medicalRecords = await MedicalRecord.find({ patient: patientId })
      .populate('provider', 'username role')
      .sort({ visitDate: -1 });
      
    res.status(200).json({
      success: true,
      count: medicalRecords.length,
      data: medicalRecords
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get a single medical record by ID
exports.getMedicalRecordById = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findById(req.params.id)
      .populate('patient', 'name age gender contactInfo')
      .populate('provider', 'username role');
      
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: medicalRecord
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Update medical record
exports.updateMedicalRecord = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: medicalRecord
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Delete medical record
exports.deleteMedicalRecord = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findById(req.params.id);
    
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found'
      });
    }
    
    // Additional authorization check
    if (medicalRecord.provider.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this record'
      });
    }
    
    await medicalRecord.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
