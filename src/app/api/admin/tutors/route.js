// ============================================
// FILE: src/app/api/admin/tutors/route.js
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search and status filters from URL
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const statusFilter = url.searchParams.get('status') || ''; // 'active', 'inactive', 'suspended', or '' for all

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND u.full_name ILIKE $1';
      params.push(`%${search}%`);
    }

    if (statusFilter && statusFilter !== 'all') {
      whereClause += ` AND u.status = $${params.length + 1}`;
      params.push(statusFilter);
    }

    // Query tutors with subjects
    const result = await query(
      `
      SELECT 
        t.id, 
        u.full_name, 
        u.email,
        u.phone,
        u.status,
        u.created_at as joined_date,
        sub.name as specialization
      FROM tutors t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN subjects sub ON t.subject_id = sub.id
      ${whereClause}
      ORDER BY u.created_at DESC, u.full_name ASC
      `,
      params
    );

    return NextResponse.json({ tutors: result.rows });
  } catch (error) {
    console.error('Error fetching tutors:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, full_name, email, phone, specialization, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Tutor ID required' }, { status: 400 });
    }

    // Get user_id once
    const userResult = await query('SELECT user_id FROM tutors WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].user_id;

    // Update users table (name, email, phone, status)
    const userUpdates = [];
    const userParams = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      userUpdates.push(`full_name = $${paramIndex++}`);
      userParams.push(full_name.trim());
    }
    if (email !== undefined) {
      userUpdates.push(`email = $${paramIndex++}`);
      userParams.push(email.trim());
    }
    if (phone !== undefined) {
      userUpdates.push(`phone = $${paramIndex++}`);
      userParams.push(phone);
    }
    if (status !== undefined) {
      userUpdates.push(`status = $${paramIndex++}`);
      userParams.push(status);
    }

    if (userUpdates.length > 0) {
      userParams.push(userId);
      await query(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${paramIndex}`,
        userParams
      );
    }

    // Update tutors table (specialization -> subject_id)
    const tutorUpdates = [];
    const tutorParams = [];
    paramIndex = 1;

    if (specialization !== undefined) {
      // Map specialization (name) to subject_id
      const subjectResult = await query('SELECT id FROM subjects WHERE subject_name = $1', [specialization]);
      if (subjectResult.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid subject selected' }, { status: 400 });
      }
      const subjectId = subjectResult.rows[0].id;
      tutorUpdates.push(`subject_id = $${paramIndex++}`);
      tutorParams.push(subjectId);
    }

    if (tutorUpdates.length > 0) {
      tutorParams.push(id);
      await query(
        `UPDATE tutors SET ${tutorUpdates.join(', ')} WHERE id = $${paramIndex}`,
        tutorParams
      );
    }

    return NextResponse.json({ message: 'Tutor updated successfully' });
  } catch (error) {
    console.error('Error updating tutor:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Tutor ID required' }, { status: 400 });
    }

    // Get user_id first
    const userResult = await query('SELECT user_id FROM tutors WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].user_id;

    // Delete user (cascades to tutors)
    await query('DELETE FROM users WHERE id = $1', [userId]);

    return NextResponse.json({ message: 'Tutor deleted successfully' });
  } catch (error) {
    console.error('Error deleting tutor:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}