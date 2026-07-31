const express = require('express');
const { pool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  const [rows] = await pool.query('SELECT * FROM houses WHERE school_id = ?', [schoolId]);
  res.json(rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, color_hex } = req.body;
  const [result] = await pool.query('INSERT INTO houses (school_id, name, color_hex) VALUES (?,?,?)', [req.user.school_id, name, color_hex || '#7c3aed']);
  res.status(201).json({ id: result.insertId, name, color_hex });
});

module.exports = router;
