// app/api/tutor/analytics/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/database';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'tutor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tutorId = decoded.id;

    // Averages per grade
    const averagesRes = await query(
      `SELECT g.year, AVG(m.score) as avg_score
       FROM marks m
       JOIN enrollments e ON m.enrollment_id = e.id
       JOIN grades g ON e.grade_id = g.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE t.user_id = $1
       GROUP BY g.year
       ORDER BY g.year`,
      [tutorId]
    );

    const averages = {};
    averagesRes.rows.forEach(row => {
      averages[row.year] = parseFloat(row.avg_score) || 0;
    });

    // Top students (highest avg score)
    const topStudentsRes = await query(
      `SELECT s.full_name as name, AVG(m.score) as avg_score
       FROM marks m
       JOIN enrollments e ON m.enrollment_id = e.id
       JOIN students s ON e.student_id = s.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE t.user_id = $1
       GROUP BY s.id, s.full_name
       ORDER BY avg_score DESC
       LIMIT 10`,
      [tutorId]
    );

    const topStudents = topStudentsRes.rows.map(row => ({
      id: row.id,  // Assume id added if needed
      name: row.name,
      avgScore: parseFloat(row.avg_score) || 0
    }));

    const analytics = { averages, topStudents };

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}