import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import pool, { query } from './src/lib/database.js';

async function testDB() {
  try {
    const res = await query('SELECT NOW()');
    console.log('✓ Database connected! Current time:', res.rows[0]);
  } catch (err) {
    console.error('✗ DB connection failed:', err.message);
  } finally {
    await pool.end();
  }
}

testDB();
