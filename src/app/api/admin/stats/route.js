// ============================================
// FILE: src/app/api/admin/stats/route.js
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
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get statistics with parallel queries, filtering for active users/exams where appropriate
    const [studentsRes, tutorsRes, examsRes, activeExamsRes, pendingRegsRes] = await Promise.all([
      query(`
        SELECT 
          COALESCE(SUM(CASE WHEN g.year = 6 THEN 1 ELSE 0 END), 0) as grade6,
          COALESCE(SUM(CASE WHEN g.year = 7 THEN 1 ELSE 0 END), 0) as grade7,
          COALESCE(SUM(CASE WHEN g.year = 8 THEN 1 ELSE 0 END), 0) as grade8,
          COALESCE(SUM(CASE WHEN g.year = 9 THEN 1 ELSE 0 END), 0) as grade9,
          COALESCE(SUM(CASE WHEN g.year = 10 THEN 1 ELSE 0 END), 0) as grade10,
          COALESCE(SUM(CASE WHEN g.year = 11 THEN 1 ELSE 0 END), 0) as grade11
        FROM students s
        JOIN users u ON s.user_id = u.id AND u.status = 'active'
        JOIN grades g ON s.grade_id = g.id AND g.status = 'active'
      `),
      query('SELECT COUNT(*) as count FROM users WHERE role = $1 AND status = $2', ['tutor', 'active']),
      query('SELECT COUNT(*) as count FROM admin_exams'),
      query("SELECT COUNT(*) as count FROM admin_exams WHERE status IN ('registration_open', 'in_progress')"),
      query(`
        SELECT COUNT(*) as count 
        FROM admin_exam_registrations aer 
        JOIN admin_exams ae ON aer.admin_exam_id = ae.id 
        WHERE aer.status = 'registered' 
          AND ae.status IN ('registration_open', 'in_progress')
      `)
    ]);

    return NextResponse.json({
      stats: {
        totalStudents: studentsRes.rows[0],
        totalTutors: Number(tutorsRes.rows[0].count) || 0,
        totalExams: Number(examsRes.rows[0].count) || 0,
        activeExams: Number(activeExamsRes.rows[0].count) || 0,
        pendingRegistrations: Number(pendingRegsRes.rows[0].count) || 0,
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}