'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function StudentRegistrations() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Updated: Handle undefined status to prevent errors
  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    switch (status) {
      case 'registered': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
      case 'confirmed': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      return 'Invalid Date';
    }
  };

  return (
    // Updated: Gradient with valid colors + dark mode
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar user={user} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          {/* Updated: Title text for dark mode */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Exam Registrations</h1>
          <Link 
            href="/student/dashboard"
            className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-900 dark:hover:bg-gray-600 transition focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {loading ? (
          // Updated: Loading text for dark mode
          <div className="text-center py-8">
            <p className="text-lg text-gray-700 dark:text-gray-300">Loading registrations...</p>
          </div>
        ) : registrations.length === 0 ? (
          // Updated: Empty state card and icon for dark mode
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">You haven't registered for any exams yet</p>
            <Link 
              href="/student/exams"
              className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Browse Available Exams
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {registrations.map(reg => (
              // Updated: Card background and border for dark mode
              <div key={reg.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-green-500 dark:border-green-400">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    {/* Updated: Title and text for dark mode */}
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{reg.exam_name}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-semibold">Exam Date:</span> {formatDate(reg.exam_date)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Registered Date:</span> {formatDate(reg.registration_date)}
                    </p>
                  </div>
                  {/* Updated: Status badge with null-check to prevent charAt error */}
                  <span className={`px-4 py-2 rounded text-sm font-semibold ${getStatusColor(reg.status)}`}>
                    {reg.status ? reg.status.charAt(0).toUpperCase() + reg.status.slice(1) : 'Unknown'}
                  </span>
                </div>

                {/* Updated: Subjects section for dark mode */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded mb-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <span className="font-semibold">Admission Number:</span> 
                    <span className="font-mono ml-2">{reg.admission_number}</span>
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Selected Subjects:</span>
                  </p>
                  {reg.chosen_subjects ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {reg.chosen_subjects.split(', ').map((subject, idx) => (
                        <span key={idx} className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-3 py-1 rounded text-sm">
                          {subject}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">No subjects selected</p>
                  )}
                </div>

                <div className="flex gap-2">
                  {reg.published_at && (
                    <Link
                      href={`/student/results/${reg.admin_exam_id}`}
                      className="bg-purple-600 dark:bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-700 dark:hover:bg-purple-800 transition text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      View Results
                    </Link>
                  )}
                  {!reg.published_at && (
                    // Updated: Results message for dark mode
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Results will be available after exam completion and publication
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}