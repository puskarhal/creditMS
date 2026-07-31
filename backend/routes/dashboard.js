const express = require('express');
const { pool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/dashboard/stats?school_id=1
// Every number here is a live aggregate query — nothing hardcoded.
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.user.school_id;
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);

    const [[{ totalStudents }]] = await pool.query(
      'SELECT COUNT(*) AS totalStudents FROM students WHERE school_id = ?', [schoolId]);

    const [[{ studentsThisMonth }]] = await pool.query(
      'SELECT COUNT(*) AS studentsThisMonth FROM students WHERE school_id = ? AND created_at >= ?',
      [schoolId, monthStartStr]);

    const [[{ creditsIssued }]] = await pool.query(
      'SELECT COALESCE(SUM(points),0) AS creditsIssued FROM credits WHERE school_id = ?', [schoolId]);

    const [[{ creditsThisMonth }]] = await pool.query(
      'SELECT COALESCE(SUM(points),0) AS creditsThisMonth FROM credits WHERE school_id = ? AND created_at >= ?',
      [schoolId, monthStartStr]);

    const [[{ rewardsRedeemed }]] = await pool.query(
      "SELECT COUNT(*) AS rewardsRedeemed FROM reward_redemptions WHERE school_id = ?", [schoolId]);

    const [[{ rewardsThisMonth }]] = await pool.query(
      "SELECT COUNT(*) AS rewardsThisMonth FROM reward_redemptions WHERE school_id = ? AND created_at >= ?",
      [schoolId, monthStartStr]);

    const [[{ activeTeachers }]] = await pool.query(
      "SELECT COUNT(*) AS activeTeachers FROM users WHERE school_id = ? AND role='teacher' AND is_active=1",
      [schoolId]);

    const [[{ teachersThisMonth }]] = await pool.query(
      "SELECT COUNT(*) AS teachersThisMonth FROM users WHERE school_id = ? AND role='teacher' AND created_at >= ?",
      [schoolId, monthStartStr]);

    res.json({
      totalStudents, studentsThisMonth,
      creditsIssued, creditsThisMonth,
      rewardsRedeemed, rewardsThisMonth,
      activeTeachers, teachersThisMonth
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
});

// GET /api/dashboard/house-leaderboard?school_id=1
router.get('/house-leaderboard', requireAuth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.user.school_id;
    const [rows] = await pool.query(
      `SELECT h.id, h.name, h.color_hex,
              COALESCE(SUM(c.points),0) AS total_points
       FROM houses h
       LEFT JOIN students s ON s.house_id = h.id
       LEFT JOIN credits c ON c.student_id = s.id
       WHERE h.school_id = ?
       GROUP BY h.id, h.name, h.color_hex
       ORDER BY total_points DESC`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load house leaderboard' });
  }
});

// GET /api/dashboard/credit-trend?school_id=1&months=6
router.get('/credit-trend', requireAuth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.user.school_id;
    const months = Number(req.query.months) || 6;
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym,
              DATE_FORMAT(created_at, '%b') AS month_label,
              COALESCE(SUM(points),0) AS total_points
       FROM credits
       WHERE school_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY ym, month_label
       ORDER BY ym ASC`,
      [schoolId, months]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load credit trend' });
  }
});

// GET /api/dashboard/recent-activity?school_id=1&limit=10
router.get('/recent-activity', requireAuth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.user.school_id;
    const limit = Number(req.query.limit) || 10;
    const [rows] = await pool.query(
      `SELECT c.id, u.name AS student_name, cat.name AS category, c.points, c.note, c.created_at
       FROM credits c
       JOIN students s ON s.id = c.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN credit_categories cat ON cat.id = c.category_id
       WHERE c.school_id = ?
       ORDER BY c.created_at DESC
       LIMIT ?`,
      [schoolId, limit]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load recent activity' });
  }
});

module.exports = router;
