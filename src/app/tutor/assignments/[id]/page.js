'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import Link from 'next/link';

export default function AssignmentSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id;

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [gradeData, setGradeData] = useState({ score: 0, feedback: '' });
  const [applyToAllGroupMembers, setApplyToAllGroupMembers] = useState(false);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`
  });

  useEffect(() => {
    fetchData();
  }, [assignmentId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/tutor/assignments/${assignmentId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAssignment(data.assignment);
        setSubmissions(data.submissions || []);
      } else {
        setError('Failed to load assignment');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error loading assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;

    try {
      const res = await fetch(`/api/tutor/submissions/${selectedSubmission.id}/grade`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...gradeData,
          applyToAllGroupMembers: applyToAllGroupMembers && assignment.is_group
        })
      });

      if (res.ok) {
        setShowGradeModal(false);
        setGradeData({ score: 0, feedback: '' });
        setApplyToAllGroupMembers(false);
        fetchData(); // Refresh submissions
      } else {
        setError('Failed to save grade');
      }
    } catch (error) {
      console.error('Error saving grade:', error);
      setError('Error saving grade');
    }
  };

  const handleDeleteAssignment = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tutor/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        setShowDeleteModal(false);
        alert('Assignment deleted successfully');
        router.push('/tutor/assignments');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete assignment');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setError('Error deleting assignment');
    } finally {
      setDeleting(false);
    }
  };

  const isClosed = assignment && (() => {
    const [year, month, day] = assignment.due_date.split('-');
    const [hours, minutes, seconds] = assignment.closing_time.split(':');
    const dueDateTime = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds || 0));
    const gracePeriodDeadline = new Date(dueDateTime.getTime() + 24 * 60 * 60 * 1000);
    return new Date() > gracePeriodDeadline;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const submittedCount = submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;
  const lateSubmissions = submissions.filter(s => s.is_late).length;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-grow">
        <Link href="/tutor/assignments" className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block">
          ← Back to Assignments
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{assignment.title}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{assignment.description}</p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <span className={`px-4 py-2 rounded font-bold ${
                isClosed
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              }`}>
                {isClosed ? '🔒 Closed' : '🔓 Open'}
              </span>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1 rounded text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50 transition"
              >
                🗑️ Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Deadline</p>
              <p className="text-gray-900 dark:text-gray-100 font-semibold">{assignment.due_date} at {assignment.closing_time}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Grace Period Until</p>
              <p className="text-gray-900 dark:text-gray-100 font-semibold">
                {(() => {
                  const [year, month, day] = assignment.due_date.split('-');
                  const [hours, minutes, seconds] = assignment.closing_time.split(':');
                  const deadline = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds || 0));
                  const gracePeriod = new Date(deadline.getTime() + 24 * 60 * 60 * 1000);
                  return gracePeriod.toLocaleDateString() + ' at ' + gracePeriod.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                })()}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Submissions</p>
              <p className="text-gray-900 dark:text-gray-100 font-semibold">{submittedCount}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Late Submissions</p>
              <p className={`font-semibold ${lateSubmissions > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {lateSubmissions}
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Student Submissions</h2>

        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No submissions yet</p>
            </div>
          ) : (
            submissions.map(submission => (
              <div key={submission.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{submission.student_name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Submitted: {new Date(submission.submission_date).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {submission.status === 'graded' && (
                      <span className="px-3 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                        ✅ Graded: {submission.score}/{assignment.max_score}
                      </span>
                    )}
                    {submission.is_late && (
                      <span className="px-3 py-1 rounded text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                        ⚠️ Late Submission
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded text-xs font-bold ${
                      submission.status === 'submitted'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    }`}>
                      {submission.status === 'submitted' ? '📝 Pending Review' : '✅ Graded'}
                    </span>
                  </div>
                </div>

                {submission.files && submission.files.length > 0 && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Submitted Files:</p>
                    <div className="space-y-2">
                      {submission.files.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          📄 {file.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {assignment.is_group && submission.group_members && submission.group_members.length > 0 && (
                  <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded border-l-4 border-purple-500">
                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">👥 Group Members:</p>
                    <div className="flex flex-wrap gap-2">
                      {submission.group_members.map((member, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-200 dark:bg-purple-700 text-purple-900 dark:text-purple-200">
                          {member.full_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {submission.feedback && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-500">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Your Feedback:</p>
                    <p className="text-sm text-blue-800 dark:text-blue-300">{submission.feedback}</p>
                  </div>
                )}

                {submission.status === 'submitted' && (
                  <button
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setGradeData({ score: 0, feedback: '' });
                      setShowGradeModal(true);
                    }}
                    className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 text-sm font-semibold"
                  >
                    ⭐ Grade Submission
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Grade Modal */}
        {showGradeModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Grade Submission - {selectedSubmission.student_name}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Score (out of {assignment.max_score})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={assignment.max_score}
                    value={gradeData.score}
                    onChange={(e) => setGradeData({ ...gradeData, score: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Feedback
                  </label>
                  <textarea
                    value={gradeData.feedback}
                    onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 h-32 resize-none"
                    placeholder="Provide constructive feedback..."
                  />
                </div>

                {assignment.is_group && selectedSubmission.group_members && selectedSubmission.group_members.length > 0 && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyToAllGroupMembers}
                        onChange={(e) => setApplyToAllGroupMembers(e.target.checked)}
                        className="w-4 h-4 mt-1 rounded cursor-pointer"
                      />
                      <div>
                        <p className="font-semibold text-purple-900 dark:text-purple-200">Apply to All Group Members</p>
                        <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                          When checked, this grade and feedback will be applied to all {selectedSubmission.group_members.length} group member(s):
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedSubmission.group_members.map((member, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs bg-purple-200 dark:bg-purple-700 text-purple-900 dark:text-purple-200 rounded">
                              {member.full_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleGradeSubmission}
                    className="flex-1 bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 font-semibold"
                  >
                    Save Grade
                  </button>
                  <button
                    onClick={() => setShowGradeModal(false)}
                    className="flex-1 bg-gray-400 dark:bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500 dark:hover:bg-gray-700 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Delete Assignment
              </h2>

              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete <strong>{assignment?.title}</strong>? This action cannot be undone.
              </p>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This will delete:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 list-disc list-inside">
                <li>The assignment</li>
                <li>All student submissions</li>
                <li>All submitted files</li>
                <li>All grades and feedback</li>
              </ul>

              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAssignment}
                  disabled={deleting}
                  className="flex-1 bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded hover:bg-red-700 dark:hover:bg-red-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? '⏳ Deleting...' : '🗑️ Delete Assignment'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 bg-gray-400 dark:bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500 dark:hover:bg-gray-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}