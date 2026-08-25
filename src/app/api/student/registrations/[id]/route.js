// ============================================
// FILE: app/api/student/registrations/[id]/route.js (UPDATED FOR AUTH HEADER)
// ============================================
import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../../lib/auth';
import { query } from '../../../../../lib/database';

export async function GET(request, { params }) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const token = authHeader.substring(7); // Remove 'Bearer '

    const user = verifyToken(token);

    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student ID
    const studentResult = await query(
      'SELECT id FROM students WHERE user_id = $1',
      [user.id]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const studentId = studentResult.rows[0].id;
    console.log('Debug: Authenticated student ID:', studentId); // DEBUG: Log student ID

    // Await params (required in Next.js 15+ for dynamic routes)
    const paramsObj = await params;
    const registrationId = paramsObj.id;
    console.log('Debug: Requested registration ID:', registrationId); // DEBUG: Log requested ID

    // Get registration with exam details
    const registrationResult = await query(`
      SELECT 
        aer.id as registration_id,
        aer.admission_number,
        aer.registration_date,
        aer.status as registration_status,
        ae.id as exam_id,
        ae.exam_name,
        ae.exam_date,
        ae.status as exam_status,
        g.grade_name,
        u.full_name as student_name,
        u.email as student_email
      FROM admin_exam_registrations aer
      JOIN admin_exams ae ON aer.admin_exam_id = ae.id
      JOIN grades g ON ae.grade_id = g.id
      JOIN students s ON aer.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE aer.id = $1 AND aer.student_id = $2
    `, [registrationId, studentId]);

    console.log('Debug: Registration query rows count:', registrationResult.rows.length); // DEBUG: Log query result count

    if (registrationResult.rows.length === 0) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const registration = registrationResult.rows[0];

    // Get subject schedule with dates and times from admin_exam_subjects
    const subjectsResult = await query(`
      SELECT 
        s.id as subject_id,
        s.name as subject_name,
        aes.exam_date,
        aes.start_time,
        aes.end_time
      FROM admin_exam_student_choices aesc
      JOIN subjects s ON aesc.subject_id = s.id
      LEFT JOIN admin_exam_subjects aes ON aes.admin_exam_id = $1 AND aes.subject_id = s.id
      WHERE aesc.registration_id = $2
      ORDER BY aes.exam_date, aes.start_time
    `, [registration.exam_id, registrationId]);

    console.log('Subjects found:', subjectsResult.rows); // Existing debug log

    // Add subject schedule to registration
    registration.subject_schedule = subjectsResult.rows;
    
    // Add chosen subjects as comma-separated string (for display)
    registration.chosen_subjects = subjectsResult.rows.map(s => s.subject_name).join(', ');

    return NextResponse.json({ registration });
  } catch (error) {
    console.error('Error fetching registration:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}