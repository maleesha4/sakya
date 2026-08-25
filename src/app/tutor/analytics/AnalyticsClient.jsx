// src/app/tutor/analytics/AnalyticsClient.js (DARK MODE + ERROR FIX)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';

export default function AnalyticsClient() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [analytics, setAnalytics] = useState({ averages: {}, topStudents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchUser();
    fetchAnalytics();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (!res.ok) {
        localStorage.removeItem('auth_token');
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.user?.role !== 'tutor') {
        setError('Access denied: Tutor role required.');
        setTimeout(() => router.push('/login'), 1500);
        return;
      }
      setUser(data.user);
    } catch (err) {
      console.error('Error fetching user:', err);
      localStorage.removeItem('auth_token');
      router.push('/login');
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tutor/analytics', { headers: getAuthHeaders() });
      if (!res.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const data = await res.json();
      // Fixed: Preserve defaults if API omits keys
      setAnalytics({
        averages: data.analytics?.averages || {},
        topStudents: data.analytics?.topStudents || []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      // Updated: Dark mode for loading screen
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar user={user} />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-xl text-gray-700 dark:text-gray-300">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    // Updated: Page background for dark mode
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar user={user} />
      <div className="container mx-auto px-4 py-8">
        {error && (
          // Updated: Error alert for dark mode
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 rounded-md">
            {error}
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
          <Link href="/tutor/dashboard" className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Back to Dashboard
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Average Scores per Grade - Updated: Card and text for dark mode */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Average Scores by Grade</h2>
            <ul className="space-y-2">
              {Object.entries(analytics.averages || {}).map(([grade, avg]) => (
                <li key={grade} className="flex justify-between text-gray-900 dark:text-gray-100">
                  <span>Grade {grade}</span>
                  <span>{avg.toFixed(1)}%</span>
                </li>
              )) || <p className="text-gray-500 dark:text-gray-400 italic">No data available</p>}
            </ul>
          </div>

          {/* Top Students - Fixed: Safe map + Updated: Card for dark mode */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Top Students</h2>
            <ul className="space-y-2">
              {(analytics.topStudents || []).map((student) => (
                <li key={student.id} className="flex justify-between text-gray-900 dark:text-gray-100">
                  <span>{student.name}</span>
                  <span>{student.avgScore.toFixed(1)}%</span>
                </li>
              )) || <p className="text-gray-500 dark:text-gray-400 italic">No top students data</p>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}