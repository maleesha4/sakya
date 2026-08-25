// ============================================
// FILE: src/app/api/admin/students/route.js
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

    // Get search and grade filters from URL
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const gradeFilter = url.searchParams.get('grade') || ''; // 'all', '6', '7', ..., '11', or '' for all

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND u.full_name ILIKE $1';
      params.push(`%${search}%`);
    }

    if (gradeFilter && gradeFilter !== 'all') {
      whereClause += ` AND g.year = $${params.length + 1}`;
      params.push(gradeFilter);
    }

    // Query students with grade filter, joined to grades for grade info (no index_number)
    const result = await query(
      `
      SELECT 
        s.id, 
        u.full_name, 
        u.email,
        u.status,
        g.year as grade, 
        g.grade_name,
        s.gender, 
        s.date_of_birth, 
        s.address, 
        s.parent_name,
        s.profile_photo
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN grades g ON s.grade_id = g.id
      ${whereClause}
      ORDER BY g.year ASC, u.full_name ASC
      `,
      params
    );

    return NextResponse.json({ students: result.rows });
  } catch (error) {
    console.error('Error fetching students:', error);
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
    const { id, full_name, email, grade, gender, date_of_birth, address, parent_name, profile_photo, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    // Get user_id once
    const userResult = await query('SELECT user_id FROM students WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].user_id;

    // Update users table (name, email, status, profile_photo)
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
    if (status !== undefined) {
      userUpdates.push(`status = $${paramIndex++}`);
      userParams.push(status);
    }
    if (profile_photo !== undefined) {
      userUpdates.push(`profile_photo = $${paramIndex++}`);
      userParams.push(profile_photo);
    }

    if (userUpdates.length > 0) {
      userParams.push(userId);
      await query(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${paramIndex}`,
        userParams
      );
    }

    // Update students table (no index_number or parent_phone)
    const studentUpdates = [];
    const studentParams = [];
    paramIndex = 1;

    if (grade !== undefined) {
      // Map grade (year) to grade_id
      const gradeResult = await query('SELECT id FROM grades WHERE year = $1 AND status = $2', [grade, 'active']);
      if (gradeResult.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid grade selected' }, { status: 400 });
      }
      const gradeId = gradeResult.rows[0].id;
      studentUpdates.push(`grade_id = $${paramIndex++}`);
      studentParams.push(gradeId);
    }
    if (gender !== undefined) {
      studentUpdates.push(`gender = $${paramIndex++}`);
      studentParams.push(gender);
    }
    if (date_of_birth !== undefined) {
      studentUpdates.push(`date_of_birth = $${paramIndex++}`);
      studentParams.push(date_of_birth);
    }
    if (address !== undefined) {
      studentUpdates.push(`address = $${paramIndex++}`);
      studentParams.push(address.trim());
    }
    if (parent_name !== undefined) {
      studentUpdates.push(`parent_name = $${paramIndex++}`);
      studentParams.push(parent_name.trim());
    }

    if (studentUpdates.length > 0) {
      studentParams.push(id);
      await query(
        `UPDATE students SET ${studentUpdates.join(', ')} WHERE id = $${paramIndex}`,
        studentParams
      );
    }

    return NextResponse.json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Error updating student:', error);
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
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    // Get user_id first
    const userResult = await query('SELECT user_id FROM students WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].user_id;

    // Delete user (cascades to students)
    await query('DELETE FROM users WHERE id = $1', [userId]);

    return NextResponse.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}