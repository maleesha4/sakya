// ============================================
// FILE: app/api/admin/reports/custom/route.js (UPDATED - Calculate average with subquery)
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
    const examIdsStr = searchParams.get('examIds');
    const reportType = searchParams.get('reportType') || 'summary';

    if (!examIdsStr) {
      return NextResponse.json({ error: 'Exam IDs required' }, { status: 400 });
    }

    const examIds = examIdsStr.split(',').map(id => parseInt(id));

    let queryStr;
    if (reportType === 'summary') {
      queryStr = `
        SELECT 
          ae.exam_name,
          COUNT(DISTINCT aer.student_id) as students,
          AVG(sa.average) as avg_score,
          COUNT(CASE WHEN sa.average >= 75 THEN 1 END) as high_performers
        FROM admin_exams ae
        JOIN admin_exam_registrations aer ON ae.id = aer.admin_exam_id
        LEFT JOIN (
          SELECT 
            aesc.registration_id,
            AVG(aem.score) as average
          FROM admin_exam_student_choices aesc
          LEFT JOIN admin_exam_marks aem ON aem.choice_id = aesc.id
          GROUP BY aesc.registration_id
        ) sa ON aer.id = sa.registration_id
        WHERE ae.id = ANY($1)
          AND aer.status IN ('registered', 'confirmed')
        GROUP BY ae.id, ae.exam_name
        ORDER BY ae.exam_name
      `;
    } else {
      queryStr = `
        SELECT 
          u.full_name as student_name,
          aer.admission_number,
          ae.exam_name,
          sa.average
        FROM admin_exam_registrations aer
        JOIN students s ON aer.student_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN admin_exams ae ON aer.admin_exam_id = ae.id
        LEFT JOIN (
          SELECT 
            aesc.registration_id,
            AVG(aem.score) as average
          FROM admin_exam_student_choices aesc
          LEFT JOIN admin_exam_marks aem ON aem.choice_id = aesc.id
          GROUP BY aesc.registration_id
        ) sa ON aer.id = sa.registration_id
        WHERE ae.id = ANY($1)
          AND aer.status IN ('registered', 'confirmed')
        ORDER BY ae.exam_name, sa.average DESC
      `;
    }

    const result = await query(queryStr, [examIds]);

    return NextResponse.json({ report: result.rows });
  } catch (error) {
    console.error('Error generating custom report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}