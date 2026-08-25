// ============================================
// FILE: app/api/student/exams/register/route.js
// ============================================
import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../../lib/auth';
import { query } from '../../../../../lib/database';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

export async function POST(request) {
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

    console.log('Registration request from user ID:', user.id);

    // Get student ID with improved query
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

    const studentId = studentResult.rows[0].id;
    const studentGradeId = studentResult.rows[0].current_grade_id;

    const body = await request.json();
    const { exam_id, subject_ids } = body;

    console.log('Registration data:', { exam_id, subject_ids, studentId, studentGradeId });

    if (!exam_id || !subject_ids || subject_ids.length === 0) {
      return NextResponse.json({ error: 'Exam ID and subjects required' }, { status: 400 });
    }

    // Check if registration is open
    const examCheck = await query(`
      SELECT 
        ae.id,
        ae.registration_start_date,
        ae.registration_end_date,
        ae.status,
        ae.grade_id,
        ae.exam_name
      FROM admin_exams ae
      WHERE ae.id = $1
    `, [exam_id]);

    console.log('Exam check result:', examCheck.rows);

    if (examCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const exam = examCheck.rows[0];
    const now = new Date();
    const startDate = new Date(exam.registration_start_date);
    const endDate = new Date(exam.registration_end_date);

    if (exam.status !== 'registration_open') {
      return NextResponse.json({ error: 'Registration is not open for this exam' }, { status: 403 });
    }

    if (now < startDate || now > endDate) {
      return NextResponse.json({ error: 'Registration period has ended or not started yet' }, { status: 403 });
    }

    // Check student's grade matches exam grade
    if (studentGradeId !== exam.grade_id) {
      return NextResponse.json({ error: 'Exam not for your grade' }, { status: 403 });
    }

    // Check if already registered
    const existingReg = await query(
      `SELECT aer.id 
       FROM admin_exam_registrations aer 
       WHERE aer.admin_exam_id = $1 AND aer.student_id = $2`,
      [exam_id, studentId]
    );

    console.log('Existing registration check:', existingReg.rows);

    if (existingReg.rows.length > 0) {
      return NextResponse.json({ error: 'Already registered for this exam' }, { status: 409 });
    }

    // Generate admission number (25012300 + student_id)
    const admissionNumber = 25012300 + studentId;

    console.log('Generated admission number:', admissionNumber);

    // Create registration
    const regResult = await query(
      `INSERT INTO admin_exam_registrations 
       (admin_exam_id, student_id, status, admission_number) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [exam_id, studentId, 'registered', admissionNumber]
    );

    const regId = regResult.rows[0].id;

    console.log('Created registration ID:', regId);

    // Validate and create subject choices
    for (const subjectId of subject_ids) {
      // Validate subject is in exam
      const subjectInExam = await query(
        `SELECT aes.id 
         FROM admin_exam_subjects aes 
         WHERE aes.admin_exam_id = $1 AND aes.subject_id = $2`,
        [exam_id, subjectId]
      );

      if (subjectInExam.rows.length === 0) {
        // Rollback registration if invalid subject found
        await query('DELETE FROM admin_exam_registrations WHERE id = $1', [regId]);
        return NextResponse.json({ 
          error: `Subject ID ${subjectId} is not available for this exam` 
        }, { status: 400 });
      }

      // Insert subject choice
      await query(
        `INSERT INTO admin_exam_student_choices 
         (registration_id, subject_id) 
         VALUES ($1, $2)`,
        [regId, subjectId]
      );
    }

    console.log('Successfully registered for exam with', subject_ids.length, 'subjects');

    return NextResponse.json({ 
      success: true, 
      registration_id: regId, 
      admission_number: admissionNumber,
      message: 'Successfully registered for the exam'
    });
  } catch (error) {
    console.error('Error registering for exam:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
}