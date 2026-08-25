// ============================================
// FILE: app/api/student/exams/[examId]/route.js
// ============================================
import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../../lib/auth';
import { query } from '../../../../../lib/database';
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

    console.log('Fetching exam for user ID:', user.id, 'exam ID:', examId);

    // Get student ID and grade with improved query
    const studentResult = await query(
      `SELECT s.id, s.grade_id AS current_grade_id, s.user_id, u.full_name, u.email
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE u.id = $1 AND u.status = 'active'`,
      [user.id]
    );

    console.log('Student query result:', studentResult.rows);

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const studentId = studentResult.rows[0].id;
    const gradeId = studentResult.rows[0].current_grade_id;

    console.log('Student ID:', studentId, 'Grade ID:', gradeId);

    // Get exam details
    const examResult = await query(`
      SELECT 
        ae.id,
        ae.exam_name,
        ae.grade_id,
        g.grade_name,
        ae.exam_date,
        ae.registration_start_date,
        ae.registration_end_date,
        ae.status,
        ae.description
      FROM admin_exams ae
      JOIN grades g ON ae.grade_id = g.id
      WHERE ae.id = $1
    `, [examId]);

    console.log('Exam query result:', examResult.rows);

    if (examResult.rows.length === 0) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const exam = examResult.rows[0];

    // Verify exam is for student's grade
    if (exam.grade_id !== gradeId) {
      return NextResponse.json({ error: 'Exam not for your grade' }, { status: 403 });
    }

    // Check if student is registered for this exam
    const registrationResult = await query(`
      SELECT 
        aer.id as registration_id,
        aer.admission_number,
        aer.registration_date,
        aer.status,
        u.full_name as student_name,
        u.email as student_email
      FROM admin_exam_registrations aer
      JOIN students s ON aer.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE aer.admin_exam_id = $1 AND aer.student_id = $2
    `, [examId, studentId]);

    let registration = null;
    let subject_schedule = [];

    if (registrationResult.rows.length > 0) {
      registration = registrationResult.rows[0];

      // Get subject schedule with dates and times
      const subjectsResult = await query(`
        SELECT 
          s.id as subject_id,
          s.name as subject_name,
          aes.exam_date,
          aes.start_time,
          aes.end_time
        FROM admin_exam_student_choices aesc
        JOIN subjects s ON aesc.subject_id = s.id
        JOIN admin_exam_subjects aes ON aes.admin_exam_id = $1 AND aes.subject_id = s.id
        WHERE aesc.registration_id = $2
        ORDER BY aes.exam_date, aes.start_time
      `, [examId, registration.registration_id]);

      subject_schedule = subjectsResult.rows;

      // Add subject schedule to registration object
      registration.subject_schedule = subject_schedule;
      registration.exam_name = exam.exam_name;
      registration.grade_name = exam.grade_name;
      registration.exam_date = exam.exam_date;
    }

    return NextResponse.json({ 
      exam: exam,
      registration: registration,
      is_registered: registration !== null
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}