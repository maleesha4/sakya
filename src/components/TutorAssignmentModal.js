// ============================================
// FILE: components/TutorAssignmentModal.js (FIXED)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('auth_token')}`
});

export default function TutorAssignmentModal({ isOpen, onClose, examId, currentSubjects, onSave }) {
  const router = useRouter();
  const [allTutors, setAllTutors] = useState([]); // Load tutors here
  const [tutorAssignments, setTutorAssignments] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState({}); // Track expanded subjects for dropdown visibility

  useEffect(() => {
    if (isOpen) {
      // Fetch all tutors
      const fetchTutors = async () => {
        try {
          const res = await fetch('/api/admin/tutors', {
            headers: getAuthHeaders(),
            credentials: 'same-origin'
          });
          if (res.ok) {
            const data = await res.json();
            setAllTutors(data.tutors || []);
          } else if (res.status === 401) {
            router.push('/login');
          } else {
            setError('Failed to load tutors');
          }
        } catch (err) {
          setError('Failed to load tutors');
        }
      };

      // Fetch current assignments
      const fetchAssignments = async () => {
        try {
          setError('');
          const res = await fetch(`/api/admin/exams/${examId}/tutors`, {
            headers: getAuthHeaders(),
            credentials: 'same-origin'
          });
          console.log('Tutor assignments fetch status:', res.status); // Debug
          if (res.ok) {
            const data = await res.json();
            console.log('Tutor assignments data:', data); // Debug
            const assignments = {};
            (data.assignments || []).forEach(assignment => {
              assignments[assignment.subject_id] = assignment.tutor_id;
            });
            setTutorAssignments(assignments);
          } else if (res.status === 401) {
            router.push('/login');
          } else {
            setError('Failed to load current assignments');
          }
        } catch (err) {
          console.error('Tutor fetch error:', err); // Debug
          setError('Failed to load current assignments');
        }
      };

      fetchTutors();
      fetchAssignments();
    }
  }, [isOpen, examId, router]);

  const handleTutorChange = (subjectId, tutorId) => {
    setTutorAssignments(prev => ({
      ...prev,
      [subjectId]: tutorId
    }));
  };

  const toggleSubjectExpansion = (subjectId) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/admin/exams/${examId}/tutors`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tutor_assignments: tutorAssignments }),
        credentials: 'same-origin'
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save assignments');
      }
      onSave(tutorAssignments);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Assign Tutors to Subjects</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="space-y-4 mb-6">
          {currentSubjects.map(subject => {
            const isExpanded = expandedSubjects[subject.id];
            const currentTutorId = tutorAssignments[subject.id];
            const currentTutor = allTutors.find(t => t.id === currentTutorId);
            return (
              <div key={subject.id} className="border p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{subject.name}</h4>
                <button
                  onClick={() => toggleSubjectExpansion(subject.id)}
                  className="w-full text-left p-2 border rounded mb-2 hover:bg-gray-100"
                >
                  {isExpanded ? 'Hide Tutors' : `Show All Tutors (${allTutors.length})`}
                </button>
                {isExpanded && (
                  <select
                    value={currentTutorId || ''}
                    onChange={(e) => handleTutorChange(subject.id, e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">No Tutor Assigned</option>
                    {allTutors.map(tutor => (
                      <option key={tutor.id} value={tutor.id}>
                        {tutor.full_name} ({tutor.email})
                      </option>
                    ))}
                  </select>
                )}
                {currentTutor && (
                  <p className="text-sm text-gray-600 mt-1">
                    Assigned: {currentTutor.full_name}
                    <button
                      onClick={() => handleTutorChange(subject.id, null)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 justify-end">
          <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded" disabled={loading}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}