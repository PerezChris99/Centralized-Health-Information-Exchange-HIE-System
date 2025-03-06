const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const user = await User.create({ username, password, role });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Predefined admin login
exports.adminLogin = async (req, res) => {
  const { username, password } = req.body;
  const predefinedAdmins = [
    { username: 'admin1', password: 'adminpassword1' },
    { username: 'admin2', password: 'adminpassword2' },
  ];

  const admin = predefinedAdmins.find(admin => admin.username === username && admin.password === password);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = jwt.sign({ username: admin.username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.status(200).json({ token });
};
