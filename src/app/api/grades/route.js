// ============================================
// FILE: app/api/grades/route.js
// ============================================
import { NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export async function GET() {
  try {
    const result = await query('SELECT id, grade_name FROM grades WHERE status = \'active\' ORDER BY year');
    return NextResponse.json({ grades: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}