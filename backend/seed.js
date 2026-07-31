/**
 * One-time setup script.
 * Run with: npm run seed
 * Creates tables (if not present), a demo school, houses, an admin login,
 * a couple of teachers/students, and a few real transactions so the
 * dashboard has live numbers to show immediately after deploy.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true
  });

  console.log('Connected. Running schema.sql ...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await connection.query(schema);

  await connection.changeUser({ database: process.env.DB_NAME });

  // --- Admin user ---
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const [adminExists] = await connection.query('SELECT id FROM users WHERE email = ?', ['admin@greenfield.edu']);
  let adminId;
  if (adminExists.length === 0) {
    const [r] = await connection.query(
      "INSERT INTO users (school_id, name, email, password_hash, role) VALUES (1,?,?,?,'admin')",
      ['Admin User', 'admin@greenfield.edu', adminHash]
    );
    adminId = r.insertId;
  } else adminId = adminExists[0].id;

  // --- Teacher ---
  const teacherHash = await bcrypt.hash('Teacher@123', 10);
  const [teacherExists] = await connection.query('SELECT id FROM users WHERE email = ?', ['sharma@greenfield.edu']);
  let teacherId;
  if (teacherExists.length === 0) {
    const [r] = await connection.query(
      "INSERT INTO users (school_id, name, email, password_hash, role) VALUES (1,?,?,?,'teacher')",
      ['Mrs. Sharma', 'sharma@greenfield.edu', teacherHash]
    );
    teacherId = r.insertId;
  } else teacherId = teacherExists[0].id;

  // --- Credit categories ---
  const categories = ['Discipline in Class', 'Helped Friend', '100% Attendance', 'Extra Curricular'];
  for (const name of categories) {
    const [exists] = await connection.query('SELECT id FROM credit_categories WHERE school_id=1 AND name=?', [name]);
    if (exists.length === 0) {
      await connection.query("INSERT INTO credit_categories (school_id, name, default_points, icon) VALUES (1,?,10,'star')", [name]);
    }
  }
  const [catRows] = await connection.query('SELECT id, name FROM credit_categories WHERE school_id=1');

  // --- Demo student: Aarav ---
  const studentHash = await bcrypt.hash('Student@123', 10);
  const [houseRows] = await connection.query('SELECT id FROM houses WHERE school_id=1 ORDER BY id LIMIT 1');
  const houseId = houseRows[0]?.id || null;

  const [studentExists] = await connection.query('SELECT id FROM users WHERE email = ?', ['aarav@greenfield.edu']);
  let studentUserId, studentId;
  if (studentExists.length === 0) {
    const [r] = await connection.query(
      "INSERT INTO users (school_id, name, email, password_hash, role) VALUES (1,?,?,?,'student')",
      ['Aarav Mehta', 'aarav@greenfield.edu', studentHash]
    );
    studentUserId = r.insertId;
    const [sr] = await connection.query(
      "INSERT INTO students (user_id, school_id, house_id, class_name, roll_no) VALUES (?,1,?, 'Grade 8', '23')",
      [studentUserId, houseId]
    );
    studentId = sr.insertId;

    // Give Aarav a few real credit transactions
    for (const cat of catRows) {
      await connection.query(
        'INSERT INTO credits (school_id, student_id, category_id, awarded_by, points, note) VALUES (1,?,?,?,?,?)',
        [studentId, cat.id, teacherId, 10, `Awarded for ${cat.name}`]
      );
    }
    await connection.query('UPDATE students SET total_credits = 40 WHERE id = ?', [studentId]);
  }

  // --- A reward ---
  const [rewardExists] = await connection.query("SELECT id FROM rewards WHERE school_id=1 AND name='Extra Library Pass'");
  if (rewardExists.length === 0) {
    await connection.query(
      "INSERT INTO rewards (school_id, name, description, points_required, stock) VALUES (1,'Extra Library Pass','One extra book checkout per week',30,50)"
    );
  }

  // --- Platform marketing setting (editable, not hardcoded in frontend) ---
  const [satExists] = await connection.query("SELECT setting_key FROM platform_settings WHERE setting_key='teacher_satisfaction_pct'");
  if (satExists.length === 0) {
    await connection.query("INSERT INTO platform_settings (setting_key, setting_value) VALUES ('teacher_satisfaction_pct','95')");
  }

  // --- Pricing plans (editable via DB, not hardcoded in the frontend) ---
  const [planExists] = await connection.query('SELECT id FROM pricing_plans LIMIT 1');
  if (planExists.length === 0) {
    const plans = [
      {
        name: 'Starter', price: 'Rs 999/month', note: 'Billed annually, per school',
        features: ['Up to 10 teachers', 'Up to 200 students', 'Admin web portal', 'Teacher, Student & Parent apps', 'Email support'],
        highlighted: 0, order: 1
      },
      {
        name: 'Professional', price: 'Rs 2,999/month', note: 'Billed annually, per school',
        features: ['Up to 50 teachers', 'Up to 1,500 students', 'Everything in Starter', 'AI analytics & reports', 'Reward marketplace', 'Priority WhatsApp support'],
        highlighted: 1, order: 2
      },
      {
        name: 'Enterprise', price: 'Custom Pricing', note: 'For large schools & groups',
        features: ['Unlimited teachers & students', 'Everything in Professional', 'Multi-branch / group dashboard', 'Dedicated onboarding & training', 'Custom integrations'],
        highlighted: 0, order: 3
      }
    ];
    for (const p of plans) {
      await connection.query(
        "INSERT INTO pricing_plans (plan_name, price_label, billing_note, features_json, is_highlighted, sort_order) VALUES (?,?,?,?,?,?)",
        [p.name, p.price, p.note, JSON.stringify(p.features), p.highlighted, p.order]
      );
    }
  }

  console.log('✅ Seed complete.');
  console.log('   demo_requests and pilot_requests tables are ready to receive live form submissions from the homepage.');
  console.log('   Admin login:   admin@greenfield.edu / Admin@123');
  console.log('   Teacher login: sharma@greenfield.edu / Teacher@123');
  console.log('   Student login: aarav@greenfield.edu / Student@123');
  await connection.end();
}

run().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
