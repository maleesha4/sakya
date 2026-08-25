// ============================================
// FILE: app/api/tutor/marks/route.js
// ============================================
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

    if (!decoded || decoded.role !== 'tutor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Tutor user ID for marks:', decoded.id);
    }

    const url = new URL(req.url);
    const examId = url.searchParams.get('examId');

    if (!examId) {
      return NextResponse.json({ error: 'examId is required' }, { status: 400 });
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

    // FIXED: Properly filter by exam_id through the registration
    const result = await query(`
      SELECT 
        aesc.id as choice_id,
        aer.id as registration_id,
        u.full_name as student_name,
        aer.admission_number,
        sub.name as subject_name,
        aem.score,
        aem.marked_at,
        ae.exam_name,
        ae.exam_date,
        g.grade_name
      FROM admin_exam_subject_tutors aest
      JOIN admin_exams ae ON aest.admin_exam_id = ae.id
      JOIN grades g ON ae.grade_id = g.id
      JOIN admin_exam_subjects aes ON aest.admin_exam_id = aes.admin_exam_id 
        AND aest.subject_id = aes.subject_id
      JOIN admin_exam_registrations aer ON aer.admin_exam_id = ae.id
      JOIN admin_exam_student_choices aesc ON aesc.registration_id = aer.id 
        AND aesc.subject_id = aes.subject_id
      JOIN students s ON aer.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN subjects sub ON aesc.subject_id = sub.id
      LEFT JOIN admin_exam_marks aem ON aesc.id = aem.choice_id AND aem.tutor_id = $1
      WHERE aest.tutor_id = $1
        AND aest.admin_exam_id = $2
        AND aer.status IN ('registered', 'confirmed')
      ORDER BY u.full_name ASC, sub.name ASC
    `, [tutorId, examId]);

    if (process.env.NODE_ENV === 'development') {
      console.log(`Marks for exam ${examId}, tutor ${tutorId}:`, result.rows.length, 'choices');
    }

    return NextResponse.json({ choices: result.rows });
  } catch (error) {
    console.error('Error fetching marks:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
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
    const { choiceId, score: rawScore } = body;

    // Basic presence check
    if (!choiceId || rawScore === undefined || rawScore === null || rawScore === '') {
      return NextResponse.json({ error: 'Invalid input: choiceId and score are required' }, { status: 400 });
    }

    // Parse score safely
    const parsedScore = parseInt(rawScore, 10);

    // Check if parsing resulted in a valid number
    if (isNaN(parsedScore)) {
      return NextResponse.json({ error: 'Score must be a valid number' }, { status: 400 });
    }

    // Validate range: 0 to 100 inclusive
    if (parsedScore < 0 || parsedScore > 100) {
      return NextResponse.json({ error: 'Score must be between 0 and 100 inclusive' }, { status: 400 });
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

    // Verify tutor is assigned to this choice's exam/subject
    const assignmentCheck = await query(`
      SELECT 1 
      FROM admin_exam_student_choices aesc
      JOIN admin_exam_registrations aer ON aesc.registration_id = aer.id
      JOIN admin_exam_subject_tutors aest ON aer.admin_exam_id = aest.admin_exam_id 
        AND aesc.subject_id = aest.subject_id 
        AND aest.tutor_id = $2
      WHERE aesc.id = $1
    `, [choiceId, tutorId]);

    if (assignmentCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Not assigned to this exam/subject' }, { status: 403 });
    }

    // Upsert the mark (now safely allows 0)
    await query(`
      INSERT INTO admin_exam_marks (choice_id, tutor_id, score)
      VALUES ($1, $2, $3)
      ON CONFLICT (choice_id, tutor_id) DO UPDATE SET
        score = EXCLUDED.score, 
        marked_at = CURRENT_TIMESTAMP
    `, [choiceId, tutorId, parsedScore]);

    if (process.env.NODE_ENV === 'development') {
      console.log(`Mark saved: choice ${choiceId}, score ${parsedScore} by tutor ${tutorId}`);
    }

    return NextResponse.json({ message: 'Mark saved successfully' });
  } catch (error) {
    console.error('Error saving mark:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}