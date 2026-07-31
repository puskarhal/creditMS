const express = require('express');
const { pool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/credits/categories?school_id=1
router.get('/categories', requireAuth, async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  const [rows] = await pool.query('SELECT * FROM credit_categories WHERE school_id = ? ORDER BY name', [schoolId]);
  res.json(rows);
});

// POST /api/credits/categories  (admin defines new credit types)
router.post('/categories', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, default_points, icon } = req.body;
  const [result] = await pool.query(
    'INSERT INTO credit_categories (school_id, name, default_points, icon) VALUES (?,?,?,?)',
    [req.user.school_id, name, default_points || 10, icon || 'star']
  );
  res.status(201).json({ id: result.insertId, name, default_points, icon });
});

// GET /api/credits?school_id=1&student_id=&limit=50
router.get('/', requireAuth, async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  const { student_id, limit } = req.query;
  let sql = `SELECT c.id, s.id AS student_id, u.name AS student_name, cat.name AS category,
                    c.points, c.note, c.created_at, tu.name AS awarded_by
             FROM credits c
             JOIN students s ON s.id = c.student_id
             JOIN users u ON u.id = s.user_id
             LEFT JOIN credit_categories cat ON cat.id = c.category_id
             LEFT JOIN users tu ON tu.id = c.awarded_by
             WHERE c.school_id = ?`;
  const params = [schoolId];
  if (student_id) { sql += ' AND c.student_id = ?'; params.push(student_id); }
  sql += ' ORDER BY c.created_at DESC LIMIT ?';
  params.push(Number(limit) || 100);
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// POST /api/credits  (award credit points to a student — the core teacher action)
router.post('/', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { student_id, category_id, points, note } = req.body;
    if (!student_id || !points) return res.status(400).json({ error: 'student_id and points are required' });

    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO credits (school_id, student_id, category_id, awarded_by, points, note) VALUES (?,?,?,?,?,?)',
      [req.user.school_id, student_id, category_id || null, req.user.id, points, note || null]
    );
    await conn.query('UPDATE students SET total_credits = total_credits + ? WHERE id = ?', [points, student_id]);
    await conn.commit();
    res.status(201).json({ id: result.insertId, student_id, points });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to award credit' });
  } finally {
    conn.release();
  }
});

module.exports = router;
