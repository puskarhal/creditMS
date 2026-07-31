const express = require('express');
const { pool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// All lead-management routes require an admin (ESPL staff) login.
router.use(requireAuth, requireRole('admin'));

// GET /api/leads/summary — counts for the admin overview
router.get('/summary', async (req, res) => {
  try {
    const [[{ totalDemo }]] = await pool.query('SELECT COUNT(*) AS totalDemo FROM demo_requests');
    const [[{ newDemo }]] = await pool.query("SELECT COUNT(*) AS newDemo FROM demo_requests WHERE status='new'");
    const [[{ totalPilot }]] = await pool.query('SELECT COUNT(*) AS totalPilot FROM pilot_requests');
    const [[{ newPilot }]] = await pool.query("SELECT COUNT(*) AS newPilot FROM pilot_requests WHERE status='new'");
    res.json({ totalDemo, newDemo, totalPilot, newPilot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load leads summary' });
  }
});

// GET /api/leads/demo-requests
router.get('/demo-requests', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM demo_requests ORDER BY created_at DESC');
  res.json(rows);
});

// PUT /api/leads/demo-requests/:id/status
router.put('/demo-requests/:id/status', async (req, res) => {
  const { status, admin_notes } = req.body;
  await pool.query('UPDATE demo_requests SET status=?, admin_notes=? WHERE id=?', [status, admin_notes || null, req.params.id]);
  res.json({ success: true });
});

// GET /api/leads/pilot-requests
router.get('/pilot-requests', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM pilot_requests ORDER BY created_at DESC');
  res.json(rows);
});

// PUT /api/leads/pilot-requests/:id/status
router.put('/pilot-requests/:id/status', async (req, res) => {
  const { status, admin_notes } = req.body;
  await pool.query('UPDATE pilot_requests SET status=?, admin_notes=? WHERE id=?', [status, admin_notes || null, req.params.id]);
  res.json({ success: true });
});

module.exports = router;
