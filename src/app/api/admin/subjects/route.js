// ============================================
// FILE: src/app/api/admin/subjects/route.js
// Aligned with schema: subjects(subject_code, subject_name, description, is_active)
// ============================================
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/database';

function generateSubjectCode(name) {
  // Generate a code like MATH, SCI from uppercase initials, fallback to first 4 chars
  const code = name
    .split(/\s+/)
    .map(word => word[0]?.toUpperCase())
    .join('')
    .replace(/[^A-Z]/g, '')
    .slice(0, 6);
  return code || name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function getAdminUser(headersList) {
  const authHeader = headersList.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user || user.role !== 'admin') {
    return { error: 'Unauthorized', status: 401 };
  }
  return { user };
}

export async function GET(req) {
  try {
    const headersList = await headers();
    const auth = getAdminUser(headersList);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND subject_name ILIKE $1';
      params.push(`%${search}%`);
    }

    const result = await query(
      `SELECT id, subject_name AS name, subject_code FROM subjects ${whereClause} ORDER BY subject_name`,
      params
    );

    return NextResponse.json({ subjects: result.rows });

  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const headersList = await headers();
    const auth = getAdminUser(headersList);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { name, subject_code, description } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
    }

    const subjectName = name.trim();
    let code = subject_code?.trim().toUpperCase() || generateSubjectCode(subjectName);

    // Ensure code is unique
    let finalCode = code;
    let counter = 1;
    while (true) {
      const existingCode = await query('SELECT id FROM subjects WHERE subject_code = $1', [finalCode]);
      if (existingCode.rows.length === 0) break;
      finalCode = `${code}${counter}`;
      counter++;
    }

    const existingName = await query('SELECT id FROM subjects WHERE subject_name = $1', [subjectName]);
    if (existingName.rows.length > 0) {
      return NextResponse.json({ error: 'Subject already exists' }, { status: 400 });
    }

    const result = await query(
      'INSERT INTO subjects (subject_code, subject_name, description) VALUES ($1, $2, $3) RETURNING id, subject_name AS name, subject_code',
      [finalCode, subjectName, description || null]
    );

    return NextResponse.json({
      message: 'Subject created successfully',
      subject: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const headersList = await headers();
    const auth = getAdminUser(headersList);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { id, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'Subject ID required' }, { status: 400 });
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
    }

    const existing = await query('SELECT id FROM subjects WHERE subject_name = $1 AND id != $2', [name.trim(), id]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Subject name already exists' }, { status: 400 });
    }

    await query(
      'UPDATE subjects SET subject_name = $1 WHERE id = $2',
      [name.trim(), id]
    );

    return NextResponse.json({ message: 'Subject updated successfully' });
  } catch (error) {
    console.error('Error updating subject:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const headersList = await headers();
    const auth = getAdminUser(headersList);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Subject ID required' }, { status: 400 });
    }

    try {
      const result = await query('DELETE FROM subjects WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Subject deleted successfully' });
    } catch (dbError) {
      console.error('Database error during deletion:', dbError);
      
      if (dbError.code === '23503') {
        return NextResponse.json({ 
          error: 'Cannot delete subject: It is being used by other records' 
        }, { status: 400 });
      }
      
      throw dbError;
    }

  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
