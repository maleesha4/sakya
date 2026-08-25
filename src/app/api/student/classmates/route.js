import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/database';

export async function GET(req) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');
    const subjectId = searchParams.get('subjectId');

    if (!assignmentId || !subjectId) {
      return NextResponse.json({ error: 'Missing assignmentId or subjectId' }, { status: 400 });
    }

    // Get the current student's ID
    const studentResult = await query(
      'SELECT id FROM students WHERE user_id = $1',
      [decoded.id]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const currentStudentId = studentResult.rows[0].id;

    // Get all classmates for cross-grade groups
    // Fetch students from all grades that the assignment targets
    const classmatesResult = await query(
      `SELECT DISTINCT st.id, u.full_name
      FROM students st
      JOIN users u ON st.user_id = u.id
      JOIN enrollments e ON st.id = e.student_id
      WHERE e.subject_id = $1 AND e.status = 'active' AND st.id != $2
      AND e.grade_id IN (
        SELECT grade_id FROM assignment_grades WHERE assignment_id = $3
      )
      ORDER BY u.full_name ASC`,
      [subjectId, currentStudentId, assignmentId]
    );

    return NextResponse.json({ 
      classmates: classmatesResult.rows
    });
  } catch (error) {
    console.error('Error fetching classmates:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
