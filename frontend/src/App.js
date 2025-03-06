import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({ name: '', age: '', gender: '', contactInfo: '', medicalHistory: '' });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await axios.get('/api/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/patients', formData);
      fetchPatients();
      setFormData({ name: '', age: '', gender: '', contactInfo: '', medicalHistory: '' });
    } catch (error) {
      console.error('Error adding patient:', error);
    }
  };

  return (
    <div>
      <h1>Patient Dashboard</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleInputChange} required />
        <input type="number" name="age" placeholder="Age" value={formData.age} onChange={handleInputChange} required />
        <input type="text" name="gender" placeholder="Gender" value={formData.gender} onChange={handleInputChange} required />
        <input type="text" name="contactInfo" placeholder="Contact Info" value={formData.contactInfo} onChange={handleInputChange} />
        <input type="text" name="medicalHistory" placeholder="Medical History" value={formData.medicalHistory} onChange={handleInputChange} />
        <button type="submit">Add Patient</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
            <th>Gender</th>
            <th>Contact Info</th>
            <th>Medical History</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient._id}>
              <td>{patient.name}</td>
              <td>{patient.age}</td>
              <td>{patient.gender}</td>
              <td>{patient.contactInfo}</td>
              <td>{patient.medicalHistory.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
