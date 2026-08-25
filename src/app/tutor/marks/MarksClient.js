// ============================================
// FILE: src/app/tutor/marks/MarksClient.js 
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';

export default function MarksClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId');
  const [tab, setTab] = useState('assignments'); // 'assignments' or 'exams'
  const [choices, setChoices] = useState([]);  // For exams: List of {choice_id, student_name, admission_number, subject_name, score, marked_at, exam_name, ...}
  const [assignments, setAssignments] = useState([]);  // For assignments
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeExam, setActiveExam] = useState(null);  // {id, name, date, grade_name}
  const [availableExams, setAvailableExams] = useState([]);  // Fallback list if no examId
  const [examsLoaded, setExamsLoaded] = useState(false);
  const [editingChoice, setEditingChoice] = useState(null);  // choice_id in edit mode
  const [editingSubmission, setEditingSubmission] = useState(null);  // submission_id in edit mode
  const [pendingScores, setPendingScores] = useState({});  // {choice_id: scoreStr} or {submission_id: scoreStr}
  const [pendingFeedback, setPendingFeedback] = useState({});  // {submission_id: feedbackStr}
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');  // For save feedback
  const [applyToGroup, setApplyToGroup] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchUser();
    fetchAvailableExams();
    fetchAssignments();
  }, []);  // Run once on mount

  useEffect(() => {
    if (examId && examsLoaded) {
      fetchChoices(examId);
    }
  }, [examId, examsLoaded]);

  useEffect(() => {
    setEditingChoice(null);
    setPendingScores({});
  }, [examId]);

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
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('auth_token');
      router.push('/login');
    }
  };

  const fetchChoices = async (id) => {
    const exam = availableExams.find(e => String(e.id) === id);
    if (!exam) {
      setError('Selected exam not found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tutor/marks?examId=${id}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch choices');
      }
      const data = await res.json();
      let allChoices = data.choices || [];
      // Additional frontend filtering to ensure only the selected exam's choices are shown
      allChoices = allChoices.filter(c => c.exam_name === exam.exam_name);
      setChoices(allChoices);
      setActiveExam({ 
        id: exam.id, 
        name: exam.exam_name, 
        date: exam.exam_date, 
        grade_name: exam.grade_name 
      });
    } catch (error) {
      console.error('Error fetching choices:', error);
      setError(error.message || 'Failed to load marks data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableExams = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tutor/exams', { headers: getAuthHeaders() });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch exams');
      }
      const data = await res.json();
      setAvailableExams(data.exams || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setError(error.message || 'Failed to load available exams');
    } finally {
      setLoading(false);
      setExamsLoaded(true);
    }
  };

  const handleMarkSubmit = async (choiceId, scoreStr) => {
    setError('');
    if (!scoreStr || scoreStr.trim() === '') {
      setError('Score cannot be empty');
      return;
    }
    const score = parseInt(scoreStr);
    if (isNaN(score) || score < 0 || score > 100) {
      setError('Invalid score (0-100)');
      return;
    }
    try {
      const res = await fetch('/api/tutor/marks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ choiceId, score })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save mark');
      }
      // Update local state
      setChoices(prev => prev.map(c => 
        c.choice_id === choiceId 
          ? { ...c, score, marked_at: new Date().toISOString() }
          : c
      ));
      setPendingScores(prev => {
        const np = { ...prev };
        delete np[choiceId];
        return np;
      });
      setEditingChoice(null);
      setSuccess('Mark updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error submitting mark:', error);
      setError(error.message || 'Failed to save mark');
    }
  };

  const startEditing = (choiceId) => {
    const choice = choices.find(c => c.choice_id === choiceId);
    setPendingScores(prev => ({
      ...prev,
      [choiceId]: choice?.score?.toString() || ''
    }));
    setEditingChoice(choiceId);
  };

  const cancelEditing = () => {
    const id = editingChoice;
    setEditingChoice(null);
    setPendingScores(prev => {
      const np = { ...prev };
      delete np[id];
      return np;
    });
  };

  const handleBulkSave = async () => {
    const unsavedWithPending = choices.filter(c => 
      (c.score === null || c.score === undefined) && 
      pendingScores[c.choice_id] && 
      pendingScores[c.choice_id].trim() !== ''
    );
    if (unsavedWithPending.length === 0) {
      setError('No pending entries to save');
      return;
    }

    setLoading(true);
    setError('');
    const promises = unsavedWithPending.map(async (choice) => {
      const scoreStr = pendingScores[choice.choice_id];
      const score = parseInt(scoreStr);
      if (isNaN(score) || score < 0 || score > 100) {
        console.warn(`Invalid score for ${choice.student_name}: ${scoreStr}`);
        return false;
      }
      try {
        const res = await fetch('/api/tutor/marks', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ choiceId: choice.choice_id, score })
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to save mark');
        }
        // Update local state
        setChoices(prev => prev.map(c => 
          c.choice_id === choice.choice_id 
            ? { ...c, score, marked_at: new Date().toISOString() }
            : c
        ));
        // Clear pending
        setPendingScores(prev => {
          const np = { ...prev };
          delete np[choice.choice_id];
          return np;
        });
        return true;
      } catch (error) {
        console.error(`Error saving mark for ${choice.student_name}:`, error);
        return false;
      }
    });

    const results = await Promise.all(promises);
    const savedCount = results.filter(Boolean).length;
    setLoading(false);
    if (savedCount > 0) {
      setSuccess(`Saved ${savedCount} marks!`);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('No marks were saved due to errors');
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/tutor/assignments', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }

      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAssignment = async (assignment) => {
    try {
      setSelectedAssignment(assignment);
      setLoading(true);
      setError('');
      setSubmissions([]);

      const response = await fetch(
        `/api/tutor/assignments/marks?assignmentId=${assignment.id}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssignmentMarks = async (submission) => {
    try {
      if (pendingScores[submission.submission_id] === undefined || pendingScores[submission.submission_id] === '') {
        setError('Score is required');
        return;
      }

      const score = parseInt(pendingScores[submission.submission_id], 10);
      if (isNaN(score) || score < 0 || score > selectedAssignment.max_score) {
        setError(`Score must be between 0 and ${selectedAssignment.max_score}`);
        return;
      }

      setLoading(true);
      setError('');

      const response = await fetch('/api/tutor/assignments/marks', {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submissionId: submission.submission_id,
          score,
          feedback: pendingFeedback[submission.submission_id] || null,
          applyToGroupMembers: submission.is_group && applyToGroup
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save marks');
      }

      setSuccess('Marks saved successfully!');
      setTimeout(() => setSuccess(''), 3000);

      // Update the submission in the list
      setSubmissions(
        submissions.map((s) =>
          s.submission_id === submission.submission_id
            ? {
                ...s,
                score,
                feedback: pendingFeedback[submission.submission_id] || null,
                status: 'graded'
              }
            : s
        )
      );

      setEditingSubmission(null);
      setPendingScores(prev => {
        const np = { ...prev };
        delete np[submission.submission_id];
        return np;
      });
      setPendingFeedback(prev => {
        const np = { ...prev };
        delete np[submission.submission_id];
        return np;
      });
      setApplyToGroup(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !examsLoaded && assignments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar user={user} />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-gray-700 dark:text-gray-300">Loading marks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar user={user} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Marks Management</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 rounded-md">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-500 text-green-700 dark:text-green-300 rounded-md">
            {success}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setTab('assignments');
              setSelectedAssignment(null);
              setSubmissions([]);
              setError('');
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              tab === 'assignments'
                ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Assignment Marks
          </button>
          <button
            onClick={() => {
              setTab('exams');
              setError('');
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              tab === 'exams'
                ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Exam Marks
          </button>
        </div>

        {/* Assignment Marks Tab */}
        {tab === 'assignments' && (
          <div>
            {!selectedAssignment ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Select Assignment</h2>
                {assignments.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No assignments found</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        onClick={() => handleSelectAssignment(assignment)}
                        className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:shadow-lg dark:hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-400 transition-all bg-gray-50 dark:bg-gray-700/50"
                      >
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{assignment.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {assignment.is_group ? '👥 Group' : '👤 Individual'} | Max Score: {assignment.max_score}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Submissions: {assignment.submission_count}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedAssignment.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400">Max Score: {selectedAssignment.max_score} | {selectedAssignment.is_group ? '👥 Group Assignment' : '👤 Individual'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAssignment(null);
                      setSubmissions([]);
                    }}
                    className="bg-gray-500 dark:bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-600 dark:hover:bg-gray-500"
                  >
                    Back
                  </button>
                </div>

                {loading ? (
                  <p className="text-gray-600 dark:text-gray-400">Loading submissions...</p>
                ) : submissions.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">No submissions found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Student Name</th>
                          <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Email</th>
                          {selectedAssignment.is_group && <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Group Members</th>}
                          <th className="px-4 py-2 text-center text-gray-900 dark:text-gray-100">Status</th>
                          <th className="px-4 py-2 text-center text-gray-900 dark:text-gray-100">Score</th>
                          <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Feedback</th>
                          <th className="px-4 py-2 text-center text-gray-900 dark:text-gray-100">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((submission, idx) => (
                          <tr key={submission.submission_id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{submission.student_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{submission.student_email}</td>
                            {selectedAssignment.is_group && (
                              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                                {submission.group_members?.map(m => m.full_name).join(', ') || '-'}
                              </td>
                            )}
                            <td className="px-4 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                submission.status === 'graded'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              }`}>
                                {submission.status === 'graded' ? '✓ Graded' : 'Submitted'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center font-bold text-gray-900 dark:text-gray-100">
                              {editingSubmission === submission.submission_id ? (
                                <input
                                  type="number"
                                  min="0"
                                  max={selectedAssignment.max_score}
                                  value={pendingScores[submission.submission_id] || submission.score || ''}
                                  onChange={(e) => setPendingScores(prev => ({...prev, [submission.submission_id]: e.target.value}))}
                                  className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  autoFocus
                                />
                              ) : (
                                `${submission.score !== null ? submission.score : '-'} / ${selectedAssignment.max_score}`
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                              {editingSubmission === submission.submission_id ? (
                                <textarea
                                  value={pendingFeedback[submission.submission_id] || submission.feedback || ''}
                                  onChange={(e) => setPendingFeedback(prev => ({...prev, [submission.submission_id]: e.target.value}))}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  rows="2"
                                />
                              ) : (
                                <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{submission.feedback || '-'}</div>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center whitespace-nowrap">
                              {editingSubmission === submission.submission_id ? (
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => handleSaveAssignmentMarks(submission)}
                                    disabled={loading}
                                    className="bg-green-500 dark:bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-600 dark:hover:bg-green-500 disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingSubmission(null);
                                      setApplyToGroup(false);
                                    }}
                                    className="bg-gray-500 dark:bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 dark:hover:bg-gray-500"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingSubmission(submission.submission_id);
                                    setPendingScores(prev => ({...prev, [submission.submission_id]: submission.score || ''}));
                                    setPendingFeedback(prev => ({...prev, [submission.submission_id]: submission.feedback || ''}));
                                  }}
                                  className="bg-blue-500 dark:bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 dark:hover:bg-blue-500"
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {selectedAssignment.is_group && editingSubmission && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={applyToGroup}
                            onChange={(e) => setApplyToGroup(e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Apply marks to all group members</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Exam Marks Tab */}
        {tab === 'exams' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            {!examId ? (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Select Exam</h2>
                {availableExams.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No exams assigned to you yet.</p>
                ) : (
                  <div className="space-y-3">
                    {availableExams.map(exam => (
                      <div key={exam.id} className="border border-gray-200 dark:border-gray-600 rounded p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{exam.exam_name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Date: {new Date(exam.exam_date).toLocaleDateString()} | Grade: {exam.grade_name}</p>
                        <button
                          onClick={() => router.push(`/tutor/marks?examId=${exam.id}`)}
                          className="mt-2 bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-500"
                        >
                          Enter Marks
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{activeExam?.name}</h2>
                  <button
                    onClick={() => router.push('/tutor/marks')}
                    className="bg-gray-500 dark:bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-600 dark:hover:bg-gray-500"
                  >
                    Back
                  </button>
                </div>

                {choices.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No students registered for your subjects yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Student</th>
                          <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Admission #</th>
                          <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Subject</th>
                          <th className="px-4 py-2 text-center text-gray-900 dark:text-gray-100">Marks</th>
                          <th className="px-4 py-2 text-center text-gray-900 dark:text-gray-100">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {choices.map((choice, idx) => {
                          const hasSavedScore = choice.score !== null && choice.score !== undefined;
                          const isEditing = editingChoice === choice.choice_id;
                          const inputValue = pendingScores[choice.choice_id] !== undefined 
                            ? pendingScores[choice.choice_id] 
                            : (hasSavedScore ? choice.score.toString() : '');
                          const isValid = inputValue.trim() !== '' && !isNaN(parseInt(inputValue)) && parseInt(inputValue) >= 0 && parseInt(inputValue) <= 100;

                          return (
                            <tr key={choice.choice_id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{choice.student_name}</td>
                              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{choice.admission_number}</td>
                              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{choice.subject_name}</td>
                              <td className="px-4 py-2 text-center">
                                {isEditing || !hasSavedScore ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={inputValue}
                                    onChange={(e) => setPendingScores(prev => ({...prev, [choice.choice_id]: e.target.value}))}
                                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    autoFocus={isEditing}
                                  />
                                ) : (
                                  <span className="font-semibold text-green-600 dark:text-green-400">{choice.score}</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {isEditing ? (
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      onClick={() => handleMarkSubmit(choice.choice_id, inputValue)}
                                      disabled={!isValid || loading}
                                      className="bg-green-500 dark:bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-600 dark:hover:bg-green-500 disabled:opacity-50"
                                    >
                                      Update
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="bg-gray-500 dark:bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 dark:hover:bg-gray-500"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : hasSavedScore ? (
                                  <button
                                    onClick={() => startEditing(choice.choice_id)}
                                    className="bg-yellow-500 dark:bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 dark:hover:bg-yellow-500"
                                  >
                                    Edit
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Link href="/tutor/dashboard" className="mt-6 inline-block bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}