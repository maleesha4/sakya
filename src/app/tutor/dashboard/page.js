// ============================================
// FILE: src/app/tutor/dashboard/page.js (DARK MODE SUPPORT)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';
import ChangePasswordModal from '../../../components/ChangePasswordModal';

export default function TutorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    mySubjects: [],        // array of {id, name}
    activeExams: 0,
    totalPapers: 0,
    studentCounts: {}      // e.g., {6: count, 7: count, ...}
  });
  const [recentExams, setRecentExams] = useState([]);  // array of {id, exam_name, date, student_count_per_subject}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');  // New: For role/auth errors
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError('');  // Clear previous errors

      // Fetch logged-in user
      const userRes = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (!userRes.ok) {
        localStorage.removeItem('auth_token');
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      const fetchedUser = userData.user;

      // NEW: Role check - Backup to middleware
      if (fetchedUser.role !== 'tutor') {
        setError('Access denied: Insufficient permissions. Redirecting...');
        setTimeout(() => {
          localStorage.removeItem('auth_token');
          router.push('/login');
        }, 1500);  // Brief message before redirect
        return;
      }

      setUser(fetchedUser);

      // Fetch stats (subjects, active exams count, etc.)
      const statsRes = await fetch('/api/tutor/stats', { headers: getAuthHeaders() });
      if (!statsRes.ok) {
        console.error('Stats fetch failed:', statsRes.status);
        // Don't block UI on stats failure
      } else {
        const statsData = await statsRes.json();
        setStats(statsData.stats || {});
      }

      // Fetch recent exams (assigned admin_exams with student counts per subject)
      const examsRes = await fetch('/api/tutor/exams', { headers: getAuthHeaders() });
      if (!examsRes.ok) {
        console.error('Exams fetch failed:', examsRes.status);
        // Don't block UI on exams failure
      } else {
        const examsData = await examsRes.json();
        setRecentExams(examsData.exams || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      // Updated: Dark mode for loading screen
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-xl text-gray-700 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      // Updated: Dark mode for error screen
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-xl mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      // Updated: Dark mode for access denied
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-red-600 dark:text-red-400">Access denied. Please log in.</p>
      </div>
    );
  }

  return (
    // Updated: Page background for dark mode
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Navbar user={user} />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        {/* Updated: Header text for dark mode */}
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Tutor Dashboard</h1>

        {/* Stats Cards - Updated: Colors and text for dark mode */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* My Subjects */}
          <div className="bg-blue-500 dark:bg-blue-600 text-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">My Subjects</h3>
            <br />
            <div className="text-lg mt-2 space-y-1">
              {(stats.mySubjects || []).map(sub => (
                <p key={sub.id}>{sub.name}</p>
              ))}
            </div>
          </div>

          {/* Active Exams */}
          <div className="bg-green-500 dark:bg-green-600 text-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Active Exams</h3>
            <p className="text-4xl font-bold">{stats.activeExams}</p>
          </div>

          {/* Papers Uploaded */}
          <div className="bg-orange-500 dark:bg-orange-600 text-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Papers Uploaded</h3>
            <p className="text-4xl font-bold">{stats.totalPapers}</p>
          </div>

          {/* Total Students */}
          <div className="bg-purple-500 dark:bg-purple-600 text-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Students</h3>
            {Object.keys(stats.studentCounts || {}).length > 0 ? (
              <div className="text-lg space-y-1">
                <p>Grade 6: {stats.studentCounts[6] || 0}</p>
                <p>Grade 7: {stats.studentCounts[7] || 0}</p>
                <p>Grade 8: {stats.studentCounts[8] || 0}</p>
                <p>Grade 9: {stats.studentCounts[9] || 0}</p>
                <p>Grade 10: {stats.studentCounts[10] || 0}</p>
                <p>Grade 11: {stats.studentCounts[11] || 0}</p>
              </div>
            ) : (
              <p className="text-4xl font-bold">0</p>
            )}
          </div>
        </div>

        {/* Quick Actions - Updated: Card backgrounds and text for dark mode */}
        <div className="grid md:grid-cols-6 gap-6 mb-8">
          <Link href="/tutor/marks" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500">
            <div className="text-blue-600 dark:text-blue-400 text-4xl mb-2">�</div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Manage Marks</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Grades & exams</p>
          </Link>
          <Link href="/tutor/papers" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-green-500">
            <div className="text-green-600 dark:text-green-400 text-4xl mb-2">📄</div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Upload Papers</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Upload question papers</p>
          </Link>
          <Link href="/tutor/analytics" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-purple-500">
            <div className="text-purple-600 dark:text-purple-400 text-4xl mb-2">📊</div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">View Analytics</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Student performance</p>
          </Link>
          <Link href="/tutor/add-students" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-orange-500">
            <div className="text-orange-600 dark:text-orange-400 text-4xl mb-2">➕</div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Add Students</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Enroll new students</p>
          </Link>
          <Link href="/tutor/remove-students" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-red-500">
            <div className="text-red-600 dark:text-red-400 text-4xl mb-2">➖</div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Remove Students</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Unenroll students</p>
          </Link>
          <Link href="/tutor/assignments" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <div className="text-indigo-600 dark:text-indigo-400 text-4xl mb-2">📋</div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Assignments</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Manage student assignments</p>
          </Link>
        </div>

        {/* Recent Active Admin Exams (Assigned to Tutor) - Updated: Card and text for dark mode */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Recent Active Exams</h2>
          {recentExams.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No active exams assigned</p>
          ) : (
            <div className="space-y-3">
              {recentExams.map(exam => (
                <div key={exam.id} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{exam.exam_name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Date: {new Date(exam.exam_date).toLocaleDateString()} | 
                    Grade: {exam.grade_name}
                  </p>
                  <div className="text-sm mt-2 space-y-1">
                    {exam.student_count_per_subject && Object.entries(exam.student_count_per_subject).map(([subjectName, count]) => (
                      <p key={subjectName} className="text-gray-700 dark:text-gray-300">• {subjectName}: {count} students</p>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Link
                      href={`/tutor/marks?examId=${exam.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Enter Marks →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Change Password Button - Footer - Updated: Background and button for dark mode */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="container mx-auto flex justify-end">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            🔒 Change Password
          </button>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)}
        user={user}
      />
    </div>
  );
}