'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../admin/exams/AdminExamsClient.module.css';

export default function AssignmentMarksClient() {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editingScore, setEditingScore] = useState('');
  const [editingFeedback, setEditingFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [applyToGroup, setApplyToGroup] = useState(false);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

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

  const handleEditClick = (submission) => {
    setEditing(submission.submission_id);
    setEditingScore(submission.score || '');
    setEditingFeedback(submission.feedback || '');
    setApplyToGroup(false);
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setEditingScore('');
    setEditingFeedback('');
    setApplyToGroup(false);
  };

  const handleSaveMarks = async (submission) => {
    try {
      if (editingScore === '' || editingScore === null) {
        setError('Score is required');
        return;
      }

      const score = parseInt(editingScore, 10);
      if (isNaN(score) || score < 0 || score > 100) {
        setError('Score must be between 0 and 100');
        return;
      }

      setSaving(true);
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
          feedback: editingFeedback || null,
          applyToGroupMembers: submission.is_group && applyToGroup
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save marks');
      }

      setSuccessMessage('Marks saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Update the submission in the list
      setSubmissions(
        submissions.map((s) =>
          s.submission_id === submission.submission_id
            ? {
                ...s,
                score,
                feedback: editingFeedback || null,
                status: 'graded'
              }
            : s
        )
      );

      setEditing(null);
      setEditingScore('');
      setEditingFeedback('');
      setApplyToGroup(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getSubmissionStatus = (submission) => {
    if (submission.status === 'graded') return '✓ Graded';
    if (submission.status === 'submitted') return '⟳ Submitted';
    return submission.status || 'Not Submitted';
  };

  const getGradeColor = (score, maxScore) => {
    if (score === null || score === undefined) return '#999';
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return '#27ae60'; // Green
    if (percentage >= 60) return '#f39c12'; // Orange
    return '#e74c3c'; // Red
  };

  if (loading && !selectedAssignment) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner}>Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Assignment Marks Management</h1>

      {error && (
        <div
          style={{
            padding: '10px',
            marginBottom: '20px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '5px',
            border: '1px solid #fcc'
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '10px',
            marginBottom: '20px',
            backgroundColor: '#efe',
            color: '#3c3',
            borderRadius: '5px',
            border: '1px solid #cfc'
          }}
        >
          {successMessage}
        </div>
      )}

      {!selectedAssignment ? (
        <div className={styles.tableSection}>
          <h2>Select an Assignment</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {assignments.length === 0 ? (
              <p>No assignments found</p>
            ) : (
              assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  onClick={() => handleSelectAssignment(assignment)}
                  style={{
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    backgroundColor: '#f9f9f9',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    e.currentTarget.style.backgroundColor = '#f9f9f9';
                  }}
                >
                  <h3 style={{ margin: '0 0 10px 0' }}>{assignment.title}</h3>
                  <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
                    Submissions: {assignment.submission_count} / Grades: {assignment.max_score}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.9em' }}>
                    {assignment.is_group ? '👥 Group Assignment' : '👤 Individual'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className={styles.tableSection}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>{selectedAssignment.title}</h2>
              <p style={{ color: '#666', marginTop: '5px' }}>
                Max Score: {selectedAssignment.max_score} | Group Assignment: {selectedAssignment.is_group ? 'Yes' : 'No'}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedAssignment(null);
                setSubmissions([]);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Back to Assignments
            </button>
          </div>

          {loading ? (
            <div className={styles.loadingSpinner}>Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <p>No submissions found for this assignment</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.95em'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Student Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                    {selectedAssignment.is_group && (
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Group Members</th>
                    )}
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Score</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Feedback</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission, index) => (
                    <tr
                      key={submission.submission_id}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa',
                        borderBottom: '1px solid #eee'
                      }}
                    >
                      <td style={{ padding: '12px' }}>{submission.student_name}</td>
                      <td style={{ padding: '12px', fontSize: '0.85em', color: '#666' }}>
                        {submission.student_email}
                      </td>
                      {selectedAssignment.is_group && (
                        <td style={{ padding: '12px', fontSize: '0.85em', color: '#666' }}>
                          {submission.group_members && submission.group_members.length > 0
                            ? submission.group_members.map((m) => m.full_name).join(', ')
                            : '-'}
                        </td>
                      )}
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '3px',
                            fontSize: '0.85em',
                            backgroundColor: submission.status === 'graded' ? '#e8f5e9' : '#fff3e0',
                            color: submission.status === 'graded' ? '#2e7d32' : '#e65100'
                          }}
                        >
                          {getSubmissionStatus(submission)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          color: getGradeColor(submission.score, selectedAssignment.max_score)
                        }}
                      >
                        {editing === submission.submission_id ? (
                          <input
                            type="number"
                            min="0"
                            max={selectedAssignment.max_score}
                            value={editingScore}
                            onChange={(e) => setEditingScore(e.target.value)}
                            style={{
                              width: '60px',
                              padding: '6px',
                              borderRadius: '3px',
                              border: '1px solid #ddd',
                              textAlign: 'center'
                            }}
                            autoFocus
                          />
                        ) : (
                          `${submission.score !== null && submission.score !== undefined ? submission.score : '-'} / ${selectedAssignment.max_score}`
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {editing === submission.submission_id ? (
                          <textarea
                            value={editingFeedback}
                            onChange={(e) => setEditingFeedback(e.target.value)}
                            placeholder="Add feedback..."
                            style={{
                              width: '100%',
                              minHeight: '40px',
                              padding: '6px',
                              borderRadius: '3px',
                              border: '1px solid #ddd',
                              fontFamily: 'inherit',
                              fontSize: '0.85em'
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: '0.85em', color: '#666', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {submission.feedback || '-'}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {editing === submission.submission_id ? (
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleSaveMarks(submission)}
                              disabled={saving}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: saving ? '#bbb' : '#27ae60',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                fontSize: '0.85em'
                              }}
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#95a5a6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                fontSize: '0.85em'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditClick(submission)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3498db',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '0.85em'
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedAssignment.is_group && editing && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fffacd', borderRadius: '4px', borderLeft: '4px solid #f39c12' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={applyToGroup}
                      onChange={(e) => setApplyToGroup(e.target.checked)}
                    />
                    <span>Apply marks to all group members</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
