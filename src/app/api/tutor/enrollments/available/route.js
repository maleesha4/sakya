// app/api/tutor/enrollments/available/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth';
import { query } from '../../../../../lib/database';

export async function GET(req) {
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
      console.log('Tutor user ID for available students:', decoded.id);
    }

    // Fetch tutor_id first
    const tutorRes = await query('SELECT id FROM tutors WHERE user_id = $1', [decoded.id]);
    const tutorId = tutorRes.rows[0]?.id;
    if (!tutorId) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    const url = new URL(req.url);
    const name = url.searchParams.get('name') || '';
    const grade = url.searchParams.get('grade') || '';

    let params = [tutorId];  // Use tutorId for subquery
    let whereClause = 'WHERE s.id NOT IN (SELECT student_id FROM enrollments WHERE status = \'active\' AND tutor_id = $1) AND u.status = \'active\'';
    let orderBy = 'ORDER BY u.full_name ASC';

    let paramIndex = 2;
    if (name) {
      whereClause += ` AND u.full_name ILIKE $${paramIndex++}`;
      params.push(`%${name}%`);
    }

    if (grade) {
      whereClause += ` AND g.year = $${paramIndex++}`;
      params.push(grade);
    }

    const result = await query(
      `SELECT s.id, u.full_name, g.grade_name
       FROM students s
       JOIN users u ON u.id = s.user_id
       JOIN grades g ON s.grade_id = g.id
       ${whereClause}
       ${orderBy}`,
      params
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('Available students count:', result.rows.length);
    }

    return NextResponse.json({ students: result.rows });
  } catch (error) {
    console.error('Error fetching available students:', error);
    return NextResponse.json({ students: [] }, { status: 200 });  // Empty fallback, no 500 block
  }
}