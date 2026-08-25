// ============================================
// FILE: src/app/api/student/exams/available/route.js
// ============================================
import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../../lib/auth';
import { query } from '../../../../../lib/database';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

export async function GET(request) {
  try {
    // Extract token preferring Authorization header (sent by client fetches), fallback to cookie
    const authHeader = (await headers()).get('authorization');
    let token;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const cookieStore = await cookies();
      token = cookieStore.get('auth_token')?.value;
    }

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = verifyToken(token);

    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student info
    const studentResult = await query(
      'SELECT s.id, s.grade_id AS current_grade_id FROM students s JOIN users u ON s.user_id = u.id WHERE u.id = $1',
      [user.id]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const student = studentResult.rows[0];
    console.log('Student grade ID:', student.current_grade_id); // Debug: log student's grade

    // TEMP DEBUG: Log ALL exams for this grade (ignore status/date for now)
    const allExamsResult = await query(`
      SELECT 
        ae.id, ae.exam_name, ae.grade_id, g.grade_name, ae.exam_date,
        ae.registration_start_date, ae.registration_end_date, ae.status,
        (NOW() AT TIME ZONE 'Asia/Colombo')::date as today_for_debug
      FROM admin_exams ae
      JOIN grades g ON ae.grade_id = g.id
      WHERE ae.grade_id = $1
      ORDER BY ae.exam_date DESC
    `, [student.current_grade_id]);
    console.log('ALL exams for this grade (debug):', allExamsResult.rows);

    // Get available exams for student's grade (only those with open registration period)
    const examsResult = await query(`
      SELECT 
        ae.id,
        ae.exam_name,
        ae.grade_id,
        g.grade_name,
        ae.exam_date,
        ae.registration_start_date,
        ae.registration_end_date,
        ae.status,
        ae.description,
        COUNT(DISTINCT aes.subject_id) as subject_count
      FROM admin_exams ae
      JOIN grades g ON ae.grade_id = g.id
      LEFT JOIN admin_exam_subjects aes ON ae.id = aes.admin_exam_id
      WHERE ae.grade_id = $1
        AND ae.status = 'registration_open'
        AND ae.registration_start_date <= (NOW() AT TIME ZONE 'Asia/Colombo')::date
        AND ae.registration_end_date >= (NOW() AT TIME ZONE 'Asia/Colombo')::date
      GROUP BY 
        ae.id, 
        ae.exam_name, 
        ae.grade_id, 
        g.grade_name, 
        ae.exam_date, 
        ae.registration_start_date, 
        ae.registration_end_date, 
        ae.status, 
        ae.description
      ORDER BY ae.exam_date DESC
    `, [student.current_grade_id]);

    console.log('Available exams query result:', examsResult.rows); // Debug log

    return NextResponse.json({ exams: examsResult.rows });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}