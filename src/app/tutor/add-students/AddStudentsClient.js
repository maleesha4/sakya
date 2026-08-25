// ============================================
// FILE: src/app/tutor/add-students/AddStudentsClient.js (DARK MODE SUPPORT)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';

export default function AddStudentsClient() {
  const [user, setUser] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [error, setError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';  // Redirect if no token
      return;
    }
    loadData();
  }, []);  // Initial load only

  // Debounced load for filters (run on change, but not on mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchName || selectedGrade) loadData();
    }, 300);  // Debounce 300ms
    return () => clearTimeout(timer);
  }, [searchName, selectedGrade]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        fetchUser(),
        fetchAvailableStudents()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (!res.ok) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.user?.role !== 'tutor') {
        setError('Access denied: Tutor role required.');
        setTimeout(() => window.location.href = '/login', 1500);
        return;
      }
      setUser(data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      let url = '/api/tutor/enrollments/available';
      const params = new URLSearchParams();
      if (searchName) params.append('name', searchName);
      if (selectedGrade) params.append('grade', selectedGrade);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch available students');
      }
      const data = await res.json();
      setAvailableStudents(data.students || []);
    } catch (error) {
      console.error('Error fetching available students:', error);
      setError(error.message);
      setAvailableStudents([]);  // Clear on error
    }
  };

  const handleEnroll = async (studentId) => {
    if (!selectedGrade) {
      setError('Please select a grade before enrolling.');
      return;
    }
    try {
      const res = await fetch('/api/tutor/enrollments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ studentId, grade: selectedGrade })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Enrollment failed');
      }
      await loadData();  // Reload
      setError('');  // Clear errors on success
    } catch (error) {
      console.error('Error enrolling student:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      // Updated: Dark mode for loading screen
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-700 dark:text-gray-300">Loading...</div>
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
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 rounded-md">
            {error}
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Add Students</h1>
          <Link href="/tutor/dashboard" className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Back to Dashboard
          </Link>
        </div>

        {/* Filters - Updated: Inputs/select/button for dark mode */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded p-2 flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-500"
          />
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-500"
          >
            <option value="">All Grades</option>
            <option value="6">Grade 6</option>
            <option value="7">Grade 7</option>
            <option value="8">Grade 8</option>
            <option value="9">Grade 9</option>
            <option value="10">Grade 10</option>
            <option value="11">Grade 11</option>
          </select>
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
        </div>

        {availableStudents.length === 0 ? (
          // Updated: No students message for dark mode
          <p className="text-gray-500 dark:text-gray-400">No available students found. Try adjusting filters.</p>
        ) : (
          // Updated: List container for dark mode
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Found {availableStudents.length} students</p>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-600">
              {availableStudents.map((student) => (
                <li key={student.id} className="p-4 flex justify-between items-center">
                  <div className="text-gray-900 dark:text-gray-100">
                    <h3 className="font-semibold">{student.full_name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{student.grade_name}</p>
                  </div>
                  <button
                    onClick={() => handleEnroll(student.id)}
                    disabled={loading}
                    className="bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Enroll
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}