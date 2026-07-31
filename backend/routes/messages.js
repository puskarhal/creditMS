const express = require('express');
const { pool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/messages/summary  (admin only) — counts for the dashboard
router.get('/summary', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [[{ totalMessages }]] = await pool.query('SELECT COUNT(*) AS totalMessages FROM contact_messages');
    const [[{ newMessages }]] = await pool.query("SELECT COUNT(*) AS newMessages FROM contact_messages WHERE status='new'");
    res.json({ totalMessages, newMessages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load message summary' });
  }
});

// GET /api/messages?status=new  (admin only)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM contact_messages WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load contact messages' });
  }
});

// PUT /api/messages/:id/status  (admin only)
router.put('/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'contacted', 'resolved'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await pool.query('UPDATE contact_messages SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

module.exports = router;
