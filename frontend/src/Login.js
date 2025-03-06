import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ setToken }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isAdmin ? '/api/auth/admin-login' : '/api/auth/login';
      const response = await axios.post(url, formData);
      setToken(response.data.token);
    } catch (error) {
      setMessage('Error logging in: ' + error.response.data.error);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleInputChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />
        <label>
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={() => setIsAdmin(!isAdmin)}
          />
          Login as Admin
        </label>
        <button type="submit">Login</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Login;
