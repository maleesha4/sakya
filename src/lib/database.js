// src/lib/database.js
import pkg from 'pg';
const { Pool } = pkg;

console.log('Creating pool with DATABASE_URL =', process.env.DATABASE_URL ? 'SET' : 'MISSING');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // For Neon: Let URL handle SSL; no override needed
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000, // 10 second timeout for acquiring connection
  idleTimeoutMillis: 240000, // 4 minutes (before Neon's 5 minute idle timeout)
  max: 20, // Max pool size
  statement_timeout: 30000, // 30 second timeout for queries
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function getExamById(id) {
  const result = await query('SELECT * FROM exams WHERE id = $1', [id]);
  return result.rows[0];
}

export default pool;