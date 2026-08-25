import pool from '../../../../lib/database';
import { verifyToken } from '../../../../lib/auth';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
    }

    const client = await pool.connect();
    try {
      // Get student ID
      const studentRes = await client.query(
        'SELECT id FROM students WHERE user_id = $1',
        [decoded.id]
      );

      if (studentRes.rows.length === 0) {
        return new Response(JSON.stringify({ message: 'Student not found' }), { status: 404 });
      }

      const studentId = studentRes.rows[0].id;

      // Get all assignments for enrolled subjects/grades
      // Assignments can now target multiple grades via assignment_grades junction table
      const assignmentsRes = await client.query(
        `SELECT 
          a.id, a.title, a.description, a.due_date::TEXT, a.closing_time, 
          a.max_score, a.status, a.created_at,
          s.name as subject_name,
          asub.status as submission_status, asub.score, asub.feedback, asub.is_late,
          asub.id as submission_id
        FROM assignments a
        LEFT JOIN subjects s ON a.subject_id = s.id
        LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id AND asub.student_id = $1
        WHERE a.id IN (
          SELECT DISTINCT ag.assignment_id FROM assignment_grades ag
          INNER JOIN enrollments e ON ag.grade_id = e.grade_id
          WHERE e.student_id = $1 AND e.status = 'active'
        )
        AND a.status = 'active'
        ORDER BY a.due_date DESC, a.closing_time DESC`,
        [studentId]
      );

      return new Response(JSON.stringify({ assignments: assignmentsRes.rows }), { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in /api/student/assignments:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}