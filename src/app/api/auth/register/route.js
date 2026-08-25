// app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { hashPassword } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      fullName,
      phone,
      role = 'student',
      dateOfBirth,
      address,
      parentName,
      gender,
      grade
    } = body;

    // --- Basic required fields check ---
    const requiredFields = [email, password, fullName, phone, role, dateOfBirth, address, parentName, gender, grade];
    if (requiredFields.some(f => !f || f.toString().trim() === '')) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // --- Email validation ---
    if (!email.endsWith('@gmail.com')) {
      return NextResponse.json({ error: 'Email must be a Gmail address' }, { status: 400 });
    }

    // --- Phone validation (10 digits) ---
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: 'Phone number must be exactly 10 digits' }, { status: 400 });
    }

    // --- Check if full_name already exists (unique for login) ---
    const existingUser = await query('SELECT id FROM users WHERE full_name = $1', [fullName]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'Full name already registered' }, { status: 400 });
    }

    // --- Hash password ---
    const passwordHash = await hashPassword(password);

    // --- Insert into users table ---
    const userResult = await query(
      `INSERT INTO users
        (email, password_hash, role, full_name, phone, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, full_name, role`,
      [email, passwordHash, role, fullName, phone]
    );
    const user = userResult.rows[0];

    // --- Get grade_id for the selected grade (assume grades table populated with year as grade value) ---
    const gradeResult = await query('SELECT id FROM grades WHERE year = $1 AND status = $2', [parseInt(grade), 'active']);
    if (gradeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid grade selected' }, { status: 400 });
    }
    const gradeId = gradeResult.rows[0].id;

    // --- Insert into students table if role is student ---
    if (role === 'student') {
      // Generate a unique index number: REG + year + user id
      const indexNumber = `REG${new Date().getFullYear()}${user.id.toString().padStart(5, '0')}`;

      await query(
        `INSERT INTO students
          (user_id, index_number, grade_id, date_of_birth, address, parent_name, gender, joined_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)`,
        [user.id, indexNumber, gradeId, dateOfBirth, address, parentName, gender]
      );
    }

    return NextResponse.json({
      message: 'Registration successful',
      user: {
        id: user.id,
        fullName: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}