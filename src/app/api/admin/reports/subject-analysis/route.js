// ============================================
// FILE: app/api/admin/reports/subject-analysis/route.js (UPDATED - Remove unnecessary join)
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
    const subjectId = parseInt(searchParams.get('subjectId'));

    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID required' }, { status: 400 });
    }

    const analysisResult = await query(`
      SELECT 
        ae.id as exam_id,
        ae.exam_name,
        ae.exam_date,
        AVG(aem.score) as avg_score,
        (COUNT(CASE WHEN aem.score >= 50 THEN 1 END) * 100.0 / COUNT(*)) as pass_rate,
        CASE 
          WHEN AVG(aem.score) < 40 THEN 'High'
          WHEN AVG(aem.score) < 60 THEN 'Medium'
          ELSE 'Low'
        END as difficulty_index
      FROM admin_exam_marks aem
      JOIN admin_exam_student_choices aesc ON aem.choice_id = aesc.id
      JOIN admin_exam_registrations aer ON aesc.registration_id = aer.id
      JOIN admin_exams ae ON aer.admin_exam_id = ae.id
      WHERE aesc.subject_id = $1
      GROUP BY ae.id, ae.exam_name, ae.exam_date
      ORDER BY ae.exam_date DESC
    `, [subjectId]);

    return NextResponse.json({ analysis: analysisResult.rows });
  } catch (error) {
    console.error('Error fetching subject analysis:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}