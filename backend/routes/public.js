const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

// GET /api/public/stats — platform-wide totals for the homepage stat strip.
// Every figure is a live query against real rows (schools/students/credits/rewards).
router.get('/stats', async (req, res) => {
  try {
    const [[{ schools }]] = await pool.query('SELECT COUNT(*) AS schools FROM schools');
    const [[{ students }]] = await pool.query('SELECT COUNT(*) AS students FROM students');
    const [[{ creditsIssued }]] = await pool.query('SELECT COALESCE(SUM(points),0) AS creditsIssued FROM credits');
    const [[{ rewardsRedeemed }]] = await pool.query('SELECT COUNT(*) AS rewardsRedeemed FROM reward_redemptions');
    const [[satRow]] = await pool.query("SELECT setting_value FROM platform_settings WHERE setting_key = 'teacher_satisfaction_pct'");

    res.json({
      schools,
      students,
      creditsIssued,
      rewardsRedeemed,
      teacherSatisfactionPct: satRow ? Number(satRow.setting_value) : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load public stats' });
  }
});

// GET /api/public/demo-dashboard — read-only preview of the demo school's live
// dashboard numbers, used to populate the hero mockup on the homepage.
router.get('/demo-dashboard', async (req, res) => {
  try {
    const schoolId = 1;
    const [[{ totalStudents }]] = await pool.query('SELECT COUNT(*) AS totalStudents FROM students WHERE school_id=?', [schoolId]);
    const [[{ creditsIssued }]] = await pool.query('SELECT COALESCE(SUM(points),0) AS creditsIssued FROM credits WHERE school_id=?', [schoolId]);
    const [[{ rewardsRedeemed }]] = await pool.query('SELECT COUNT(*) AS rewardsRedeemed FROM reward_redemptions WHERE school_id=?', [schoolId]);
    const [[{ activeTeachers }]] = await pool.query("SELECT COUNT(*) AS activeTeachers FROM users WHERE school_id=? AND role='teacher' AND is_active=1", [schoolId]);
    const [houses] = await pool.query(
      `SELECT h.name, COALESCE(SUM(c.points),0) AS total_points
       FROM houses h LEFT JOIN students s ON s.house_id=h.id LEFT JOIN credits c ON c.student_id=s.id
       WHERE h.school_id=? GROUP BY h.id, h.name ORDER BY total_points DESC`, [schoolId]);

    res.json({ totalStudents, creditsIssued, rewardsRedeemed, activeTeachers, houses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load demo dashboard preview' });
  }
});

// POST /api/public/demo-request — "Book a Live Demo" form submission
router.post('/demo-request', async (req, res) => {
  try {
    const { full_name, phone, email, organization_name, address } = req.body;
    if (!full_name || !phone || !email || !organization_name || !address) {
      return res.status(400).json({ error: 'All fields are required: name, phone, email, organization, address' });
    }
    const [result] = await pool.query(
      'INSERT INTO demo_requests (full_name, phone, email, organization_name, address) VALUES (?,?,?,?,?)',
      [full_name, phone, email, organization_name, address]
    );
    res.status(201).json({ id: result.insertId, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit demo request' });
  }
});

// POST /api/public/pilot-request — "Start 45-Day Free Pilot" form submission
router.post('/pilot-request', async (req, res) => {
  try {
    const { full_name, phone, email, organization_name, address } = req.body;
    if (!full_name || !phone || !email || !organization_name || !address) {
      return res.status(400).json({ error: 'All fields are required: name, phone, email, organization, address' });
    }
    const [result] = await pool.query(
      'INSERT INTO pilot_requests (full_name, phone, email, organization_name, address) VALUES (?,?,?,?,?)',
      [full_name, phone, email, organization_name, address]
    );
    res.status(201).json({ id: result.insertId, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit pilot request' });
  }
});

// GET /api/public/pricing — live pricing plans (editable in DB, not hardcoded)
router.get('/pricing', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pricing_plans ORDER BY sort_order ASC');
    const plans = rows.map(r => ({
      id: r.id,
      name: r.plan_name,
      price: r.price_label,
      note: r.billing_note,
      features: JSON.parse(r.features_json),
      highlighted: !!r.is_highlighted
    }));
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load pricing plans' });
  }
});

// GET /api/public/reward-samples — a live sample of the demo school's reward
// catalog, used on the homepage "Reward Marketplace" showcase.
router.get('/reward-samples', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT name, description, points_required FROM rewards WHERE school_id = 1 AND is_active = 1 ORDER BY points_required LIMIT 9'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load reward samples' });
  }
});

// POST /api/public/contact — general Contact page submission
router.post('/contact', async (req, res) => {
  try {
    const { school_name, contact_person, designation, email, phone, student_count, city_state, message } = req.body;
    if (!school_name || !contact_person || !email || !phone) {
      return res.status(400).json({ error: 'School name, contact person, email, and phone are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO contact_messages (school_name, contact_person, designation, email, phone, student_count, city_state, message) VALUES (?,?,?,?,?,?,?,?)',
      [school_name, contact_person, designation || null, email, phone, student_count || null, city_state || null, message || null]
    );
    res.status(201).json({ id: result.insertId, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit contact message' });
  }
});

module.exports = router;
