// app/api/subjects/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export async function GET() {
  try {
    const result = await query(
      'SELECT id, subject_name AS name FROM subjects ORDER BY subject_name ASC'
    );

    return NextResponse.json({ subjects: result.rows });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}