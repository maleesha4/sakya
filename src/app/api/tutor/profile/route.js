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
      `SELECT t.id, t.user_id, s.id as subject_id, s.name as subject_name,
        u.full_name, u.email
      FROM tutors t
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.user_id = $1`,
      [decoded.id]
    );

    if (tutorResult.rows.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No tutor profile for user ID:', decoded.id);
      }
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    const tutor = tutorResult.rows[0];

    if (process.env.NODE_ENV === 'development') {
      console.log('Tutor profile:', tutor);
    }

    return NextResponse.json({ tutor });
  } catch (error) {
    console.error('Error fetching tutor profile:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}