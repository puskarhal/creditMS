const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// ---- API routes ----
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/students', require('./routes/students'));
app.use('/api/credits', require('./routes/credits'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/houses', require('./routes/houses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/analytics', require('./routes/reports')); // shares report queries
app.use('/api/public', require('./routes/public'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/messages', require('./routes/messages'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---- Serve the frontend (static site + dashboard app) ----
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 CREDIT server running on http://localhost:${PORT}`);
  await testConnection();
});
