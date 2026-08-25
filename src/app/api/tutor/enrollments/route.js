// app/api/tutor/enrollments/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/database';

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
      console.log('Tutor user ID for enrollments:', decoded.id);
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

    let whereClause = 'WHERE e.tutor_id = $1 AND e.status = \'active\'';
    const params = [tutorId];  // Use tutorId

    let paramIndex = 2;
    if (name) {
      whereClause += ` AND u.full_name ILIKE $${paramIndex++}`;
      params.push(`%${name}%`);
    }

    if (grade) {
      whereClause += ` AND g.year = $${paramIndex++}`;
      params.push(grade);
    }

    const sql = `
      SELECT e.id, u.full_name as student_name, g.grade_name
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN users u ON u.id = s.user_id
      JOIN grades g ON e.grade_id = g.id
      ${whereClause}
      ORDER BY u.full_name ASC
    `;

    const result = await query(sql, params);

    return NextResponse.json({ enrollments: result.rows });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json({ enrollments: [] }, { status: 200 });  // Empty fallback
  }
}

export async function POST(req) {
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

    const body = await req.json();
    const { studentId, grade } = body;

    if (!studentId || !grade) {
      return NextResponse.json({ error: 'Student ID and grade required' }, { status: 400 });
    }

    // Get grade_id
    const gradeRes = await query('SELECT id FROM grades WHERE year = $1 AND status = $2', [grade, 'active']);
    if (gradeRes.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid grade' }, { status: 400 });
    }
    const gradeId = gradeRes.rows[0].id;

    // Get tutor_id (from tutors table)
    const tutorRes = await query('SELECT id FROM tutors WHERE user_id = $1', [decoded.id]);
    const tutorId = tutorRes.rows[0]?.id;
    if (!tutorId) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    // Get subject_id for tutor
    const subjectRes = await query('SELECT subject_id FROM tutors WHERE id = $1', [tutorId]);
    const subjectId = subjectRes.rows[0]?.subject_id;
    if (!subjectId) {
      return NextResponse.json({ error: 'Tutor subject not assigned' }, { status: 400 });
    }

    // Check if already enrolled (for this tutor, subject, grade)
    const existing = await query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND subject_id = $2 AND grade_id = $3 AND tutor_id = $4 AND status = \'active\'',
      [studentId, subjectId, gradeId, tutorId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Student already enrolled in this subject and grade' }, { status: 400 });
    }

    // Insert
    await query(
      `INSERT INTO enrollments (student_id, subject_id, tutor_id, grade_id)
       VALUES ($1, $2, $3, $4)`,
      [studentId, subjectId, tutorId, gradeId]
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`Enrolled student ${studentId} for tutor ${tutorId} in grade ${grade}`);
    }

    return NextResponse.json({ message: 'Student enrolled successfully' });
  } catch (error) {
    console.error('Error enrolling student:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}