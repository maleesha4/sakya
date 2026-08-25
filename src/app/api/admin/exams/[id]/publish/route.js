// ============================================
// FILE: app/api/admin/exams/[id]/publish/route.js (NEW FILE)
// ============================================
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../../../lib/auth';
import { query } from '../../../../../../lib/database';

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

    const { id } = await params;
    const examId = parseInt(id);

    // Check if exam exists
    const examResult = await query(
      'SELECT id, exam_name, status FROM admin_exams WHERE id = $1',
      [examId]
    );

    if (examResult.rows.length === 0) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const exam = examResult.rows[0];

    // Check if all marks are entered
    const marksCheckResult = await query(`
      SELECT 
        COUNT(DISTINCT aesc.id) as total_choices,
        COUNT(DISTINCT aem.id) as marked_choices
      FROM admin_exam_student_choices aesc
      JOIN admin_exam_registrations aer ON aesc.registration_id = aer.id
      LEFT JOIN admin_exam_marks aem ON aesc.id = aem.choice_id
      WHERE aer.admin_exam_id = $1
        AND aer.status IN ('registered', 'confirmed')
    `, [examId]);

    const { total_choices, marked_choices } = marksCheckResult.rows[0];

    if (parseInt(total_choices) === 0) {
      return NextResponse.json({ 
        error: 'No students registered for this exam' 
      }, { status: 400 });
    }

    if (parseInt(marked_choices) < parseInt(total_choices)) {
      return NextResponse.json({ 
        error: `Not all marks have been entered. ${marked_choices}/${total_choices} subjects marked.`,
        details: {
          total: parseInt(total_choices),
          marked: parseInt(marked_choices),
          pending: parseInt(total_choices) - parseInt(marked_choices)
        }
      }, { status: 400 });
    }

    // Update exam status to published
    await query(
      `UPDATE admin_exams 
       SET status = 'published', 
           published_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [examId]
    );

    return NextResponse.json({ 
      message: 'Results published successfully',
      exam_name: exam.exam_name
    });
  } catch (error) {
    console.error('Error publishing results:', error);
    return NextResponse.json({ 
      error: 'Failed to publish results',
      details: error.message 
    }, { status: 500 });
  }
}