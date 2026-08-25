// ============================================
// FILE: app/api/admin/change-password/route.js
// ============================================
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/database';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Extract token preferring Authorization header, fallback to cookie
    const authHeader = request.headers.get('authorization');
    let token;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const cookieStore = await cookies();
      token = cookieStore.get('auth_token')?.value;
    }

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, role, new_password } = body;

    if (!fullName || !role || !new_password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['student', 'tutor'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be student or tutor' }, { status: 400 });
    }

    if (new_password.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    // Get target user from database by full_name and role
    const userResult = await query(
      'SELECT id FROM users WHERE full_name = $1 AND role = $2',
      [fullName.trim(), role]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found or role mismatch' }, { status: 404 });
    }

    const targetUserId = userResult.rows[0].id;

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, targetUserId]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Error changing password (admin):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}