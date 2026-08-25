import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth';
import { query } from '../../../../../lib/database';

export async function GET(request, { params: paramsPromise }) {
  try {
    const params = await paramsPromise;
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

    const assignmentId = params.id;

    // Get assignment details with all target grades
    const assignmentResult = await query(
      `SELECT a.id, a.title, a.description, a.due_date::TEXT, a.closing_time, a.max_score, a.status, 
              a.created_at, a.updated_at, a.is_group, a.tutor_id, a.subject_id,
              s.name as subject_name,
              json_agg(json_build_object('id', g.id, 'grade_name', g.grade_name)) FILTER (WHERE g.id IS NOT NULL) as grades
      FROM assignments a
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN assignment_grades ag ON a.id = ag.assignment_id
      LEFT JOIN grades g ON ag.grade_id = g.id
      WHERE a.id = $1
      GROUP BY a.id, a.title, a.description, a.due_date, a.closing_time, a.max_score, a.status, a.created_at, a.updated_at, a.is_group, a.tutor_id, a.subject_id, s.name`,
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const assignment = assignmentResult.rows[0];

    // Verify tutor owns this assignment
    const tutorResult = await query(
      'SELECT id FROM tutors WHERE user_id = $1',
      [decoded.id]
    );

    if (tutorResult.rows.length === 0 || assignment.tutor_id !== tutorResult.rows[0].id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get submissions with files and group members
    const submissionsResult = await query(
      `SELECT 
        asub.id, asub.assignment_id, asub.student_id, 
        asub.submission_date AT TIME ZONE 'UTC' as submission_date,
        asub.score, asub.feedback, asub.is_late, asub.status,
        u.full_name as student_name, u.email as student_email,
        COUNT(asf.id) as file_count
      FROM assignment_submissions asub
      JOIN students st ON asub.student_id = st.id
      JOIN users u ON st.user_id = u.id
      LEFT JOIN assignment_submission_files asf ON asub.id = asf.submission_id
      WHERE asub.assignment_id = $1 AND asub.status IN ('submitted', 'graded')
      GROUP BY asub.id, asub.assignment_id, asub.student_id, asub.submission_date, 
               asub.score, asub.feedback, asub.is_late, asub.status, u.full_name, u.email
      HAVING COUNT(asf.id) > 0
      ORDER BY asub.is_late DESC, asub.submission_date DESC`,
      [assignmentId]
    );

    const submissions = await Promise.all(
      submissionsResult.rows.map(async (submission) => {
        const filesResult = await query(
          `SELECT file_name, file_url
          FROM assignment_submission_files
          WHERE submission_id = $1
          ORDER BY uploaded_at ASC`,
          [submission.id]
        );

        let groupMembers = [];
        if (assignment.is_group) {
          const groupResult = await query(
            `SELECT st.id, u.full_name
            FROM assignment_group_members agm
            JOIN students st ON agm.student_id = st.id
            JOIN users u ON st.user_id = u.id
            WHERE agm.submission_id = $1
            ORDER BY u.full_name ASC`,
            [submission.id]
          );
          groupMembers = groupResult.rows;
        }

        return {
          ...submission,
          files: filesResult.rows.map(f => ({ name: f.file_name, url: f.file_url })),
          group_members: groupMembers
        };
      })
    );

    return NextResponse.json({ assignment, submissions });
  } catch (error) {
    console.error('Error in /api/tutor/assignments/[id]:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params: paramsPromise }) {
  try {
    const params = await paramsPromise;
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

    const assignmentId = params.id;
    const body = await request.json();
    const { title, description, gradeIds, dueDate, closingTime, maxScore, isGroup } = body;

    // Validate required fields
    if (!title || !Array.isArray(gradeIds) || gradeIds.length === 0 || !dueDate || !closingTime) {
      return NextResponse.json(
        { message: 'Missing required fields or gradeIds must be an array' },
        { status: 400 }
      );
    }

    // Parse dueDate as local date (YYYY-MM-DD format from form input)
    // Don't use new Date() which interprets as UTC and shifts the date
    const [year, month, day] = dueDate.split('-');
    const selectedDate = new Date(year, parseInt(month) - 1, parseInt(day), 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return NextResponse.json(
        { message: 'Due date cannot be in the past' },
        { status: 400 }
      );
    }

    // Get current assignment to verify ownership
    const assignmentResult = await query(
      'SELECT tutor_id FROM assignments WHERE id = $1',
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify tutor owns this assignment
    const tutorResult = await query(
      'SELECT id FROM tutors WHERE user_id = $1',
      [decoded.id]
    );

    if (tutorResult.rows.length === 0 || assignmentResult.rows[0].tutor_id !== tutorResult.rows[0].id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the assignment (without grade_id, as grades are managed via assignment_grades junction table)
    const updateResult = await query(
      `UPDATE assignments
       SET title = $1, description = $2, due_date = $3, 
           closing_time = $4, max_score = $5, is_group = $6
       WHERE id = $7
       RETURNING *`,
      [title, description, dueDate, closingTime, maxScore || 100, isGroup || false, assignmentId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }

    // Delete old grade associations and create new ones
    await query(
      'DELETE FROM assignment_grades WHERE assignment_id = $1',
      [assignmentId]
    );

    // Link assignment to each grade
    for (const gradeId of gradeIds) {
      await query(
        'INSERT INTO assignment_grades (assignment_id, grade_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [assignmentId, gradeId]
      );
    }

    // Fetch the updated assignment with its grades
    const updatedAssignment = await query(
      `SELECT a.id, a.title, a.description, a.due_date::TEXT, a.closing_time, a.max_score, 
              a.status, a.created_at, a.updated_at, a.is_group, a.tutor_id, a.subject_id,
              json_agg(json_build_object('id', g.id, 'grade_name', g.grade_name)) FILTER (WHERE g.id IS NOT NULL) as grades
       FROM assignments a
       LEFT JOIN assignment_grades ag ON a.id = ag.assignment_id
       LEFT JOIN grades g ON ag.grade_id = g.id
       WHERE a.id = $1
       GROUP BY a.id, a.title, a.description, a.due_date, a.closing_time, a.max_score, a.status, a.created_at, a.updated_at, a.is_group, a.tutor_id, a.subject_id`,
      [assignmentId]
    );

    return NextResponse.json({
      message: 'Assignment updated successfully',
      assignment: updatedAssignment.rows[0]
    });
  } catch (error) {
    console.error('Error in PUT /api/tutor/assignments/[id]:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params: paramsPromise }) {
  try {
    const params = await paramsPromise;
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

    const assignmentId = params.id;

    // Get current assignment to verify ownership
    const assignmentResult = await query(
      'SELECT tutor_id FROM assignments WHERE id = $1',
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify tutor owns this assignment
    const tutorResult = await query(
      'SELECT id FROM tutors WHERE user_id = $1',
      [decoded.id]
    );

    if (tutorResult.rows.length === 0 || assignmentResult.rows[0].tutor_id !== tutorResult.rows[0].id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete associated data first (cascade should handle this, but being explicit)
    await query('DELETE FROM assignment_submission_files WHERE submission_id IN (SELECT id FROM assignment_submissions WHERE assignment_id = $1)', [assignmentId]);
    await query('DELETE FROM assignment_group_members WHERE submission_id IN (SELECT id FROM assignment_submissions WHERE assignment_id = $1)', [assignmentId]);
    await query('DELETE FROM assignment_submissions WHERE assignment_id = $1', [assignmentId]);
    await query('DELETE FROM assignment_grades WHERE assignment_id = $1', [assignmentId]);
    
    // Delete the assignment
    await query('DELETE FROM assignments WHERE id = $1', [assignmentId]);

    return NextResponse.json({
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/tutor/assignments/[id]:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}