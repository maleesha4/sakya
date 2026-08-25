// ============================================
// FILE: app/api/admin/reports/student-exam-subjects/route.js (NEW FILE)
// ============================================
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth';
import { query } from '../../../../../lib/database';

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const studentId = parseInt(searchParams.get('studentId'));
    const examId = parseInt(searchParams.get('examId'));

    if (!studentId || !examId) {
      return NextResponse.json({ error: 'Student ID and Exam ID required' }, { status: 400 });
    }

    const subjectsResult = await query(`
      SELECT 
        s.name as subject_name,
        aem.score,
        CASE 
          WHEN aem.score >= 90 THEN 'A+'
          WHEN aem.score >= 80 THEN 'A'
          WHEN aem.score >= 70 THEN 'B'
          WHEN aem.score >= 60 THEN 'C'
          ELSE 'F'
        END as grade
      FROM admin_exam_student_choices aesc
      JOIN admin_exam_marks aem ON aem.choice_id = aesc.id
      JOIN subjects s ON aesc.subject_id = s.id
      JOIN admin_exam_registrations aer ON aesc.registration_id = aer.id
      WHERE aer.student_id = $1 
        AND aer.admin_exam_id = $2
        AND aer.status IN ('registered', 'confirmed')
      ORDER BY s.name
    `, [studentId, examId]);

    return NextResponse.json({ subjects: subjectsResult.rows });
  } catch (error) {
    console.error('Error fetching student exam subjects:', error);
    return NextResponse.json({ error: 'Failed to fetch subject data' }, { status: 500 });
  }
}