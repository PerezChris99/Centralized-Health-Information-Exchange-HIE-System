import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3000'); // Adjust the URL as needed

const App = () => {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({ name: '', age: '', gender: '', contactInfo: '', medicalHistory: '' });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPatients();

    socket.on('patientAdded', (newPatient) => {
      setPatients((prevPatients) => [...prevPatients, newPatient]);
    });

    socket.on('patientUpdated', (updatedPatient) => {
      setPatients((prevPatients) =>
        prevPatients.map((patient) => (patient._id === updatedPatient._id ? updatedPatient : patient))
      );
    });

    socket.on('patientDeleted', (deletedPatientId) => {
      setPatients((prevPatients) => prevPatients.filter((patient) => patient._id !== deletedPatientId));
    });

    return () => {
      socket.off('patientAdded');
      socket.off('patientUpdated');
      socket.off('patientDeleted');
    };
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`/api/patients/${editId}`, formData);
        setEditMode(false);
        setEditId(null);
      } else {
        await axios.post('/api/patients', formData);
      }
      fetchPatients();
      setFormData({ name: '', age: '', gender: '', contactInfo: '', medicalHistory: '' });
    } catch (error) {
      console.error('Error adding/updating patient:', error);
    }
  };

  const handleEdit = (patient) => {
    setFormData({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      contactInfo: patient.contactInfo,
      medicalHistory: patient.medicalHistory.join(', '),
    });
    setEditMode(true);
    setEditId(patient._id);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/patients/${id}`);
      fetchPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h1>Patient Dashboard</h1>
      <input
        type="text"
        placeholder="Search patients..."
        value={searchTerm}
        onChange={handleSearch}
        style={{ marginBottom: '20px', padding: '10px', width: '100%', maxWidth: '400px' }}
      />
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleInputChange} required />
        <input type="number" name="age" placeholder="Age" value={formData.age} onChange={handleInputChange} required />
        <input type="text" name="gender" placeholder="Gender" value={formData.gender} onChange={handleInputChange} required />
        <input type="text" name="contactInfo" placeholder="Contact Info" value={formData.contactInfo} onChange={handleInputChange} />
        <input type="text" name="medicalHistory" placeholder="Medical History" value={formData.medicalHistory} onChange={handleInputChange} />
        <button type="submit">{editMode ? 'Update Patient' : 'Add Patient'}</button>
      </form>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Contact Info</th>
              <th>Medical History</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((patient) => (
              <tr key={patient._id}>
                <td>{patient.name}</td>
                <td>{patient.age}</td>
                <td>{patient.gender}</td>
                <td>{patient.contactInfo}</td>
                <td>{patient.medicalHistory.join(', ')}</td>
                <td>
                  <button onClick={() => handleEdit(patient)}>Edit</button>
                  <button onClick={() => handleDelete(patient._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default App;
