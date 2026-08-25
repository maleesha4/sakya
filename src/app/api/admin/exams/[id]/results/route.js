// ============================================
// FILE: app/api/admin/exams/[id]/results/route.js (NEW FILE)
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

    const { id } = await params;
    const examId = parseInt(id);

    // Get all subjects for this exam
    const subjectsResult = await query(`
      SELECT DISTINCT s.id, s.name
      FROM admin_exam_subjects aes
      JOIN subjects s ON aes.subject_id = s.id
      WHERE aes.admin_exam_id = $1
      ORDER BY s.name
    `, [examId]);

    const subjects = subjectsResult.rows;

    // Get all registered students with their marks
    const studentsResult = await query(`
      SELECT DISTINCT
        s.id as student_id,
        u.full_name as student_name,
        aer.admission_number,
        aer.id as registration_id
      FROM admin_exam_registrations aer
      JOIN students s ON aer.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE aer.admin_exam_id = $1
        AND aer.status IN ('registered', 'confirmed')
      ORDER BY u.full_name
    `, [examId]);

    // For each student, get their marks for all subjects
    const results = await Promise.all(
      studentsResult.rows.map(async (student) => {
        const marksResult = await query(`
          SELECT 
            aesc.subject_id,
            s.name as subject_name,
            aem.score
          FROM admin_exam_student_choices aesc
          JOIN subjects s ON aesc.subject_id = s.id
          LEFT JOIN admin_exam_marks aem ON aesc.id = aem.choice_id
          WHERE aesc.registration_id = $1
          ORDER BY s.name
        `, [student.registration_id]);

        const subjectMarks = marksResult.rows;

        // Calculate total and average
        const validScores = subjectMarks.filter(m => m.score !== null).map(m => m.score);
        const total = validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) : null;
        const average = validScores.length > 0 ? total / validScores.length : null;

        return {
          student_id: student.student_id,
          student_name: student.student_name,
          admission_number: student.admission_number,
          subjects: subjectMarks.map(m => ({
            subject_id: m.subject_id,
            subject_name: m.subject_name,
            score: m.score
          })),
          total,
          average
        };
      })
    );

    return NextResponse.json({ 
      results,
      subjects
    });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    return NextResponse.json({ error: 'Failed to fetch results', details: error.message }, { status: 500 });
  }
}