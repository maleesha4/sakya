import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/database';

export async function GET() {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'tutor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Tutor user ID:', decoded.id);
    }

    // Get all active grades
    const gradesResult = await query(
      `SELECT id, grade_name, year, status
      FROM grades
      WHERE status = 'active'
      ORDER BY year ASC`
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('Grades fetched:', gradesResult.rows.length);
    }

    return NextResponse.json({ grades: gradesResult.rows });
  } catch (error) {
    console.error('Error fetching grades:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}