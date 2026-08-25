// ============================================
// FILE: app/api/admin/exams/route.js (UPDATED)
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

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(`
      SELECT 
        ae.id,
        ae.exam_name,
        ae.exam_date,
        ae.registration_start_date,
        ae.registration_end_date,
        ae.status,
        ae.description,
        ae.created_at,
        g.grade_name,
        COUNT(DISTINCT aer.id) as registration_count
      FROM admin_exams ae
      LEFT JOIN grades g ON ae.grade_id = g.id
      LEFT JOIN admin_exam_registrations aer ON ae.id = aer.admin_exam_id
      GROUP BY ae.id, g.grade_name
      ORDER BY ae.created_at DESC
    `);

    return NextResponse.json({ exams: result.rows });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { exam_name, grade_ids, exam_date, registration_start_date, registration_end_date, description, subject_ids, status } = body;
    
    // Validation
    if (!exam_name || !grade_ids || grade_ids.length === 0) {
      return NextResponse.json({ error: 'Exam name and grade are required' }, { status: 400 });
    }

    if (!subject_ids || subject_ids.length === 0) {
      return NextResponse.json({ error: 'At least one subject is required' }, { status: 400 });
    }

    const startDate = new Date(registration_start_date);
    const endDate = new Date(registration_end_date);
    const examD = new Date(exam_date);

    if (endDate <= startDate) {
      return NextResponse.json({ error: 'Registration end date must be after start date' }, { status: 400 });
    }

    if (examD <= endDate) {
      return NextResponse.json({ error: 'Exam date must be after registration end date' }, { status: 400 });
    }

    // Get admin ID from admins table
    const adminResult = await query('SELECT id FROM admins WHERE user_id = $1', [user.id]);
    if (adminResult.rows.length === 0) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 400 });
    }
    const adminId = adminResult.rows[0].id;

    // Insert exam (use first grade_id)
    const examResult = await query(
      `INSERT INTO admin_exams 
        (exam_name, grade_id, exam_date, registration_start_date, registration_end_date, description, status, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [exam_name, parseInt(grade_ids[0]), exam_date, registration_start_date, registration_end_date, description, status || 'draft', adminId]
    );

    const examId = examResult.rows[0].id;

    // Insert subjects
    for (const subjectId of subject_ids) {
      await query(
        `INSERT INTO admin_exam_subjects (admin_exam_id, subject_id) 
         VALUES ($1, $2) 
         ON CONFLICT (admin_exam_id, subject_id) DO NOTHING`,
        [examId, parseInt(subjectId)]
      );
    }

    return NextResponse.json({ id: examId, success: true }, { status: 201 });
  } catch (error) {
    console.error('Insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}