// ============================================
// FILE: app/api/admin/reports/top-performers/route.js (UPDATED - Calculate average with subquery)
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
    const examId = parseInt(searchParams.get('examId'));

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });
    }

    const topResult = await query(`
      SELECT 
        s.id as student_id,
        u.full_name as student_name,
        aer.admission_number,
        student_avg.average
      FROM admin_exam_registrations aer
      JOIN students s ON aer.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN (
        SELECT 
          aesc.registration_id,
          AVG(aem.score) as average
        FROM admin_exam_student_choices aesc
        LEFT JOIN admin_exam_marks aem ON aem.choice_id = aesc.id
        GROUP BY aesc.registration_id
      ) student_avg ON aer.id = student_avg.registration_id
      WHERE aer.admin_exam_id = $1
        AND aer.status IN ('registered', 'confirmed')
        AND student_avg.average IS NOT NULL
      ORDER BY student_avg.average DESC
      LIMIT 10
    `, [examId]);

    return NextResponse.json({ top_performers: topResult.rows });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}