const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/users?school_id=1&role=teacher
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  const { role } = req.query;
  let sql = 'SELECT id, name, email, role, is_active, created_at FROM users WHERE school_id = ?';
  const params = [schoolId];
  if (role) { sql += ' AND role = ?'; params.push(role); }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// PUT /api/users/:id/status  (activate/deactivate)
router.put('/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  const { is_active } = req.body;
  await pool.query('UPDATE users SET is_active=? WHERE id=? AND school_id=?', [is_active ? 1 : 0, req.params.id, req.user.school_id]);
  res.json({ success: true });
});

// DELETE /api/users/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM users WHERE id=? AND school_id=?', [req.params.id, req.user.school_id]);
  res.json({ success: true });
});

module.exports = router;
