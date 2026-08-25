import pool from '../../../../../../lib/database';
import { verifyToken } from '../../../../../../lib/auth';

export async function POST(request, { params: paramsPromise }) {
  try {
    const params = await paramsPromise;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'tutor') {
      return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
    }

    const submissionId = params.id;
    const { score, feedback, applyToAllGroupMembers } = await request.json();

    if (score === undefined) {
      return new Response(JSON.stringify({ message: 'Score is required' }), { status: 400 });
    }

    const client = await pool.connect();
    try {
      const submissionRes = await client.query(
        `SELECT asub.id, asub.assignment_id, asub.student_id, a.tutor_id, a.max_score, a.is_group
        FROM assignment_submissions asub
        JOIN assignments a ON asub.assignment_id = a.id
        WHERE asub.id = $1`,
        [submissionId]
      );

      if (submissionRes.rows.length === 0) {
        return new Response(JSON.stringify({ message: 'Submission not found' }), { status: 404 });
      }

      const submission = submissionRes.rows[0];

      const tutorRes = await client.query(
        'SELECT id FROM tutors WHERE user_id = $1',
        [decoded.id]
      );

      if (tutorRes.rows.length === 0 || submission.tutor_id !== tutorRes.rows[0].id) {
        return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
      }

      if (score < 0 || score > submission.max_score) {
        return new Response(JSON.stringify({ message: `Score must be between 0 and ${submission.max_score}` }), { status: 400 });
      }

      // Update the main submission
      const result = await client.query(
        `UPDATE assignment_submissions 
        SET score = $1, feedback = $2, status = 'graded'
        WHERE id = $3
        RETURNING id, score, feedback, status`,
        [score, feedback || null, submissionId]
      );

      // If this is a group assignment and we should apply to all group members
      if (submission.is_group && applyToAllGroupMembers) {
        // Get all group member student IDs
        const groupMembersRes = await client.query(
          `SELECT DISTINCT student_id
          FROM assignment_group_members
          WHERE submission_id = $1`,
          [submissionId]
        );

        // Update submissions for all group members
        for (const member of groupMembersRes.rows) {
          await client.query(
            `UPDATE assignment_submissions 
            SET score = $1, feedback = $2, status = 'graded'
            WHERE assignment_id = $3 AND student_id = $4`,
            [score, feedback || null, submission.assignment_id, member.student_id]
          );
        }
      }

      return new Response(JSON.stringify({
        message: applyToAllGroupMembers && submission.is_group ? 
          'Submission graded successfully for all group members' : 
          'Submission graded successfully',
        submission: result.rows[0]
      }), { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in grade route:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}