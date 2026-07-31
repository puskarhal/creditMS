const express = require('express');
const { pool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/rewards?school_id=1
router.get('/', requireAuth, async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  const [rows] = await pool.query('SELECT * FROM rewards WHERE school_id = ? AND is_active = 1 ORDER BY points_required', [schoolId]);
  res.json(rows);
});

// POST /api/rewards (admin adds a reward to the catalog)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, description, points_required, stock } = req.body;
  if (!name || !points_required) return res.status(400).json({ error: 'name and points_required are required' });
  const [result] = await pool.query(
    'INSERT INTO rewards (school_id, name, description, points_required, stock) VALUES (?,?,?,?,?)',
    [req.user.school_id, name, description || null, points_required, stock || 0]
  );
  res.status(201).json({ id: result.insertId, name, points_required, stock });
});

// PUT /api/rewards/:id
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, description, points_required, stock, is_active } = req.body;
  await pool.query(
    'UPDATE rewards SET name=?, description=?, points_required=?, stock=?, is_active=? WHERE id=? AND school_id=?',
    [name, description, points_required, stock, is_active, req.params.id, req.user.school_id]
  );
  res.json({ success: true });
});

// DELETE /api/rewards/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM rewards WHERE id=? AND school_id=?', [req.params.id, req.user.school_id]);
  res.json({ success: true });
});

// POST /api/rewards/:id/redeem  (student/parent redeems, deducts points, decrements stock)
router.post('/:id/redeem', requireAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const rewardId = req.params.id;
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });

    await conn.beginTransaction();
    const [[reward]] = await conn.query('SELECT * FROM rewards WHERE id=? AND school_id=? FOR UPDATE', [rewardId, req.user.school_id]);
    if (!reward) { await conn.rollback(); return res.status(404).json({ error: 'Reward not found' }); }
    if (reward.stock <= 0) { await conn.rollback(); return res.status(400).json({ error: 'Reward out of stock' }); }

    const [[student]] = await conn.query('SELECT * FROM students WHERE id=? FOR UPDATE', [student_id]);
    if (!student) { await conn.rollback(); return res.status(404).json({ error: 'Student not found' }); }
    if (student.total_credits < reward.points_required) {
      await conn.rollback();
      return res.status(400).json({ error: 'Not enough credit points' });
    }

    await conn.query(
      "INSERT INTO reward_redemptions (school_id, student_id, reward_id, points_used, status) VALUES (?,?,?,?,'approved')",
      [req.user.school_id, student_id, rewardId, reward.points_required]
    );
    await conn.query('UPDATE students SET total_credits = total_credits - ? WHERE id = ?', [reward.points_required, student_id]);
    await conn.query('UPDATE rewards SET stock = stock - 1 WHERE id = ?', [rewardId]);
    await conn.commit();
    res.status(201).json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to redeem reward' });
  } finally {
    conn.release();
  }
});

// GET /api/rewards/redemptions?school_id=1
router.get('/redemptions/list', requireAuth, async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  const [rows] = await pool.query(
    `SELECT rr.id, u.name AS student_name, r.name AS reward_name, rr.points_used, rr.status, rr.created_at
     FROM reward_redemptions rr
     JOIN students s ON s.id = rr.student_id
     JOIN users u ON u.id = s.user_id
     JOIN rewards r ON r.id = rr.reward_id
     WHERE rr.school_id = ?
     ORDER BY rr.created_at DESC`,
    [schoolId]
  );
  res.json(rows);
});

module.exports = router;
