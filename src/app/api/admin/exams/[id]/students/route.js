// ============================================
// FILE: app/api/admin/exams/[id]/students/route.js (UPDATED WITH AUTO SUBJECT ASSIGNMENT)
// ============================================
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../../../lib/auth';
import { query } from '../../../../../../lib/database';

export async function GET(request, { params }) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paramsObj = await params;
    const { id } = paramsObj;
    const examId = parseInt(id);

    // First verify the exam exists
    const examCheck = await query(
      'SELECT ae.id FROM admin_exams ae WHERE ae.id = $1',
      [examId]
    );

    if (examCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Get all registrations for this exam with student details (INNER JOIN as in /registrations)
    const result = await query(`
      SELECT 
        aer.id,
        aer.admin_exam_id,
        aer.admission_number,
        aer.registration_date,
        aer.status,
        u.full_name as student_name,
        u.email as student_email,
        s.id as student_id
      FROM admin_exam_registrations aer
      INNER JOIN students s ON aer.student_id = s.id
      INNER JOIN users u ON s.user_id = u.id
      WHERE aer.admin_exam_id = $1
      ORDER BY aer.registration_date DESC
    `, [examId]);

    // For each registration, get the selected subjects
    const registrationsWithSubjects = await Promise.all(
      result.rows.map(async (reg) => {
        const subjectsResult = await query(`
          SELECT 
            aesc.id as choice_id,
            sub.id as subject_id,
            sub.name as subject_name
          FROM admin_exam_student_choices aesc
          JOIN subjects sub ON aesc.subject_id = sub.id
          WHERE aesc.registration_id = $1
          ORDER BY sub.name ASC
        `, [reg.id]);

        return {
          ...reg,
          index_number: null,  // Removed to avoid column error
          chosen_subjects: subjectsResult.rows.map(s => s.subject_name).join(', '),
          subject_ids: subjectsResult.rows.map(s => s.subject_id),
          choice_ids: subjectsResult.rows.map(s => s.choice_id)
        };
      })
    );

    return NextResponse.json({ registrations: registrationsWithSubjects });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paramsObj = await params;
    const { id } = paramsObj;
    const examIdInt = parseInt(id);

    const body = await request.json();
    const { student_ids } = body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid student_ids' }, { status: 400 });
    }

    // Verify exam exists
    const examCheck = await query(
      'SELECT id FROM admin_exams WHERE id = $1',
      [examIdInt]
    );

    if (examCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Fetch all subjects for this exam
    const examSubjects = await query(
      'SELECT subject_id FROM admin_exam_subjects WHERE admin_exam_id = $1',
      [examIdInt]
    );

    const examSubjectIds = examSubjects.rows.map(row => row.subject_id);

    if (examSubjectIds.length === 0) {
      return NextResponse.json({ error: 'No subjects assigned to this exam' }, { status: 400 });
    }

    // Insert registrations for each student with admission_number = 25012300 + student_id
    const insertedIds = [];
    for (const studentId of student_ids) {
      const studentIdInt = parseInt(studentId);
      const admissionNumber = 25012300 + studentIdInt;

      const result = await query(`
        INSERT INTO admin_exam_registrations (admin_exam_id, student_id, admission_number, registration_date, status)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'registered')
        ON CONFLICT (admin_exam_id, student_id) DO NOTHING
        RETURNING id
      `, [examIdInt, studentIdInt, admissionNumber]);

      if (result.rows.length > 0) {
        const newRegId = result.rows[0].id;

        // Automatically assign all exam subjects to this new registration
        for (const subjectId of examSubjectIds) {
          await query(
            'INSERT INTO admin_exam_student_choices (registration_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [newRegId, subjectId]
          );
        }

        insertedIds.push(newRegId);
      }
    }

    return NextResponse.json({ 
      message: `Added ${insertedIds.length} students successfully with all subjects assigned`,
      inserted_ids: insertedIds 
    });
  } catch (error) {
    console.error('Error adding students:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}