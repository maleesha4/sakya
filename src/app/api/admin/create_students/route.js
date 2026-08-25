// ============================================
// FILE: src/app/api/admin/create_students/route.js
// ============================================
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/database';
import { hashPassword } from '../../../../lib/auth';

export async function POST(req) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing/malformed auth header');  // Debug log
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    let decodedUser;
    try {
      decodedUser = verifyToken(token);
    } catch (jwtErr) {
      console.log('Token verification failed:', jwtErr.message);  // Debug log
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    if (!decodedUser || decodedUser.role !== 'admin') {
      console.log('Decoded user:', decodedUser);  // Debug log
      return NextResponse.json({ error: 'Unauthorized - Admin required' }, { status: 401 });
    }

    const body = await req.json();
    const { students } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'Students array is required and must not be empty' }, { status: 400 });
    }

    const successes = [];
    const errors = [];

    for (const stu of students) {
      try {
        const { fullName, phone, gender, grade } = stu;

        // Set defaults
        const email = `${fullName.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
        const password = fullName;
        const dateOfBirth = null;
        const address = 'not given';
        const parentName = 'not given';
        const role = 'student';

        // Basic validation
        const requiredFields = [fullName, phone, gender, grade];
        if (requiredFields.some(f => !f || f.toString().trim() === '')) {
          throw new Error(`Missing required fields for ${fullName}`);
        }

        // Email validation (Gmail only)
        if (!email.trim().endsWith('@gmail.com')) {
          throw new Error(`Invalid email format for ${fullName}`);
        }

        // Phone validation (10 digits)
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
          throw new Error(`Invalid phone for ${fullName}: must be exactly 10 digits`);
        }

        // Check if email already exists
        const existingEmail = await query('SELECT id FROM users WHERE email = $1', [email.trim()]);
        if (existingEmail.rows.length > 0) {
          throw new Error(`Email already exists for ${fullName}`);
        }

        // Check if full_name already exists
        const existingUser = await query('SELECT id FROM users WHERE full_name = $1', [fullName.trim()]);
        if (existingUser.rows.length > 0) {
          throw new Error(`Full name already registered for ${fullName}`);
        }

        // Get grade_id for the selected grade
        const gradeResult = await query('SELECT id FROM grades WHERE year = $1 AND status = $2', [parseInt(grade), 'active']);
        if (gradeResult.rows.length === 0) {
          throw new Error(`Invalid grade for ${fullName}`);
        }
        const gradeId = gradeResult.rows[0].id;

        // Hash password
        const passwordHash = await hashPassword(password);

        // Insert into users table
        const userResult = await query(
          `INSERT INTO users
            (email, password_hash, role, full_name, phone, status)
           VALUES ($1, $2, $3, $4, $5, 'active')
           RETURNING id, full_name, role`,
          [email.trim(), passwordHash, role, fullName.trim(), phone]
        );
        const createdUser = userResult.rows[0];

        // Insert into students table
        const indexNumber = `REG${new Date().getFullYear()}${createdUser.id.toString().padStart(5, '0')}`;
        await query(
          `INSERT INTO students (user_id, index_number, grade_id, date_of_birth, address, parent_name, gender, joined_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)`,
          [createdUser.id, indexNumber, gradeId, dateOfBirth, address, parentName, gender]
        );

        successes.push({
          fullName: createdUser.full_name,
          id: createdUser.id
        });

      } catch (err) {
        errors.push({
          fullName: stu.fullName,
          error: err.message
        });
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        message: `Partial success: ${successes.length} created, ${errors.length} failed`,
        successes,
        errors
      }, { status: 207 }); // Multi-status
    }

    return NextResponse.json({
      message: 'All students created successfully',
      successes
    });

  } catch (error) {
    console.error('Error in bulk create students:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}