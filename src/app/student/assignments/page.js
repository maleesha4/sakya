'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';

export default function StudentAssignmentsPage() {
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
          <p className="text-gray-700 dark:text-gray-300">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/student/dashboard" className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Assignments</h1>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid gap-6">
          {assignments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No assignments yet</p>
            </div>
          ) : (
            assignments.map(assignment => {
              // Parse deadline correctly with closing time
              const [year, month, day] = assignment.due_date.split('-');
              const [hours, minutes, seconds] = assignment.closing_time?.split(':') || ['23', '59', '00'];
              const dueDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds || 0));
              const gracePeriodDeadline = new Date(dueDateTime.getTime() + 24 * 60 * 60 * 1000);
              
              // Overdue only after grace period ends (24 hours after deadline)
              const isOverdue = new Date() > gracePeriodDeadline;
              const isLate = new Date() > dueDateTime && new Date() <= gracePeriodDeadline;
              const isSubmitted = assignment.submission_status === 'submitted' || assignment.submission_status === 'graded';

              return (
                <Link
                  key={assignment.id}
                  href={`/student/assignments/${assignment.id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{assignment.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{assignment.description}</p>
                    </div>
                    <div className="ml-4 flex gap-2 flex-wrap justify-end">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${
                        isSubmitted
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {isSubmitted ? '✅ Submitted' : '⏳ Pending'}
                      </span>
                      {isOverdue && (
                        <span className="px-3 py-1 rounded text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                          ❌ Closed
                        </span>
                      )}
                      {isLate && !isSubmitted && (
                        <span className="px-3 py-1 rounded text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                          ⚠️ Late Period
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div>
                      <p className="font-semibold text-gray-700 dark:text-gray-300">Subject</p>
                      <p>{assignment.subject_name}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 dark:text-gray-300">Due Date</p>
                      <p className={isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : isLate ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}>
                        {dueDateTime.toLocaleDateString()} at {dueDateTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                      </p>
                    </div>
                  </div>

                  {assignment.submission_status === 'graded' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-900 dark:text-blue-200 font-semibold">Score</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {assignment.score}/{assignment.max_score}
                        </span>
                      </div>
                      {assignment.feedback && (
                        <p className="text-sm text-blue-800 dark:text-blue-300 mt-2">
                          <span className="font-semibold">Feedback:</span> {assignment.feedback}
                        </p>
                      )}
                    </div>
                  )}

                  <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-semibold">
                    View & Submit →
                  </button>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}