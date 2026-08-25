// ============================================
// FILE: app/api/student/exams/[examId]/subjects/route.js
// ============================================
import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../../../lib/auth';
import { query } from '../../../../../../lib/database';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

export async function GET(request, { params }) {
  try {
    // Extract token preferring Authorization header, fallback to cookie
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

    // Await params (Next.js 15+ dynamic params are Promises)
    const { examId } = await params;

    if (!examId) {
      return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 });
    }

    console.log('Fetching subjects for user ID:', user.id, 'exam ID:', examId);

    // Get student's current grade with improved query
    const studentResult = await query(
      `SELECT s.id, s.grade_id AS current_grade_id 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE u.id = $1 AND u.status = 'active'`,
      [user.id]
    );

    console.log('Student query result:', studentResult.rows);

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const gradeId = studentResult.rows[0].current_grade_id;

    console.log('Student grade ID:', gradeId);

    // Check if exam exists and matches student's grade
    const examCheck = await query(
      'SELECT id, grade_id, exam_name FROM admin_exams WHERE id = $1',
      [examId]
    );

    console.log('Exam check result:', examCheck.rows);

    if (examCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (examCheck.rows[0].grade_id !== gradeId) {
      return NextResponse.json({ error: 'Exam not for your grade' }, { status: 403 });
    }

    // Get subjects for the exam with schedule details
    const result = await query(`
      SELECT 
        s.id,
        s.name,
        aes.exam_date,
        aes.start_time,
        aes.end_time
      FROM admin_exam_subjects aes
      JOIN subjects s ON aes.subject_id = s.id
      WHERE aes.admin_exam_id = $1
      ORDER BY aes.exam_date, aes.start_time
    `, [examId]);

    console.log('Subjects query result:', result.rows);

    return NextResponse.json({ subjects: result.rows });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}