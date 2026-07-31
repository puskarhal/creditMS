const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/students?school_id=1&search=&house_id=
router.get('/', requireAuth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.user.school_id;
    const { search, house_id } = req.query;
    let sql = `SELECT s.id, u.name, u.email, s.class_name, s.roll_no, s.total_credits,
                      h.name AS house_name, h.color_hex
               FROM students s
               JOIN users u ON u.id = s.user_id
               LEFT JOIN houses h ON h.id = s.house_id
               WHERE s.school_id = ?`;
    const params = [schoolId];
    if (search) { sql += ' AND (u.name LIKE ? OR s.roll_no LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (house_id) { sql += ' AND s.house_id = ?'; params.push(house_id); }
    sql += ' ORDER BY s.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load students' });
  }
});

// POST /api/students  (creates linked user + student record)
router.post('/', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { name, email, class_name, roll_no, house_id, parent_id, password } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

    await conn.beginTransaction();
    const hash = await bcrypt.hash(password || 'Student@123', 10);
    const [userResult] = await conn.query(
      "INSERT INTO users (school_id, name, email, password_hash, role) VALUES (?,?,?,?,'student')",
      [req.user.school_id, name, email, hash]
    );
    const [studentResult] = await conn.query(
      'INSERT INTO students (user_id, school_id, house_id, parent_id, class_name, roll_no) VALUES (?,?,?,?,?,?)',
      [userResult.insertId, req.user.school_id, house_id || null, parent_id || null, class_name || null, roll_no || null]
    );
    await conn.commit();
    res.status(201).json({ id: studentResult.insertId, user_id: userResult.insertId, name, email });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to create student' });
  } finally {
    conn.release();
  }
});

// PUT /api/students/:id
router.put('/:id', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { class_name, roll_no, house_id } = req.body;
    await pool.query(
      'UPDATE students SET class_name=?, roll_no=?, house_id=? WHERE id=? AND school_id=?',
      [class_name, roll_no, house_id, req.params.id, req.user.school_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [[student]] = await pool.query('SELECT user_id FROM students WHERE id=? AND school_id=?', [req.params.id, req.user.school_id]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    await pool.query('DELETE FROM students WHERE id=?', [req.params.id]);
    await pool.query('DELETE FROM users WHERE id=?', [student.user_id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// GET /api/students/:id/credits  -> full history for the student ledger
router.get('/:id/credits', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, cat.name AS category, c.points, c.note, c.created_at, u.name AS awarded_by
       FROM credits c
       LEFT JOIN credit_categories cat ON cat.id = c.category_id
       LEFT JOIN users u ON u.id = c.awarded_by
       WHERE c.student_id = ?
       ORDER BY c.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load student credit history' });
  }
});

module.exports = router;
