import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth';
import { query } from '../../../../../lib/database';

/**
 * GET /api/tutor/assignments/marks?assignmentId=X
 * Fetch all submissions for an assignment with marks
 */
export async function GET(req) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'tutor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const assignmentId = url.searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
    }

    // Get tutor ID
    const tutorResult = await query(
      'SELECT id FROM tutors WHERE user_id = $1',
      [decoded.id]
    );

    if (tutorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    const tutorId = tutorResult.rows[0].id;

    // Verify tutor owns this assignment
    const assignmentCheck = await query(
      'SELECT id, title, max_score FROM assignments WHERE id = $1 AND tutor_id = $2',
      [assignmentId, tutorId]
    );

    if (assignmentCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found or unauthorized' }, { status: 404 });
    }

    const assignment = assignmentCheck.rows[0];

    // Fetch all submissions with student details
    const submissionsResult = await query(
      `SELECT 
        asub.id as submission_id,
        asub.assignment_id,
        asub.student_id,
        u.full_name as student_name,
        u.email as student_email,
        asub.score,
        asub.feedback,
        asub.status,
        asub.submission_date,
        asub.is_late,
        asub.is_group,
        st.grade_id AS current_grade_id
      FROM assignment_submissions asub
      JOIN students st ON asub.student_id = st.id
      JOIN users u ON st.user_id = u.id
      WHERE asub.assignment_id = $1
      ORDER BY u.full_name ASC`,
      [assignmentId]
    );

    // For group assignments, get group members for each submission
    let submissions = submissionsResult.rows;
    
    if (assignment.is_group) {
      submissions = await Promise.all(
        submissions.map(async (submission) => {
          const groupMembersResult = await query(
            `SELECT st.id, u.full_name, u.email
            FROM assignment_group_members agm
            JOIN students st ON agm.student_id = st.id
            JOIN users u ON st.user_id = u.id
            WHERE agm.submission_id = $1
            ORDER BY u.full_name ASC`,
            [submission.submission_id]
          );

          return {
            ...submission,
            group_members: groupMembersResult.rows
          };
        })
      );
    }

    return NextResponse.json({
      assignment,
      submissions
    });
  } catch (error) {
    console.error('Error fetching assignment marks:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/tutor/assignments/marks
 * Update marks for a submission
 */
export async function PUT(req) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'tutor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { submissionId, score, feedback, applyToGroupMembers } = body;

    // Validate required fields
    if (!submissionId || score === undefined || score === null) {
      return NextResponse.json(
        { error: 'submissionId and score are required' },
        { status: 400 }
      );
    }

    // Validate score
    const parsedScore = parseInt(score, 10);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      return NextResponse.json(
        { error: 'Score must be a valid number between 0 and 100' },
        { status: 400 }
      );
    }

    // Get tutor ID
    const tutorResult = await query(
      'SELECT id FROM tutors WHERE user_id = $1',
      [decoded.id]
    );

    if (tutorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    const tutorId = tutorResult.rows[0].id;

    // Verify tutor owns the assignment for this submission
    const submissionCheck = await query(
      `SELECT asub.id, asub.assignment_id, a.tutor_id, asub.is_group
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      WHERE asub.id = $1`,
      [submissionId]
    );

    if (submissionCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = submissionCheck.rows[0];

    if (submission.tutor_id !== tutorId) {
      return NextResponse.json(
        { error: 'Unauthorized to update this submission' },
        { status: 403 }
      );
    }

    // Update the submission
    await query(
      `UPDATE assignment_submissions
       SET score = $1, feedback = $2, status = 'graded'
       WHERE id = $3`,
      [parsedScore, feedback || null, submissionId]
    );

    // If group assignment and applyToGroupMembers is true, apply to all group members
    if (submission.is_group && applyToGroupMembers) {
      const groupMembersResult = await query(
        `SELECT agm.student_id
        FROM assignment_group_members agm
        WHERE agm.submission_id = $1`,
        [submissionId]
      );

      for (const member of groupMembersResult.rows) {
        await query(
          `UPDATE assignment_submissions
           SET score = $1, feedback = $2, status = 'graded'
           WHERE assignment_id = $3 AND student_id = $4`,
          [parsedScore, feedback || null, submission.assignment_id, member.student_id]
        );
      }
    }

    return NextResponse.json({
      message: 'Mark updated successfully',
      submission_id: submissionId,
      score: parsedScore
    });
  } catch (error) {
    console.error('Error updating assignment marks:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}
