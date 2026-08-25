// ============================================
// FILE: src/app/student/exams/results/[examId]/page.js (DARK MODE + ENHANCEMENTS)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../../../components/Navbar';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function ExamResults() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchResults();
  }, [examId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/student/exams/${examId}/results`, { 
        headers: getAuthHeaders() 
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('auth_token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch results');
      }
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      // Updated: Dark mode for loading screen
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-2"></div>
          <p className="text-lg text-gray-700 dark:text-gray-300">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    // Updated: Page background for dark mode
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Updated: Header text for dark mode */}
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Exam Results</h1>

        {error && (
          // Updated: Error alert for dark mode
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {results.length === 0 ? (
          // Updated: Empty state for dark mode
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-lg">No results available yet</p>
          </div>
        ) : (
          // Updated: Table with dark mode support
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-700">
                  <th className="p-4 text-left font-semibold text-gray-900 dark:text-gray-100">Subject</th>
                  <th className="p-4 text-left font-semibold text-gray-900 dark:text-gray-100">Score</th>
                  <th className="p-4 text-left font-semibold text-gray-900 dark:text-gray-100">Comments</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={result.subject_id} className={`${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : ''} border-t border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                    <td className="p-4 font-medium text-gray-900 dark:text-gray-100">{result.subject_name}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-sm font-semibold ${
                        result.score 
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                          : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {result.score || 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300 max-w-md truncate">
                      {result.comments || 'No comments'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}