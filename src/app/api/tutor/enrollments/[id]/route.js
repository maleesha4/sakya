// app/api/tutor/enrollments/[id]/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth';
import { query } from '../../../../../lib/database';

export async function DELETE(req, { params }) {
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
      console.log('Tutor user ID for unenroll:', decoded.id);
    }

    // Await params (Next.js 15+ requirement for dynamic routes)
    const { id } = await params;  // enrollmentId

    // Get tutor_id to verify ownership
    const tutorRes = await query('SELECT id FROM tutors WHERE user_id = $1', [decoded.id]);
    const tutorId = tutorRes.rows[0]?.id;
    if (!tutorId) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    // Update (soft delete) with RETURNING to confirm
    const updateRes = await query(
      'UPDATE enrollments SET status = \'inactive\' WHERE id = $1 AND tutor_id = $2 RETURNING id',
      [id, tutorId]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Enrollment not found or not owned by you' }, { status: 404 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Unenrolled enrollment ID ${id} for tutor ${tutorId}`);
    }

    return NextResponse.json({ message: 'Student unenrolled successfully' });
  } catch (error) {
    console.error('Error unenrolling student:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}