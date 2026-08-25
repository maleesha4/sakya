// src/app/api/auth/me/route.js
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

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const result = await query(`
      SELECT 
        u.id AS user_id,
        u.email,
        u.role,
        u.full_name,
        u.phone,
        s.id AS student_id,
        s.profile_photo,
        s.grade_id,
        s.index_number,
        g.grade_name AS grade_name
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN grades g ON g.id = s.grade_id
      WHERE u.id = $1
      LIMIT 1
    `, [decoded.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const dbUser = result.rows[0];

    const user = {
      id: dbUser.user_id,
      email: dbUser.email,
      role: dbUser.role,
      full_name: dbUser.full_name,
      phone: dbUser.phone,
      profile_photo: dbUser.profile_photo,
      student_id: dbUser.student_id,
      index_number: dbUser.index_number,
      grade_id: dbUser.grade_id,
      grade_name: dbUser.grade_name
    };

    return NextResponse.json({ user });

  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}