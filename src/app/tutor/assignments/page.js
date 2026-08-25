'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';

export default function AssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tutorSubject, setTutorSubject] = useState(null);
  const [grades, setGrades] = useState([]);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    gradeIds: [],
    dueDate: '',
    closingTime: '23:59',
    maxScore: 100,
    isGroup: false
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    gradeIds: [],
    dueDate: '',
    closingTime: '23:59',
    maxScore: 100,
    isGroup: false
  });

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTutorSubject(),
        fetchAssignments(),
        fetchGrades()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTutorSubject = async () => {
    try {
      const res = await fetch('/api/tutor/profile', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setTutorSubject({
          name: data.tutor?.subject_name,
          id: data.tutor?.subject_id
        });
      } else {
        console.error('Failed to fetch tutor profile:', res.status);
        setError('Unable to load tutor profile');
      }
    } catch (error) {
      console.error('Error fetching tutor subject:', error);
      setError('Error loading tutor information');
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/tutor/assignments', { 
        headers: getAuthHeaders() 
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchGrades = async () => {
    try {
      const res = await fetch('/api/tutor/grades', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setGrades(data.grades || []);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setError('');

    if (!tutorSubject?.id) {
      setError('Subject information not available. Please refresh the page.');
      return;
    }

    if (!formData.title || !Array.isArray(formData.gradeIds) || formData.gradeIds.length === 0 || !formData.dueDate || !formData.closingTime) {
      setError('Please fill in all required fields and select at least one grade.');
      return;
    }

    const selectedDate = new Date(formData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setError('Due date cannot be in the past');
      return;
    }

    try {
      setIsSubmittingCreate(true);
      const res = await fetch('/api/tutor/assignments', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          gradeIds: formData.gradeIds.map(id => parseInt(id)),
          dueDate: formData.dueDate,
          closingTime: formData.closingTime,
          maxScore: formData.maxScore,
          isGroup: formData.isGroup
        })
      });

      if (res.ok) {
        const result = await res.json();
        setShowModal(false);
        setFormData({
          title: '',
          description: '',
          gradeIds: [],
          dueDate: '',
          closingTime: '23:59',
          maxScore: 100,
          isGroup: false
        });
        setError('');
        await fetchAssignments();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      setError('Error creating assignment: ' + error.message);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleUpdateAssignment = async (e) => {
    e.preventDefault();
    setError('');

    if (!editFormData.title || !Array.isArray(editFormData.gradeIds) || editFormData.gradeIds.length === 0 || !editFormData.dueDate || !editFormData.closingTime) {
      setError('Please fill in all required fields and select at least one grade.');
      return;
    }

    const selectedDate = new Date(editFormData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setError('Due date cannot be in the past');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      const res = await fetch(`/api/tutor/assignments/${selectedAssignment.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          gradeIds: editFormData.gradeIds.map(id => parseInt(id)),
          dueDate: editFormData.dueDate,
          closingTime: editFormData.closingTime,
          maxScore: editFormData.maxScore,
          isGroup: Boolean(editFormData.isGroup)
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        setError('');
        await fetchAssignments();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      setError('Error updating assignment');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const isAssignmentClosed = (assignment) => {
    const [year, month, day] = assignment.due_date.split('-');
    const [hours, minutes, seconds] = assignment.closing_time.split(':');
    const dueDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds || 0));
    const gracePeriodDeadline = new Date(dueDateTime.getTime() + 24 * 60 * 60 * 1000);
    return new Date() > gracePeriodDeadline;
  };

  const getTimeRemaining = (assignment) => {
    const now = new Date();
    const dateStr = assignment.due_date;
    const timeStr = assignment.closing_time;
    
    if (!dateStr || !timeStr) return 'Invalid';
    
    const [year, month, day] = dateStr.split('-');
    const [hours, minutes, seconds] = timeStr.split(':');
    const dueDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds || 0));
    
    if (isNaN(dueDateTime.getTime())) {
      return 'Invalid';
    }
    
    const diff = dueDateTime - now;

    if (diff <= 0) return 'Closed';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours_remaining = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes_remaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours_remaining}h`;
    if (hours_remaining > 0) return `${hours_remaining}h ${minutes_remaining}m`;
    return `${minutes_remaining}m`;
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
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/tutor/dashboard" className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Assignments</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={!tutorSubject}
            className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ➕ Create Assignment
          </button>
        </div>

        {error && !showModal && !showEditModal && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid gap-6">
          {assignments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-10 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No assignments yet. Click "Create Assignment" to get started!
              </p>
            </div>
          ) : (
            assignments.map(assignment => {
              const isClosed = isAssignmentClosed(assignment);
              const timeRemaining = getTimeRemaining(assignment);

              return (
                <Link
                  key={assignment.id}
                  href={`/tutor/assignments/${assignment.id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-xl transition-all p-6 block cursor-pointer border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                          {assignment.title}
                        </h3>
                        {assignment.is_group && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                            👥 GROUP
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {assignment.description || 'No description'}
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
                      isClosed
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    }`}>
                      {isClosed ? '🔒 Closed' : '🔓 Open'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div>
                      <p className="font-semibold text-gray-700 dark:text-gray-300">Subject</p>
                      <p>{assignment.subject_name}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 dark:text-gray-300">Grades</p>
                      <p>
                        {Array.isArray(assignment.grades) && assignment.grades.length > 0
                          ? [...new Set(assignment.grades.filter(g => g && g.grade_name).map(g => g.grade_name))].join(', ')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 dark:text-gray-300">Deadline</p>
                      <p>{new Date(assignment.due_date).toLocaleDateString()} at {assignment.closing_time}</p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg flex justify-between items-center font-bold ${
                    isClosed ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    <span className={isClosed ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}>
                      {isClosed ? 'Assignment Closed' : 'Time Remaining'}
                    </span>
                    <span className={isClosed ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}>
                      {timeRemaining}
                    </span>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-semibold">
                      View Submissions →
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedAssignment(assignment);
                        setEditFormData({
                          title: assignment.title,
                          description: assignment.description || '',
                          gradeIds: Array.isArray(assignment.grades) 
                            ? assignment.grades.filter(g => g && g.id).map(g => String(g.id))
                            : [],
                          dueDate: assignment.due_date,
                          closingTime: assignment.closing_time,
                          maxScore: assignment.max_score,
                          isGroup: assignment.is_group
                        });
                        setShowEditModal(true);
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-semibold"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Create Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Create New Assignment</h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded">
                <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Mathematics Weekly Quiz"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide instructions, topics covered, format, etc..."
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                  <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium">
                    {tutorSubject?.name || 'Loading...'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Grades * (Select one or more)</label>
                  <div className="space-y-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    {grades.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No grades available</p>
                    ) : (
                      grades.map(grade => (
                        <label key={grade.id} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.gradeIds.includes(String(grade.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, gradeIds: [...formData.gradeIds, String(grade.id)] });
                              } else {
                                setFormData({ ...formData, gradeIds: formData.gradeIds.filter(id => id !== String(grade.id)) });
                              }
                            }}
                            className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                          />
                          <span className="text-gray-900 dark:text-gray-100">{grade.grade_name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Closing Time *</label>
                  <input
                    type="time"
                    value={formData.closingTime}
                    onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Maximum Score</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 100 })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  id="isGroup"
                  checked={formData.isGroup}
                  onChange={(e) => setFormData({ ...formData, isGroup: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="isGroup" className="cursor-pointer flex-1">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Group Assignment</span>
                  <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
                    If checked, one group member can submit the assignment and specify other group members. Tutors will grade all members together.
                  </p>
                </label>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="flex-1 bg-blue-600 dark:bg-blue-700 text-white py-3 rounded-lg font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                >
                  {isSubmittingCreate ? '⏳ Creating...' : 'Create Assignment'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                  }}
                  disabled={isSubmittingCreate}
                  className="flex-1 bg-gray-400 dark:bg-gray-600 text-white py-3 rounded-lg font-bold hover:bg-gray-500 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {showEditModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
              Edit Assignment: {selectedAssignment.title}
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded">
                <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleUpdateAssignment} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                  <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium">
                    {tutorSubject?.name || 'Loading...'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Grades * (Select one or more)</label>
                  <div className="space-y-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    {grades.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No grades available</p>
                    ) : (
                      grades.map(grade => (
                        <label key={grade.id} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editFormData.gradeIds.includes(String(grade.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditFormData({ ...editFormData, gradeIds: [...editFormData.gradeIds, String(grade.id)] });
                              } else {
                                setEditFormData({ ...editFormData, gradeIds: editFormData.gradeIds.filter(id => id !== String(grade.id)) });
                              }
                            }}
                            className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                          />
                          <span className="text-gray-900 dark:text-gray-100">{grade.grade_name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Due Date *</label>
                  <input
                    type="date"
                    value={editFormData.dueDate}
                    onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Closing Time *</label>
                  <input
                    type="time"
                    value={editFormData.closingTime}
                    onChange={(e) => setEditFormData({ ...editFormData, closingTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Maximum Score</label>
                <input
                  type="number"
                  min="1"
                  value={editFormData.maxScore}
                  onChange={(e) => setEditFormData({ ...editFormData, maxScore: parseInt(e.target.value) || 100 })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  id="editIsGroup"
                  checked={editFormData.isGroup}
                  onChange={(e) => setEditFormData({ ...editFormData, isGroup: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="editIsGroup" className="cursor-pointer flex-1">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Group Assignment</span>
                  <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
                    If checked, students can submit as a group.
                  </p>
                </label>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 bg-green-600 dark:bg-green-700 text-white py-3 rounded-lg font-bold hover:bg-green-700 dark:hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                >
                  {isSubmittingEdit ? '⏳ Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setError('');
                  }}
                  disabled={isSubmittingEdit}
                  className="flex-1 bg-gray-400 dark:bg-gray-600 text-white py-3 rounded-lg font-bold hover:bg-gray-500 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}