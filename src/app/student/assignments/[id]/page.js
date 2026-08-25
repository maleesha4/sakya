// src/app/student/assignments/[id]/page.js

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import Link from 'next/link';

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xlsx', 'xls', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Function to format deadline without timezone conversion
const formatDeadline = (assignment) => {
  if (!assignment?.due_date || !assignment?.closing_time) return 'Invalid Date';
  
  try {
    const [year, month, day] = assignment.due_date.split('-');
    const [hours, minutes, seconds] = assignment.closing_time.split(':');
    
    // Create a date object representing the local date/time (not UTC)
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds || 0));
    
    return date.toLocaleString();
  } catch (e) {
    console.error('Error formatting deadline:', e);
    return 'Invalid Date';
  }
};

// Function to parse deadline from assignment data
const parseDeadline = (assignment) => {
  if (!assignment) return null;
  
  const dueDate = assignment.due_date;
  const closingTime = assignment.closing_time;
  
  console.log('Parsing deadline - due_date:', dueDate, 'closing_time:', closingTime);
  
  if (!dueDate || !closingTime) {
    console.log('Missing due_date or closing_time');
    return null;
  }
  
  try {
    // Handle both full ISO strings and date-only strings
    let dateStr = dueDate;
    if (typeof dueDate === 'string' && dueDate.includes('T')) {
      dateStr = dueDate.split('T')[0];
    }
    
    // Parse as local time (not UTC) to match what tutor entered
    const [year, month, day] = dateStr.split('-');
    const [hours, minutes, seconds] = closingTime.split(':');
    
    const dt = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds || 0));
    
    console.log('Parsed date/time:', dt);
    
    if (isNaN(dt.getTime())) {
      console.log('Invalid date after parsing');
      return null;
    }
    
    return dt;
  } catch (e) {
    console.error('Error parsing deadline:', e);
    return null;
  }
};

