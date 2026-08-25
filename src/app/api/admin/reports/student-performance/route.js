// ============================================
// FILE: app/api/admin/reports/student-performance/route.js (UPDATED - Calculate total and average with subquery)
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

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    const performanceResult = await query(`
      SELECT 
        exam_data.exam_id,
        exam_data.exam_name,
        exam_data.exam_date,
        exam_data.total,
        exam_data.average,
        CASE 
          WHEN exam_data.average >= 90 THEN 'A+'
          WHEN exam_data.average >= 80 THEN 'A'
          WHEN exam_data.average >= 70 THEN 'B'
          WHEN exam_data.average >= 60 THEN 'C'
          ELSE 'F'
        END as grade
      FROM (
        SELECT 
          ae.id as exam_id,
          ae.exam_name,
          ae.exam_date,
          COALESCE(SUM(aem.score), 0) as total,
          CASE 
            WHEN COUNT(aem.score) > 0 THEN AVG(aem.score)
            ELSE NULL
          END as average
        FROM admin_exam_registrations aer
        JOIN admin_exams ae ON aer.admin_exam_id = ae.id
        LEFT JOIN admin_exam_student_choices aesc ON aesc.registration_id = aer.id
        LEFT JOIN admin_exam_marks aem ON aem.choice_id = aesc.id
        WHERE aer.student_id = $1
          AND aer.status IN ('registered', 'confirmed')
        GROUP BY ae.id, ae.exam_name, ae.exam_date
      ) exam_data
      ORDER BY exam_data.exam_date DESC
    `, [studentId]);

    return NextResponse.json({ performance: performanceResult.rows });
  } catch (error) {
    console.error('Error fetching student performance:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}