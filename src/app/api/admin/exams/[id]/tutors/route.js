// ============================================
// FILE: app/api/admin/exams/[id]/tutors/route.js (FIXED)
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
    const id = paramsObj?.id;

    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Fetch current assignments
    const result = await query(`
      SELECT 
        a.subject_id,
        a.tutor_id,
        u.full_name as tutor_name,
        s.name as subject_name
      FROM admin_exam_subject_tutors a
      JOIN tutors t ON a.tutor_id = t.id
      JOIN users u ON t.user_id = u.id
      JOIN subjects s ON a.subject_id = s.id
      WHERE a.admin_exam_id = $1
      ORDER BY s.name, u.full_name
    `, [id]);

    return NextResponse.json({ assignments: result.rows });
  } catch (error) {
    console.error('Error fetching tutor assignments:', error);
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
    const id = paramsObj?.id;

    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const { tutor_assignments } = body; // { subject_id: tutor_id }

    // Delete existing assignments for this exam
    await query('DELETE FROM admin_exam_subject_tutors WHERE admin_exam_id = $1', [id]);

    // Insert new assignments
    for (const [subjectId, tutorId] of Object.entries(tutor_assignments)) {
      if (tutorId) {
        await query(
          'INSERT INTO admin_exam_subject_tutors (admin_exam_id, subject_id, tutor_id) VALUES ($1, $2, $3)',
          [id, parseInt(subjectId), parseInt(tutorId)]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving tutor assignments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}