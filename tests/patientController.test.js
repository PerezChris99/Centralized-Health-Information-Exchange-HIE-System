const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const patientController = require('../controllers/patientController');
const Patient = require('../models/Patient');

const app = express();
app.use(express.json());

app.post('/patients', patientController.createPatient);
app.get('/patients', patientController.getAllPatients);
app.get('/patients/:id', patientController.getPatientById);
app.put('/patients/:id', patientController.updatePatientById);
app.delete('/patients/:id', patientController.deletePatientById);

describe('Patient Controller', () => {
  beforeAll(async () => {
    const url = `mongodb://127.0.0.1/patient_test_db`;
    // Close any existing connections before creating a new one for tests
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Patient.deleteMany({});
  });

  test('should create a new patient', async () => {
    const res = await request(app)
      .post('/patients')
      .send({ name: 'John Doe', age: 30, address: '123 Main St', gender: 'male' });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.name).toBe('John Doe');
  });

  test('should get all patients', async () => {
    await Patient.create({ name: 'John Doe', age: 30, address: '123 Main St', gender: 'male' });
    const res = await request(app).get('/patients');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBe(1);
  });

  test('should get a patient by id', async () => {
    const patient = await Patient.create({ name: 'John Doe', age: 30, address: '123 Main St', gender: 'male' });
    const res = await request(app).get(`/patients/${patient._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.name).toBe('John Doe');
  });

  test('should update a patient by id', async () => {
    const patient = await Patient.create({ name: 'John Doe', age: 30, address: '123 Main St', gender: 'male' });
    const res = await request(app)
      .put(`/patients/${patient._id}`)
      .send({ name: 'Jane Doe', gender: 'female' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.name).toBe('Jane Doe');
  });

  test('should delete a patient by id', async () => {
    const patient = await Patient.create({ name: 'John Doe', age: 30, address: '123 Main St', gender: 'male' });
    const res = await request(app).delete(`/patients/${patient._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Patient deleted successfully');
  });
});
