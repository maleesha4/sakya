import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/database';

export async function GET() {
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

    if (process.env.NODE_ENV === 'development') {
      console.log('Tutor user ID:', decoded.id);
    }

    // Get tutor ID and subject
    const tutorResult = await query(
      'SELECT id, subject_id FROM tutors WHERE user_id = $1',
      [decoded.id]
    );

    if (tutorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const { id: tutorId, subject_id: subjectId } = tutorResult.rows[0];

    if (process.env.NODE_ENV === 'development') {
      console.log('Tutor ID:', tutorId, 'Subject ID:', subjectId);
    }

    // Fetch assignments for this tutor with their grades
    const assignmentsResult = await query(
      `SELECT 
        a.id, a.title, a.description, a.due_date::TEXT, a.closing_time, 
        a.max_score, a.status, a.created_at, a.updated_at, COALESCE(a.is_group, false) as is_group,
        a.subject_id, s.name as subject_name,
        json_agg(json_build_object('id', g.id, 'grade_name', g.grade_name)) FILTER (WHERE g.id IS NOT NULL) as grades,
        COUNT(CASE WHEN asub.status IN ('submitted', 'graded') THEN 1 END)::int as submission_count,
        COUNT(CASE WHEN asub.status IN ('submitted', 'graded') AND asub.is_late = true THEN 1 END)::int as late_count
      FROM assignments a
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN assignment_grades ag ON a.id = ag.assignment_id
      LEFT JOIN grades g ON ag.grade_id = g.id
      LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
      WHERE a.tutor_id = $1 AND a.subject_id = $2
      GROUP BY a.id, a.title, a.description, a.due_date, a.closing_time, a.max_score, a.status, a.created_at, a.updated_at, a.is_group, a.subject_id, s.name
      ORDER BY a.due_date DESC, a.closing_time DESC`,
      [tutorId, subjectId]
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('Assignments fetched:', assignmentsResult.rows.length);
    }

    return NextResponse.json({ 
      assignments: assignmentsResult.rows,
      subject_id: subjectId
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req) {
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
    const { title, description, gradeIds, dueDate, closingTime, maxScore, isGroup } = body;

    if (!title || !gradeIds || !Array.isArray(gradeIds) || gradeIds.length === 0 || !dueDate || !closingTime) {
      return NextResponse.json({ error: 'Missing required fields. gradeIds must be a non-empty array.' }, { status: 400 });
    }

    // Parse dueDate as local date (YYYY-MM-DD format from form input)
    // Don't use new Date() which interprets as UTC and shifts the date
    const [year, month, day] = dueDate.split('-');
    const selectedDate = new Date(year, parseInt(month) - 1, parseInt(day), 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return NextResponse.json({ error: 'Due date cannot be in the past' }, { status: 400 });
    }

    // Get tutor ID and subject
    const tutorResult = await query(
      'SELECT id, subject_id FROM tutors WHERE user_id = $1',
      [decoded.id]
    );

    if (tutorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const { id: tutorId, subject_id: subjectId } = tutorResult.rows[0];

    if (!subjectId) {
      return NextResponse.json({ error: 'Tutor has no subject assigned' }, { status: 400 });
    }

    // Create assignment (without grade_id, it will be linked via assignment_grades)
    const assignmentResult = await query(
      `INSERT INTO assignments (tutor_id, subject_id, title, description, due_date, closing_time, max_score, is_group, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING id, title, description, due_date, closing_time, max_score, is_group, created_at`,
      [tutorId, subjectId, title, description || '', dueDate, closingTime, maxScore || 100, isGroup || false]
    );

    const assignmentId = assignmentResult.rows[0].id;

    if (process.env.NODE_ENV === 'development') {
      console.log('Assignment created:', assignmentId);
    }

    // Link assignment to all selected grades
    for (const gradeId of gradeIds) {
      await query(
        `INSERT INTO assignment_grades (assignment_id, grade_id)
        VALUES ($1, $2)
        ON CONFLICT (assignment_id, grade_id) DO NOTHING`,
        [assignmentId, parseInt(gradeId)]
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Linked assignment to ${gradeIds.length} grades`);
    }

    // Get enrolled students for all selected grades and subject
    const studentsResult = await query(
      `SELECT DISTINCT st.id FROM students st
      JOIN enrollments e ON st.id = e.student_id
      WHERE e.grade_id = ANY($1::int[]) AND e.subject_id = $2 AND e.status = 'active'`,
      [gradeIds.map(g => parseInt(g)), subjectId]
    );

    // Create submission records for all enrolled students
    for (const student of studentsResult.rows) {
      await query(
        `INSERT INTO assignment_submissions (assignment_id, student_id, status)
        VALUES ($1, $2, 'not_submitted')
        ON CONFLICT (assignment_id, student_id) DO NOTHING`,
        [assignmentId, student.id]
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Created submissions for ${studentsResult.rows.length} students`);
    }

    return NextResponse.json({
      message: 'Assignment created successfully',
      assignment: assignmentResult.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}