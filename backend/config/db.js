const mysql = require('mysql2/promise');
require('dotenv').config();

// Connection pool to the Aiven-managed MySQL instance.
// Every route in this app reads/writes through this pool — there is
// no static/mock data anywhere in the application layer.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 10000,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    console.log('✅ Connected to Aiven MySQL:', process.env.DB_HOST);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
}

module.exports = { pool, testConnection };
