// ============================================
// FILE: app/api/tutor/stats/route.js
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
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'tutor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Tutor user ID:', decoded.id);
    }

    // Get tutor ID
    const tutorResult = await query(
      'SELECT id FROM tutors WHERE user_id = $1',
      [decoded.id]
    );

    if (tutorResult.rows.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No tutor profile for user ID:', decoded.id);
      }
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    const tutorId = tutorResult.rows[0].id;
    if (process.env.NODE_ENV === 'development') {
      console.log('Tutor ID:', tutorId);
    }

    let mySubjects = [];
    let activeExams = 0;
    let totalPapers = 0;
    let studentCounts = {};

    try {
      // My Subjects: Distinct subjects from enrollments for this tutor
      const subjectsRes = await query(
        `SELECT DISTINCT s.id, s.name 
         FROM subjects s 
         JOIN enrollments e ON s.id = e.subject_id 
         WHERE e.tutor_id = $1 AND e.status = 'active'`,
        [tutorId]
      );
      mySubjects = subjectsRes.rows;
    } catch (subError) {
      console.error('Subjects query failed:', subError);
      mySubjects = [];  // Fallback
    }

    try {
      // Active Exams: Count distinct admin_exams where subjects match tutor's enrollments
      const activeExamsRes = await query(
        `SELECT COUNT(DISTINCT ae.id) as count 
         FROM admin_exams ae
         JOIN admin_exam_subjects aes ON ae.id = aes.admin_exam_id
         JOIN enrollments e ON aes.subject_id = e.subject_id
         WHERE e.tutor_id = $1 
           AND ae.status IN ('registration_open', 'in_progress')
           AND e.status = 'active'`,
        [tutorId]
      );
      activeExams = parseInt(activeExamsRes.rows[0]?.count || 0);
    } catch (examError) {
      console.error('Active exams query failed:', examError);
      activeExams = 0;  // Fallback
    }

    try {
      // Total Papers: Count from papers table by tutor_id
      const papersRes = await query(
        'SELECT COUNT(*) as count FROM papers WHERE tutor_id = $1 AND status = \'published\'',
        [tutorId]
      );
      totalPapers = parseInt(papersRes.rows[0]?.count || 0);
    } catch (paperError) {
      console.error('Papers query failed:', paperError);
      totalPapers = 0;  // Fallback
    }

    try {
      // Student Counts per Grade: Distinct students from enrollments, grouped by grade year
      const studentCountsRes = await query(
        `SELECT g.year, COUNT(DISTINCT e.student_id) as count 
         FROM enrollments e
         JOIN grades g ON e.grade_id = g.id
         WHERE e.tutor_id = $1 AND e.status = 'active'
         GROUP BY g.year 
         ORDER BY g.year`,
        [tutorId]
      );
      studentCountsRes.rows.forEach(row => {
        studentCounts[row.year] = parseInt(row.count);
      });
    } catch (studentError) {
      console.error('Student counts query failed:', studentError);
      studentCounts = {};  // Fallback
    }

    const stats = {
      mySubjects,
      activeExams,
      totalPapers,
      studentCounts
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('Stats response:', stats);
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching tutor stats:', error);
    // Return empty stats instead of 500 to avoid frontend skip
    return NextResponse.json({ 
      stats: { mySubjects: [], activeExams: 0, totalPapers: 0, studentCounts: {} } 
    });
  }
}