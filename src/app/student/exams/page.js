// ============================================
// FILE: src/app/student/exams/page.js (DARK MODE SUPPORT)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';
import Image from 'next/image';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function StudentExams() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      setLoading(true);
      setError('');

      // Get user info
      const userRes = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (!userRes.ok) {
        if (userRes.status === 401) {
          localStorage.removeItem('auth_token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch user info');
      }
      const userData = await userRes.json();
      setUser(userData.user);

      // Get available exams
      const examsRes = await fetch('/api/student/exams/available', { headers: getAuthHeaders() });
      if (!examsRes.ok) {
        if (examsRes.status === 401) {
          localStorage.removeItem('auth_token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch exams');
      }
      const examsData = await examsRes.json();
      setExams(examsData.exams || []);

      // Get registrations
      const regsRes = await fetch('/api/student/registrations', { headers: getAuthHeaders() });
      if (!regsRes.ok) {
        if (regsRes.status === 401) {
          localStorage.removeItem('auth_token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch registrations');
      }
      const regsData = await regsRes.json();
      setRegistrations(regsData.registrations || []);
    } catch (err) {
      setError('Failed to load exams');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter available exams: registration period open AND not already registered
  // For testing with Dec 20, 2025: const now = new Date('2025-12-20');
  const now = new Date();
  const availableExams = exams.filter(exam => {
    const regStart = new Date(exam.registration_start_date);
    const regEnd = new Date(exam.registration_end_date);
    const isRegOpen = now >= regStart && now <= regEnd && exam.status === 'registration_open';
    const notRegistered = !registrations.some(reg => reg.admin_exam_id === exam.id);
    return isRegOpen && notRegistered;
  });

  if (loading) {
    return (
      // Updated: Dark mode for loading screen
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar user={user} />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-lg text-gray-700 dark:text-gray-300">Loading exams...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      // Updated: Dark mode for login prompt
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4 text-gray-700 dark:text-gray-300">Please log in to view exams</p>
          <Link href="/login" className="bg-blue-500 dark:bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    // Updated: Gradient with valid colors + dark mode
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar user={user} />

      {/* Back Button - Updated: Colors for dark mode */}
      <div className="container mx-auto px-4 mt-4">
        <Link
          href="/student/dashboard"
          className="inline-block bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-900 dark:hover:bg-gray-600 transition focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          {/* Updated: Header text for dark mode */}
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">Available Exams</h1>
          <p className="text-gray-600 dark:text-gray-400">Register for exams available for your grade</p>
        </div>

        {error && (
          // Updated: Error alert for dark mode
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {availableExams.length === 0 ? (
          // Updated: Empty state card and icon for dark mode
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">No exams available for registration</p>
            {registrations.length > 0 && (
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">You have {registrations.length} registered exam(s). Check "My Registrations" on the dashboard.</p>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableExams.map(exam => {
              const regStart = new Date(exam.registration_start_date);
              const regEnd = new Date(exam.registration_end_date);
              // Since filtered, isRegOpen is true, but confirm for button
              const isRegOpen = now >= regStart && now <= regEnd && exam.status === 'registration_open';

              return (
                // Updated: Card background, border, and hover for dark mode
                <div 
                  key={exam.id} 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition border border-gray-200 dark:border-gray-700"
                >
                  <div className="p-6">
                    {/* Updated: Title text for dark mode */}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">{exam.exam_name}</h3>

                    <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                      <p>
                        <span className="font-semibold">Grade:</span> {exam.grade_name}
                      </p>
                      <p>
                        <span className="font-semibold">Exam Date:</span> {new Date(exam.exam_date).toLocaleDateString()}
                      </p>
                      <p>
                        <span className="font-semibold">Subjects:</span> {exam.subject_count}
                      </p>
                      <p>
                        <span className="font-semibold">Registration:</span> {new Date(exam.registration_start_date).toLocaleDateString()} to {new Date(exam.registration_end_date).toLocaleDateString()}
                      </p>
                      <p>
                        <span className="font-semibold">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                          exam.status === 'registration_open' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' :
                          exam.status === 'in_progress' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                          exam.status === 'completed' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200' :
                          exam.status === 'published' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {exam.status}
                        </span>
                      </p>
                    </div>

                    {exam.description && (
                      // Updated: Description box for dark mode
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                        {exam.description}
                      </p>
                    )}

                    <div className="space-y-2">
                      {isRegOpen ? (
                        <Link 
                          href={`/student/exams/register/${exam.id}`} 
                          className="block bg-blue-500 dark:bg-blue-600 text-white text-center px-4 py-2 rounded font-semibold hover:bg-blue-600 dark:hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Register Now
                        </Link>
                      ) : (
                        // Updated: Closed state for dark mode
                        <div className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-4 py-2 rounded text-center font-semibold">
                          Registration Closed
                        </div>
                      )}

                      {exam.published_at && (
                        <Link 
                          href={`/student/results/${exam.id}`} 
                          className="block bg-green-500 dark:bg-green-600 text-white text-center px-4 py-2 rounded font-semibold hover:bg-green-600 dark:hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          View Results
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}