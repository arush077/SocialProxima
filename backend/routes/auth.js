const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, JWT_SECRET, { expiresIn: '30d' });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    photo: user.photo,
    bio: user.bio,
    interests: user.interests,
    discoveryEnabled: user.discoveryEnabled,
  };
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: 'email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: normalizedEmail, passwordHash });

  return res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
    '+passwordHash'
  );
  if (!user) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  return res.json({ token: signToken(user._id), user: publicUser(user) });
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }
  return res.json(publicUser(user));
});

module.exports = router;
