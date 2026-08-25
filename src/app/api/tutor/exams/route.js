// ============================================
// FILE: app/api/tutor/exams/route.js
// ============================================
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
    const user = verifyToken(token);

    if (!user || user.role !== 'tutor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Tutor user ID:', user.id);
    }

    // Get tutor ID
    const tutorResult = await query(
      'SELECT id FROM tutors WHERE user_id = $1',
      [user.id]
    );

    if (tutorResult.rows.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No tutor profile for user ID:', user.id);
      }
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    const tutorId = tutorResult.rows[0].id;
    if (process.env.NODE_ENV === 'development') {
      console.log('Tutor ID:', tutorId);
    }

    // Fetch recent active admin_exams assigned to tutor (strict: only via admin_exam_subject_tutors)
    const examsResult = await query(`
      SELECT DISTINCT
        ae.id,
        ae.exam_name,
        ae.exam_date,
        ae.status,
        g.grade_name
      FROM admin_exams ae
      JOIN grades g ON ae.grade_id = g.id
      JOIN admin_exam_subjects aes ON ae.id = aes.admin_exam_id
      JOIN admin_exam_subject_tutors aest ON aes.admin_exam_id = aest.admin_exam_id 
        AND aes.subject_id = aest.subject_id 
        AND aest.tutor_id = $1
      WHERE ae.status IN ('registration_open', 'send_admission_cards', 'in_progress', 'completed', 'published')
      ORDER BY ae.exam_date DESC
      LIMIT 5
    `, [tutorId]);

    if (process.env.NODE_ENV === 'development') {
      console.log('Exams query rows:', examsResult.rows.length);
      console.log('Exams rows:', examsResult.rows);
    }

    // For each exam, fetch student count per assigned subject
    const examsWithCounts = await Promise.all(
      examsResult.rows.map(async (exam) => {
        let student_count_per_subject = {};
        try {
          const countsResult = await query(`
            SELECT 
              sub.name as subject_name,
              COUNT(DISTINCT aer.id) as student_count
            FROM admin_exam_subjects aes
            JOIN admin_exam_subject_tutors aest ON aes.admin_exam_id = aest.admin_exam_id 
              AND aes.subject_id = aest.subject_id 
              AND aest.tutor_id = $2
            JOIN admin_exam_registrations aer ON aes.admin_exam_id = aer.admin_exam_id
            JOIN admin_exam_student_choices aesc ON aer.id = aesc.registration_id AND aes.subject_id = aesc.subject_id
            JOIN subjects sub ON aes.subject_id = sub.id
            WHERE aes.admin_exam_id = $1 
              AND aer.status = 'confirmed'
            GROUP BY sub.id, sub.name
          `, [exam.id, tutorId]);

          if (process.env.NODE_ENV === 'development') {
            console.log(`Counts for exam ${exam.id}:`, countsResult.rows);
          }

          student_count_per_subject = Object.fromEntries(
            countsResult.rows.map(row => [row.subject_name, parseInt(row.student_count || 0)])
          );
        } catch (countError) {
          console.error(`Error fetching counts for exam ${exam.id}:`, countError);
          // Continue without counts, return empty object
        }

        return {
          ...exam,
          student_count_per_subject
        };
      })
    );

    return NextResponse.json({ exams: examsWithCounts });
  } catch (error) {
    console.error('Error fetching tutor exams:', error);
    return NextResponse.json({ 
      exams: []  // Empty fallback, no 500 block
    }, { status: 200 });
  }
}