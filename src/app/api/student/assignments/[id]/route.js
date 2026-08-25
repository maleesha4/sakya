import pool from '../../../../../lib/database';
import { verifyToken } from '../../../../../lib/auth';

export async function GET(request, { params: paramsPromise }) {
  try {
    const params = await paramsPromise;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
    }

    const assignmentId = params.id;
    const client = await pool.connect();
    try {
      const studentRes = await client.query(
        'SELECT id FROM students WHERE user_id = $1',
        [decoded.id]
      );

      if (studentRes.rows.length === 0) {
        return new Response(JSON.stringify({ message: 'Student not found' }), { status: 404 });
      }

      const studentId = studentRes.rows[0].id;

      const assignmentRes = await client.query(
        `SELECT a.id, a.title, a.description, a.due_date::TEXT, a.closing_time, 
                a.max_score, a.is_group, a.subject_id, a.created_at,
                s.name as subject_name,
                json_agg(json_build_object('id', g.id, 'grade_name', g.grade_name)) as grades
        FROM assignments a
        LEFT JOIN subjects s ON a.subject_id = s.id
        LEFT JOIN assignment_grades ag ON a.id = ag.assignment_id
        LEFT JOIN grades g ON ag.grade_id = g.id
        WHERE a.id = $1
        GROUP BY a.id, s.id, s.name`,
        [assignmentId]
      );

      if (assignmentRes.rows.length === 0) {
        return new Response(JSON.stringify({ message: 'Assignment not found' }), { status: 404 });
      }

      const assignment = assignmentRes.rows[0];

      // Check if student is enrolled in one of the grades that this assignment targets
      const enrollmentRes = await client.query(
        `SELECT id FROM enrollments 
        WHERE student_id = $1 AND grade_id IN (
          SELECT grade_id FROM assignment_grades WHERE assignment_id = $2
        ) AND status = 'active'`,
        [studentId, assignmentId]
      );

      if (enrollmentRes.rows.length === 0) {
        return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
      }

      const submissionRes = await client.query(
        `SELECT id, status, submission_date AT TIME ZONE 'UTC' as submission_date, score, feedback, is_late
        FROM assignment_submissions
        WHERE assignment_id = $1 AND student_id = $2`,
        [assignmentId, studentId]
      );

      let submission = null;
      if (submissionRes.rows.length > 0) {
        submission = submissionRes.rows[0];

        const filesRes = await client.query(
          `SELECT file_name, file_url
          FROM assignment_submission_files
          WHERE submission_id = $1
          ORDER BY uploaded_at ASC`,
          [submission.id]
        );

        submission.files = filesRes.rows.map(f => ({
          name: f.file_name,
          url: f.file_url
        }));
      }

      return new Response(JSON.stringify({ assignment, submission }), { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in /api/student/assignments/[id]:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}