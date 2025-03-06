import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';
import Register from './Register';
import Login from './Login';

const socket = io('http://localhost:3000'); // Adjust the URL as needed

const App = () => {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [formData, setFormData] = useState({ name: '', age: '', gender: '', contactInfo: '', medicalHistory: '' });
  const [appointmentData, setAppointmentData] = useState({ patient: '', doctor: '', date: '', reason: '' });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (token) {
      fetchPatients();
      fetchAppointments();

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
    }
  }, [token]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/patients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/appointments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAppointmentChange = (e) => {
    const { name, value } = e.target;
    setAppointmentData({ ...appointmentData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`/api/patients/${editId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEditMode(false);
        setEditId(null);
      } else {
        await axios.post('/api/patients', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchPatients();
      setFormData({ name: '', age: '', gender: '', contactInfo: '', medicalHistory: '' });
    } catch (error) {
      console.error('Error adding/updating patient:', error);
    }
  };

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/appointments', appointmentData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAppointments();
      setAppointmentData({ patient: '', doctor: '', date: '', reason: '' });
    } catch (error) {
      console.error('Error adding appointment:', error);
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
      await axios.delete(`/api/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      setToken(response.data.token);
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Router>
      <div>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/register">Register</Link>
          <Link to="/login">Login</Link>
        </nav>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="/" element={
            !token ? (
              <div>
                <p>Please login to access the dashboard.</p>
                <Link to="/login">Login</Link>
              </div>
            ) : (
              <>
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
                <h2>Appointments</h2>
                <form onSubmit={handleAppointmentSubmit}>
                  <select name="patient" value={appointmentData.patient} onChange={handleAppointmentChange} required>
                    <option value="">Select Patient</option>
                    {patients.map((patient) => (
                      <option key={patient._id} value={patient._id}>{patient.name}</option>
                    ))}
                  </select>
                  <input type="text" name="doctor" placeholder="Doctor" value={appointmentData.doctor} onChange={handleAppointmentChange} required />
                  <input type="datetime-local" name="date" value={appointmentData.date} onChange={handleAppointmentChange} required />
                  <input type="text" name="reason" placeholder="Reason" value={appointmentData.reason} onChange={handleAppointmentChange} required />
                  <button type="submit">Add Appointment</button>
                </form>
                {loading ? (
                  <p>Loading...</p>
                ) : (
                  <>
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
                    <h2>Appointment List</h2>
                    <table>
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Doctor</th>
                          <th>Date</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((appointment) => (
                          <tr key={appointment._id}>
                            <td>{appointment.patient.name}</td>
                            <td>{appointment.doctor.username}</td>
                            <td>{new Date(appointment.date).toLocaleString()}</td>
                            <td>{appointment.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