export default function AssignmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id;

  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [fileError, setFileError] = useState('');
  const [classmates, setClassmates] = useState([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`
  });

  useEffect(() => {
    fetchAssignmentDetails();
  }, [assignmentId]);

  const fetchAssignmentDetails = async () => {
    try {
      const res = await fetch(`/api/student/assignments/${assignmentId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Assignment data received:', data.assignment);
        console.log('Submission data received:', data.submission);
        setAssignment(data.assignment);
        // Only set submission if it has actual submission status (submitted or graded)
        setSubmission(data.submission?.status && ['submitted', 'graded'].includes(data.submission.status) ? data.submission : null);
        
        if (data.assignment.is_group) {
          fetchClassmates(assignmentId, data.assignment.subject_id);
        }
      } else {
        setError('Failed to load assignment');
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      setError('Error loading assignment');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassmates = async (assignmentId, subjectId) => {
    try {
      const res = await fetch(`/api/student/classmates?assignmentId=${assignmentId}&subjectId=${subjectId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setClassmates(data.classmates || []);
      }
    } catch (error) {
      console.error('Error fetching classmates:', error);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setFileError('');

    for (const file of files) {
      const extension = file.name.split('.').pop().toLowerCase();
      
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setFileError(`File type .${extension} is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return;
      }
    }

    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      setFileError('Please select at least one file to submit');
      return;
    }

    // For group assignments, require at least one group member
    if (assignment?.is_group && selectedGroupMembers.length === 0) {
      setFileError('This is a group assignment. Please select at least one group member to submit with.');
      return;
    }

    setSubmitting(true);
    setFileError('');

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      if (assignment?.is_group && selectedGroupMembers.length > 0) {
        formData.append('groupMembers', JSON.stringify(selectedGroupMembers));
      }

      const res = await fetch(`/api/student/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        alert(result.message);
        setSelectedFiles([]);
        setSelectedGroupMembers([]);
        fetchAssignmentDetails();
      } else {
        const data = await res.json();
        setFileError(data.message || 'Failed to submit assignment');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      setFileError('Error submitting assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-700 dark:text-gray-300">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-red-600 dark:text-red-400">{error || 'Assignment not found'}</p>
          <Link href="/student/assignments" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">
            Back to Assignments
          </Link>
        </div>
      </div>
    );
  }

  const closingDateTime = parseDeadline(assignment);
  const isOverdue = closingDateTime ? new Date() > closingDateTime : false;
  
  // Calculate grace period deadline (24 hours after closing time)
  const gracePeriodDeadline = closingDateTime ? new Date(closingDateTime.getTime() + 24 * 60 * 60 * 1000) : null;
  const isSubmissionClosed = gracePeriodDeadline ? new Date() > gracePeriodDeadline : false;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-grow">
        <Link href="/student/assignments" className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block">
          ← Back to Assignments
        </Link>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{assignment.title}</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{assignment.subject_name}</p>
                </div>
                <span className={`px-4 py-2 rounded font-semibold ${
                  submission ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                }`}>
                  {submission ? '✅ Submitted' : '⏳ Not Submitted'}
                </span>
              </div>

              <div className="prose dark:prose-invert max-w-none mb-6">
                <p className="text-gray-700 dark:text-gray-300">{assignment.description}</p>
              </div>

              {submission?.status === 'graded' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                  <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3">Your Score</h3>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-3">
                    {submission.score}/{assignment.max_score}
                  </div>
                  {submission.feedback && (
                    <div className="bg-white dark:bg-gray-700 rounded p-3">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tutor Feedback:</p>
                      <p className="text-gray-600 dark:text-gray-400">{submission.feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Late Warning */}
            {isOverdue && closingDateTime && !isSubmissionClosed && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-lg shadow p-6 mb-6">
                <h2 className="text-2xl font-bold text-orange-800 dark:text-orange-200 mb-3">
                  ⚠️ This is a Late Submission
                </h2>
                <p className="text-orange-700 dark:text-orange-300">
                  The deadline was <strong>{closingDateTime.toLocaleString()}</strong>.<br />
                  You can still submit until <strong>{gracePeriodDeadline?.toLocaleString()}</strong>, but your work will be marked as <strong>late</strong> by the tutor.
                </p>
              </div>
            )}

            {/* Submission Closed Warning */}
            {isSubmissionClosed && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow p-6 mb-6">
                <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-3">
                  ❌ Submission Period Closed
                </h2>
                <p className="text-red-700 dark:text-red-300">
                  The submission period closed on <strong>{gracePeriodDeadline?.toLocaleString()}</strong>.<br />
                  No more submissions are accepted. Contact your tutor if you need assistance.
                </p>
              </div>
            )}

            {/* Submission Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {submission ? 'Resubmit Your Work' : 'Submit Your Work'}
              </h2>

              {fileError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
                  <p className="text-red-800 dark:text-red-200">{fileError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block mb-3">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition">
                      <p className="text-gray-600 dark:text-gray-400 font-semibold">
                        📁 Click to select files or drag & drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Allowed: PDF, DOC/DOCX, XLS/XLSX, TXT, Images (Max 10MB each)
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xlsx,.xls,.txt,.jpg,.jpeg,.png,.gif"
                      disabled={submitting}
                    />
                  </label>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Selected Files:</h3>
                    <div className="space-y-2">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 dark:text-blue-400">📄</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{file.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            disabled={submitting}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-bold text-xl"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group Members Selection */}
                {assignment.is_group && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">👥 Group Members</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Select your group members to include in this submission.
                    </p>
                    {classmates.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400">No classmates available</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {classmates.map((classmate) => (
                          <label
                            key={classmate.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                          >
                            <input
                              type="checkbox"
                              checked={selectedGroupMembers.includes(classmate.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGroupMembers([...selectedGroupMembers, classmate.id]);
                                } else {
                                  setSelectedGroupMembers(selectedGroupMembers.filter((id) => id !== classmate.id));
                                }
                              }}
                              disabled={submitting}
                              className="w-4 h-4 rounded cursor-pointer"
                            />
                            <span className="text-gray-900 dark:text-gray-100">{classmate.full_name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || selectedFiles.length === 0 || isSubmissionClosed}
                  className={`w-full px-6 py-3 rounded font-bold transition ${
                    isSubmissionClosed
                      ? 'bg-red-400 dark:bg-red-600 text-red-700 dark:text-red-300 cursor-not-allowed'
                      : submitting || selectedFiles.length === 0
                      ? 'bg-gray-400 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                  }`}
                >
                  {isSubmissionClosed ? '❌ Submission Closed' : submitting ? '⏳ Submitting...' : '✅ Submit Assignment'}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar - Assignment Details */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-4">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Assignment Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Deadline</p>
                  <p className={`text-lg font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {closingDateTime ? closingDateTime.toLocaleString() : 'Invalid Date'}
                  </p>
                  {isOverdue && <p className="text-xs text-red-600 dark:text-red-400 mt-1">⚠️ Overdue</p>}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Max Score</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{assignment.max_score} points</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Subject</p>
                  <p className="text-gray-900 dark:text-gray-100">{assignment.subject_name}</p>
                </div>

                {submission && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Your Status</p>
                    <p className={`font-bold ${submission.is_late ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                      {submission.status === 'graded' ? '✅ Graded' : '✅ Submitted'}
                      {submission.is_late && ' (Late)'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}