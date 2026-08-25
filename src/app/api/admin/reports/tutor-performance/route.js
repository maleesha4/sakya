// ============================================
// FILE: app/api/admin/reports/tutor-performance/route.js (UPDATED - Fix join for admin_exam_id)
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
    const tutorId = parseInt(searchParams.get('tutorId'));

    if (!tutorId) {
      return NextResponse.json({ error: 'Tutor ID required' }, { status: 400 });
    }

    // Query with proper joins
    const performanceResult = await query(`
      SELECT 
        ae.id as exam_id,
        ae.exam_name,
        COUNT(aem.id) as marks_entered,
        0 as time_taken,  -- Placeholder
        (COUNT(CASE WHEN aem.score IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(aem.id), 0)) as accuracy_rate
      FROM admin_exam_marks aem
      JOIN admin_exam_student_choices aesc ON aem.choice_id = aesc.id
      JOIN admin_exam_registrations aer ON aesc.registration_id = aer.id
      JOIN admin_exams ae ON aer.admin_exam_id = ae.id
      WHERE aem.tutor_id = $1
      GROUP BY ae.id, ae.exam_name
      ORDER BY ae.exam_date DESC
    `, [tutorId]);

    return NextResponse.json({ performance: performanceResult.rows });
  } catch (error) {
    console.error('Error fetching tutor performance:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}