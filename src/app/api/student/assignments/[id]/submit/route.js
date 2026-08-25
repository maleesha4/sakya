// src/app/api/student/assignments/[id]/submit/route.js

import pool from '../../../../../../lib/database';
import { verifyToken } from '../../../../../../lib/auth';
import { v2 as cloudinary } from 'cloudinary';


// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xlsx', 'xls', 'txt', 'jpg', 'jpeg', 'png', 'gif'];

export async function POST(request, { params: paramsPromise }) {
  try {
    const params = await paramsPromise;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
    }

    const assignmentId = params.id;
    const formData = await request.formData();
    const files = formData.getAll('files');
    const groupMembersJson = formData.get('groupMembers');
    const groupMembers = groupMembersJson ? JSON.parse(groupMembersJson) : [];

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ message: 'No files provided' }), { status: 400 });
    }

    let client;
    try {
      client = await pool.connect();
    } catch (error) {
      console.error('Database connection timeout:', error);
      return new Response(JSON.stringify({ message: 'Database connection timeout. Please try again.' }), { status: 503 });
    }

    try {
      const studentRes = await client.query(
        'SELECT id FROM students WHERE user_id = $1',
        [decoded.id]
      );

      if (studentRes.rows.length === 0) {
        return new Response(JSON.stringify({ message: 'Student not found' }), { status: 404 });
      }

      const studentId = studentRes.rows[0].id;

      const assignmentRes = await client.query(
        'SELECT id, due_date, closing_time, is_group FROM assignments WHERE id = $1',
        [assignmentId]
      );

      if (assignmentRes.rows.length === 0) {
        return new Response(JSON.stringify({ message: 'Assignment not found' }), { status: 404 });
      }

      const assignment = assignmentRes.rows[0];

      // Get current server time
      const timeRes = await client.query(`SELECT NOW() as server_time`);
      const serverNow = new Date(timeRes.rows[0].server_time);

      // Validate group members for group assignments
      if (assignment.is_group && (!groupMembers || groupMembers.length === 0)) {
        return new Response(JSON.stringify({
          message: 'This is a group assignment. Please select at least one group member to submit with.'
        }), { status: 400 });
      }

      // Parse deadline (due_date + closing_time)
      let dateStr = assignment.due_date;
      if (dateStr instanceof Date) {
        const year = dateStr.getFullYear();
        const month = String(dateStr.getMonth() + 1).padStart(2, '0');
        const day = String(dateStr.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }

      const timeStr = assignment.closing_time;
      const [year, month, day] = dateStr.split('-');
      const [hours, minutes, seconds] = timeStr.split(':');
      const dueDateTime = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds || 0));

      const gracePeriodDeadline = new Date(dueDateTime.getTime() + 24 * 60 * 60 * 1000);
      const isLate = serverNow > dueDateTime;

      if (serverNow > gracePeriodDeadline) {
        return new Response(JSON.stringify({
          message: 'Assignment submission period has ended. No more submissions accepted.'
        }), { status: 403 });
      }

      // Check for existing submission
      const submissionRes = await client.query(
        `SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2`,
        [assignmentId, studentId]
      );

      let submissionId;
      if (submissionRes.rows.length > 0) {
        submissionId = submissionRes.rows[0].id;
        await client.query(
          'DELETE FROM assignment_submission_files WHERE submission_id = $1',
          [submissionId]
        );
        // Optionally delete old group members if resubmitting
        await client.query(
          'DELETE FROM assignment_group_members WHERE submission_id = $1',
          [submissionId]
        );
      } else {
        const newSubmissionRes = await client.query(
          `INSERT INTO assignment_submissions (assignment_id, student_id, status, is_late, is_group)
           VALUES ($1, $2, 'submitted', $3, $4)
           RETURNING id`,
          [assignmentId, studentId, isLate, assignment.is_group]
        );
        submissionId = newSubmissionRes.rows[0].id;
      }

      // Update submission details
      await client.query(
        `UPDATE assignment_submissions 
         SET status = 'submitted', submission_date = NOW() AT TIME ZONE 'UTC', is_late = $1, is_group = $2
         WHERE id = $3`,
        [isLate, assignment.is_group, submissionId]
      );

      // Handle group members
      if (assignment.is_group && groupMembers.length > 0) {
        for (const memberId of groupMembers) {
          await client.query(
            `INSERT INTO assignment_group_members (submission_id, student_id)
             VALUES ($1, $2)
             ON CONFLICT (submission_id, student_id) DO NOTHING`,
            [submissionId, memberId]
          );
        }
      }

      // Upload files to Cloudinary
      const uploadedFiles = [];
      for (const file of files) {
        const ext = file.name.split('.').pop().toLowerCase();

        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return new Response(JSON.stringify({
            message: `File type .${ext} not allowed`
          }), { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.byteLength > MAX_FILE_SIZE) {
          return new Response(JSON.stringify({
            message: `File "${file.name}" is too large`
          }), { status: 400 });
        }

        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'assignment-submissions',
              resource_type: 'auto',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(buffer);
        });

        // Save file info to database
        const fileRes = await client.query(
          `INSERT INTO assignment_submission_files (submission_id, file_name, file_url, uploaded_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING file_name, file_url`,
          [submissionId, file.name, result.secure_url]
        );

        uploadedFiles.push(fileRes.rows[0]);
      }

      return new Response(JSON.stringify({
        message: 'Assignment submitted successfully',
        submission: {
          id: submissionId,
          status: 'submitted',
          is_late: isLate,
          files: uploadedFiles
        }
      }), { status: 200 });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in submit route:', error);

    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return new Response(JSON.stringify({ message: 'Request timeout. Please try again.' }), { status: 504 });
    }

    // Specific Cloudinary errors
    if (error.http_code || error.error) {
      console.error('Cloudinary upload error:', error);
      return new Response(JSON.stringify({ message: 'File upload failed. Please try again.' }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}