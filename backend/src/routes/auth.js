const express = require('express');
const bcrypt = require('bcryptjs');
const { runAsync, getAsync } = require('../db');
const { generateToken } = require('../auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email, and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await getAsync('SELECT user_id FROM Users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const result = await runAsync('INSERT INTO Users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
    const user = { user_id: result.lastID, name, email };

    await runAsync('INSERT INTO Budgets (user_id, weekly_limit, monthly_limit) VALUES (?, ?, ?)', [user.user_id, 5000, 20000]);

    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user.user_id, name, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });

    const user = await getAsync('SELECT * FROM Users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ token, user: { id: user.user_id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
