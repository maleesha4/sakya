// ============================================
// FILE: app/api/admin/reports/grade-distribution/route.js
// FINAL VERSION WITH EXACT 0 MARKS COUNT PER SUBJECT
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
    const examId = parseInt(searchParams.get('examId'));
    if (!examId) {
      return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });
    }

    // Total registered students
    const totalStudentsResult = await query(
      `SELECT COUNT(*) AS total 
       FROM admin_exam_registrations 
       WHERE admin_exam_id = $1 AND status IN ('registered', 'confirmed')`,
      [examId]
    );
    const total = parseInt(totalStudentsResult.rows[0].total);

    // Overall grade distribution (average-based)
    const avgResult = await query(`
      WITH marks AS (
        SELECT aer.id AS registration_id,
               COALESCE(aem.score, 0) AS score
        FROM admin_exam_registrations aer
        LEFT JOIN admin_exam_student_choices aesc ON aesc.registration_id = aer.id
        LEFT JOIN admin_exam_marks aem ON aem.choice_id = aesc.id
        WHERE aer.admin_exam_id = $1
          AND aer.status IN ('registered', 'confirmed')
      ),
      student_stats AS (
        SELECT registration_id,
               AVG(score) AS average
        FROM marks
        GROUP BY registration_id
      )
      SELECT 
        CASE 
          WHEN average >= 75 THEN 'A'
          WHEN average >= 65 THEN 'B'
          WHEN average >= 50 THEN 'C'
          WHEN average >= 35 THEN 'S'
          ELSE 'W'
        END AS grade,
        COUNT(*) AS count
      FROM student_stats
      GROUP BY 
        CASE 
          WHEN average >= 75 THEN 'A'
          WHEN average >= 65 THEN 'B'
          WHEN average >= 50 THEN 'C'
          WHEN average >= 35 THEN 'S'
          ELSE 'W'
        END
      ORDER BY
        CASE 
          WHEN (CASE WHEN average >= 75 THEN 'A' WHEN average >= 65 THEN 'B' WHEN average >= 50 THEN 'C' WHEN average >= 35 THEN 'S' ELSE 'W' END) = 'A' THEN 1
          WHEN (CASE WHEN average >= 75 THEN 'A' WHEN average >= 65 THEN 'B' WHEN average >= 50 THEN 'C' WHEN average >= 35 THEN 'S' ELSE 'W' END) = 'B' THEN 2
          WHEN (CASE WHEN average >= 75 THEN 'A' WHEN average >= 65 THEN 'B' WHEN average >= 50 THEN 'C' WHEN average >= 35 THEN 'S' ELSE 'W' END) = 'C' THEN 3
          WHEN (CASE WHEN average >= 75 THEN 'A' WHEN average >= 65 THEN 'B' WHEN average >= 50 THEN 'C' WHEN average >= 35 THEN 'S' ELSE 'W' END) = 'S' THEN 4
          ELSE 5
        END;
    `, [examId]);

    const distribution = avgResult.rows.map(row => ({
      grade: row.grade,
      count: parseInt(row.count),
      percentage: ((parseInt(row.count) / total) * 100).toFixed(2)
    }));

    // Subject-wise grade distribution (including absent as W)
    const subjectResult = await query(`
      SELECT 
        s.name AS subject_name,
        CASE 
          WHEN COALESCE(aem.score, 0) >= 75 THEN 'A'
          WHEN COALESCE(aem.score, 0) >= 65 THEN 'B'
          WHEN COALESCE(aem.score, 0) >= 50 THEN 'C'
          WHEN COALESCE(aem.score, 0) >= 35 THEN 'S'
          ELSE 'W'
        END AS grade,
        COUNT(*) AS count
      FROM admin_exam_registrations aer
      CROSS JOIN subjects s
      LEFT JOIN admin_exam_student_choices aesc 
        ON aesc.registration_id = aer.id AND aesc.subject_id = s.id
      LEFT JOIN admin_exam_marks aem ON aem.choice_id = aesc.id
      WHERE aer.admin_exam_id = $1
        AND aer.status IN ('registered', 'confirmed')
      GROUP BY s.name,
        CASE 
          WHEN COALESCE(aem.score, 0) >= 75 THEN 'A'
          WHEN COALESCE(aem.score, 0) >= 65 THEN 'B'
          WHEN COALESCE(aem.score, 0) >= 50 THEN 'C'
          WHEN COALESCE(aem.score, 0) >= 35 THEN 'S'
          ELSE 'W'
        END
      ORDER BY s.name,
        CASE 
          WHEN (CASE WHEN COALESCE(aem.score, 0) >= 75 THEN 'A' WHEN COALESCE(aem.score, 0) >= 65 THEN 'B' WHEN COALESCE(aem.score, 0) >= 50 THEN 'C' WHEN COALESCE(aem.score, 0) >= 35 THEN 'S' ELSE 'W' END) = 'A' THEN 1
          WHEN (CASE WHEN COALESCE(aem.score, 0) >= 75 THEN 'A' WHEN COALESCE(aem.score, 0) >= 65 THEN 'B' WHEN COALESCE(aem.score, 0) >= 50 THEN 'C' WHEN COALESCE(aem.score, 0) >= 35 THEN 'S' ELSE 'W' END) = 'B' THEN 2
          WHEN (CASE WHEN COALESCE(aem.score, 0) >= 75 THEN 'A' WHEN COALESCE(aem.score, 0) >= 65 THEN 'B' WHEN COALESCE(aem.score, 0) >= 50 THEN 'C' WHEN COALESCE(aem.score, 0) >= 35 THEN 'S' ELSE 'W' END) = 'C' THEN 3
          WHEN (CASE WHEN COALESCE(aem.score, 0) >= 75 THEN 'A' WHEN COALESCE(aem.score, 0) >= 65 THEN 'B' WHEN COALESCE(aem.score, 0) >= 50 THEN 'C' WHEN COALESCE(aem.score, 0) >= 35 THEN 'S' ELSE 'W' END) = 'S' THEN 4
          ELSE 5
        END;
    `, [examId]);

    const subjectDistribution = {};
    subjectResult.rows.forEach(row => {
      const subj = row.subject_name;
      if (!subjectDistribution[subj]) subjectDistribution[subj] = {};
      subjectDistribution[subj][row.grade] = parseInt(row.count);
    });

    // NEW: Count students who scored EXACTLY 0 (not absent)
    const zeroMarksResult = await query(`
      SELECT 
        s.name AS subject_name,
        COUNT(*) AS zero_count
      FROM admin_exam_registrations aer
      CROSS JOIN subjects s
      LEFT JOIN admin_exam_student_choices aesc 
        ON aesc.registration_id = aer.id AND aesc.subject_id = s.id
      LEFT JOIN admin_exam_marks aem ON aem.choice_id = aesc.id
      WHERE aer.admin_exam_id = $1
        AND aer.status IN ('registered', 'confirmed')
        AND aem.score = 0  -- Only explicit zero marks
      GROUP BY s.name;
    `, [examId]);

    const zeroCounts = {};
    zeroMarksResult.rows.forEach(row => {
      zeroCounts[row.subject_name] = parseInt(row.zero_count);
    });

    // Grade combinations
    const comboResult = await query(`
      WITH all_subjects AS (
        SELECT aer.id AS registration_id,
               u.full_name AS student_name,
               COALESCE(aem.score, 0) AS score
        FROM admin_exam_registrations aer
        JOIN students st ON aer.student_id = st.id
        JOIN users u ON st.user_id = u.id
        CROSS JOIN subjects s
        LEFT JOIN admin_exam_student_choices aesc 
          ON aesc.registration_id = aer.id AND aesc.subject_id = s.id
        LEFT JOIN admin_exam_marks aem ON aem.choice_id = aesc.id
        WHERE aer.admin_exam_id = $1
          AND aer.status IN ('registered', 'confirmed')
      ),
      grade_counts AS (
        SELECT 
          registration_id,
          student_name,
          CASE 
            WHEN score >= 75 THEN 'A'
            WHEN score >= 65 THEN 'B'
            WHEN score >= 50 THEN 'C'
            WHEN score >= 35 THEN 'S'
            ELSE 'W'
          END AS grade,
          COUNT(*) AS cnt
        FROM all_subjects
        GROUP BY registration_id, student_name, grade
      )
      SELECT 
        student_name,
        string_agg(grade || ':' || cnt, ', ' ORDER BY 
          CASE grade
            WHEN 'A' THEN 1
            WHEN 'B' THEN 2
            WHEN 'C' THEN 3
            WHEN 'S' THEN 4
            WHEN 'W' THEN 5
          END
        ) AS combination
      FROM grade_counts
      GROUP BY registration_id, student_name;
    `, [examId]);

    const combinations = {};
    comboResult.rows.forEach(row => {
      const key = row.combination || '(no marks)';
      if (!combinations[key]) {
        combinations[key] = { count: 0, students: [] };
      }
      combinations[key].count++;
      combinations[key].students.push(row.student_name);
    });

    const topCombinations = Object.entries(combinations)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 15)
      .map(([combination, data]) => ({ combination, ...data }));

    // Return all data including zeroCounts
    return NextResponse.json({
      distribution,
      subjectDistribution,
      topCombinations,
      total,
      zeroCounts  // ← New data for frontend
    });
  } catch (error) {
    console.error('Error fetching grade distribution:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}