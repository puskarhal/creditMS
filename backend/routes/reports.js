const express = require('express');
const { pool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/reports/top-students?school_id=1&limit=10
router.get('/top-students', requireAuth, async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  const limit = Number(req.query.limit) || 10;
  const [rows] = await pool.query(
    `SELECT u.name, s.class_name, s.total_credits, h.name AS house_name
     FROM students s JOIN users u ON u.id = s.user_id
     LEFT JOIN houses h ON h.id = s.house_id
     WHERE s.school_id = ? ORDER BY s.total_credits DESC LIMIT ?`,
    [schoolId, limit]
  );
  res.json(rows);
});

// GET /api/reports/category-breakdown?school_id=1
router.get('/category-breakdown', requireAuth, async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  const [rows] = await pool.query(
    `SELECT COALESCE(cat.name,'Uncategorized') AS category, COUNT(*) AS entries, SUM(c.points) AS total_points
     FROM credits c LEFT JOIN credit_categories cat ON cat.id = c.category_id
     WHERE c.school_id = ? GROUP BY cat.name ORDER BY total_points DESC`,
    [schoolId]
  );
  res.json(rows);
});

// GET /api/analytics/teacher-activity?school_id=1
router.get('/teacher-activity', requireAuth, async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  const [rows] = await pool.query(
    `SELECT u.name AS teacher_name, COUNT(c.id) AS credits_awarded, COALESCE(SUM(c.points),0) AS total_points
     FROM users u LEFT JOIN credits c ON c.awarded_by = u.id
     WHERE u.school_id = ? AND u.role='teacher'
     GROUP BY u.id, u.name ORDER BY total_points DESC`,
    [schoolId]
  );
  res.json(rows);
});

// GET /api/analytics/attendance-rate?school_id=1
router.get('/attendance-rate', requireAuth, async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  const [rows] = await pool.query(
    `SELECT ROUND(100 * SUM(a.status='present') / COUNT(*), 1) AS attendance_rate
     FROM attendance a JOIN students s ON s.id = a.student_id
     WHERE s.school_id = ?`,
    [schoolId]
  );
  res.json(rows[0] || { attendance_rate: null });
});

module.exports = router;
