'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';

export default function StudentMarksPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/student/assignments', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      } else {
        setError('Failed to load assignments');
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setError('Error loading assignments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-700 dark:text-gray-300">Loading marks...</p>
        </div>
      </div>
    );
  }

  // Filter only graded assignments
  const gradedAssignments = assignments.filter(a => a.submission_status === 'graded');
  const totalScore = gradedAssignments.reduce((sum, a) => sum + (a.score || 0), 0);
  const totalMaxScore = gradedAssignments.reduce((sum, a) => sum + (a.max_score || 0), 0);
  const averagePercentage = gradedAssignments.length > 0 
    ? Math.round((totalScore / totalMaxScore) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/student/dashboard" className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Marks</h1>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Total Score</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
              {totalScore}/{totalMaxScore}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Average</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {averagePercentage}%
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Graded Assignments</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
              {gradedAssignments.length}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
              {assignments.length - gradedAssignments.length}
            </p>
          </div>
        </div>

        {/* Marks Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Assignment</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Subject</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Due Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Score</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No assignments yet
                    </td>
                  </tr>
                ) : (
                  assignments.map(assignment => {
                    const isGraded = assignment.submission_status === 'graded';
                    const percentage = isGraded 
                      ? Math.round((assignment.score / assignment.max_score) * 100)
                      : null;

                    return (
                      <tr 
                        key={assignment.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                        onClick={() => {
                          if (isGraded) {
                            // Could add a detail view here
                          }
                        }}
                      >
                        <td className="px-6 py-4 text-sm">
                          <Link 
                            href={`/student/assignments/${assignment.id}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            {assignment.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {assignment.subject_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {new Date(assignment.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isGraded ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                              ✅ Graded
                            </span>
                          ) : assignment.submission_status === 'submitted' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                              ⏳ Pending
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                              Not Submitted
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold">
                          {isGraded ? (
                            <span className="text-gray-900 dark:text-gray-100">
                              {assignment.score}/{assignment.max_score}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isGraded ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    percentage >= 80
                                      ? 'bg-green-500'
                                      : percentage >= 60
                                      ? 'bg-blue-500'
                                      : percentage >= 40
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="font-bold text-gray-900 dark:text-gray-100 w-12 text-right">
                                {percentage}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feedback Section */}
        {gradedAssignments.some(a => a.feedback) && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Feedback</h2>
            <div className="space-y-4">
              {gradedAssignments.map(assignment => (
                assignment.feedback && (
                  <div key={assignment.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {assignment.title}
                      </h3>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {assignment.score}/{assignment.max_score}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {assignment.feedback}
                    </p>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
