// ============================================
// FILE: app/api/admin/exams/[id]/route.js (FIXED)
// ============================================
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth';
import { query } from '../../../../../lib/database';

const fetchExamWithSubjects = async (id) => {
  const result = await query(`
    SELECT 
      ae.*,
      g.grade_name,
      json_agg(
        json_build_object(
          'id', s.id,
          'name', s.name,
          'subject_id', aes.subject_id,
          'exam_date', aes.exam_date,
          'start_time', aes.start_time,
          'end_time', aes.end_time
        )
      ) FILTER (WHERE aes.subject_id IS NOT NULL) AS subjects
    FROM admin_exams ae
    LEFT JOIN grades g ON ae.grade_id = g.id
    LEFT JOIN admin_exam_subjects aes ON ae.id = aes.admin_exam_id
    LEFT JOIN subjects s ON aes.subject_id = s.id
    WHERE ae.id = $1
    GROUP BY ae.id, g.grade_name
  `, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  const exam = result.rows[0];
  exam.subjects = exam.subjects || [];
  return exam;
};

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
    console.log('Full params object:', paramsObj); // Debug: log full params
    const id = paramsObj?.id;
    console.log('Extracted ID:', id); // Log the ID being fetched

    if (!id) {
      console.log('Invalid or missing ID param');
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const exam = await fetchExamWithSubjects(id);

    if (!exam) {
      console.log('Exam not found for ID:', id);
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    console.log('Exam data:', exam); // Log the fetched exam data
    return NextResponse.json({ exam });
  } catch (error) {
    console.error('Error fetching exam data:', error);
    return NextResponse.json({ error: 'Failed to fetch exam data' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
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
    const id = paramsObj?.id;

    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const updates = [];
    const values = [];
    let idx = 1;

    if (body.exam_name) {
      updates.push(`exam_name = $${idx}`);
      values.push(body.exam_name);
      idx++;
    }
    if (body.grade_id) {
      updates.push(`grade_id = $${idx}`);
      values.push(body.grade_id);
      idx++;
    }
    if (body.exam_date) {
      updates.push(`exam_date = $${idx}`);
      values.push(body.exam_date);
      idx++;
    }
    if (body.registration_start_date) {
      updates.push(`registration_start_date = $${idx}`);
      values.push(body.registration_start_date);
      idx++;
    }
    if (body.registration_end_date) {
      updates.push(`registration_end_date = $${idx}`);
      values.push(body.registration_end_date);
      idx++;
    }
    if (body.description !== undefined) {
      updates.push(`description = $${idx}`);
      values.push(body.description);
      idx++;
    }
    if (body.status) {
      updates.push(`status = $${idx}`);
      values.push(body.status);
      idx++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE admin_exams SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Update subjects junctions if subject_ids provided
    if (body.subject_ids && Array.isArray(body.subject_ids) && body.subject_ids.length > 0) {
      // Delete old
      await query('DELETE FROM admin_exam_subjects WHERE admin_exam_id = $1', [id]);
      // Insert new with details
      for (const subjectId of body.subject_ids) {
        const details = body.subject_details?.[subjectId] || {};
        await query(
          'INSERT INTO admin_exam_subjects (admin_exam_id, subject_id, exam_date, start_time, end_time) VALUES ($1, $2, $3, $4, $5)',
          [
            id,
            subjectId,
            details.exam_date || body.exam_date,
            details.start_time || '09:00:00',
            details.end_time || '11:00:00'
          ]
        );
      }
    }

    // Refetch the full exam with subjects
    const updatedExam = await fetchExamWithSubjects(id);

    return NextResponse.json({ success: true, exam: updatedExam });
  } catch (error) {
    console.error('Error updating exam:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
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
    const id = paramsObj?.id;

    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Delete junctions first
    await query('DELETE FROM admin_exam_subjects WHERE admin_exam_id = $1', [id]);

    // Delete exam
    await query('DELETE FROM admin_exams WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exam:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}