// ============================================
// FILE: app/api/admin/students/search/route.js (UPDATED - Remove admission_number)
// ============================================
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth';
import { query } from '../../../../../lib/database';

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';

    if (!search.trim()) {
      return NextResponse.json({ students: [] });
    }

    const sql = `
      SELECT 
        s.id,
        u.full_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE u.full_name ILIKE $1
      ORDER BY u.full_name 
      LIMIT 50
    `;
    const params = [`%${search.trim()}%`];

    const result = await query(sql, params);

    return NextResponse.json({ students: result.rows });
  } catch (error) {
    console.error('Error searching students:', error);
    return NextResponse.json({ error: 'Failed to search students' }, { status: 500 });
  }
}