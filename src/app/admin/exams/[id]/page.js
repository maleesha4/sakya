// ============================================
// FILE: src/app/admin/exams/[id]/page.js (UPDATED)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TutorAssignmentModal from '../../../../components/TutorAssignmentModal';
import EditExamForm from '../../../../components/EditExamForm';

export default function ManageAdminExam() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id;
  const [exam, setExam] = useState(null);
  const [currentSubjects, setCurrentSubjects] = useState([]);
  const [allTutors, setAllTutors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [addingStudents, setAddingStudents] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState(null);
  const [editingSubjects, setEditingSubjects] = useState([]);
  const [currentEditingReg, setCurrentEditingReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`
  });

  useEffect(() => {
    fetchData();
  }, [examId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch exam
      const examRes = await fetch(`/api/admin/exams/${examId}`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (!examRes.ok) {
        if (examRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch exam');
      }
      const examData = await examRes.json();
      setExam(examData.exam);

      // Fetch current subjects for this exam
      const currentSubjectsRes = await fetch(`/api/admin/exams/${examId}/subjects`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (currentSubjectsRes.ok) {
        const currentSubjectsData = await currentSubjectsRes.json();
        setCurrentSubjects(currentSubjectsData.subjects || []);
      }

      // Fetch all subjects
      const allSubjectsRes = await fetch('/api/subjects', {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (allSubjectsRes.ok) {
        const allSubjectsData = await allSubjectsRes.json();
        setAllSubjects(allSubjectsData.subjects || []);
      }

      // Fetch grades
      const gradesRes = await fetch('/api/grades', {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (gradesRes.ok) {
        const gradesData = await gradesRes.json();
        setGrades(gradesData.grades || []);
      }

      // Fetch all tutors
      const allTutorsRes = await fetch('/api/admin/tutors', {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (allTutorsRes.ok) {
        const allTutorsData = await allTutorsRes.json();
        setAllTutors(allTutorsData.tutors || []);
      }

      // Fetch current assignments
      const assignmentsRes = await fetch(`/api/admin/exams/${examId}/tutors`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.assignments || []);
      }

      // Fetch registrations
      const regsRes = await fetch(`/api/admin/exams/${examId}/students`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (regsRes.ok) {
        const regsData = await regsRes.json();
        setRegistrations(regsData.registrations || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const res = await fetch(`/api/admin/exams/${examId}/available-students`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableStudents(data.available_students || []);
      }
    } catch (err) {
      console.error('Error fetching available students:', err);
    }
  };

  const openAddStudentModal = async () => {
    await fetchAvailableStudents();
    setSelectedStudentIds([]);
    setShowAddStudentModal(true);
  };

  const handleStudentToggle = (studentId) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const addSelectedStudents = async () => {
    if (selectedStudentIds.length === 0) {
      setError('Please select at least one student');
      return;
    }

    try {
      setAddingStudents(true);
      const res = await fetch(`/api/admin/exams/${examId}/students`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_ids: selectedStudentIds }),
        credentials: 'same-origin'
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message || 'Students added successfully');
        setTimeout(() => setSuccess(''), 3000);
        setShowAddStudentModal(false);
        fetchData();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to add students');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingStudents(false);
    }
  };

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleSaveAssignments = async (tutorAssignments) => {
    try {
      const res = await fetch(`/api/admin/exams/${examId}/tutors`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tutor_assignments: tutorAssignments }),
        credentials: 'same-origin'
      });

      if (res.ok) {
        setSuccess('Tutor assignments saved successfully');
        setTimeout(() => setSuccess(''), 3000);
        fetchData(); // Refresh data
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to save assignments');
      }
    } catch (err) {
      setError('Error saving assignments: ' + err.message);
    }
    handleCloseModal();
  };

  const handleEditToggle = () => {
    setEditing(!editing);
  };

  const handleSaveEdit = () => {
    setEditing(false);
    fetchData();
    setSuccess('Exam updated successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleDeleteExam = async () => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (res.ok) {
        router.push('/admin/exams');
      } else if (res.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to delete exam');
      }
    } catch (err) {
      setError('Failed to delete exam');
    }
  };

  const handleEditRegistrationSubjects = (registration) => {
    setCurrentEditingReg(registration);
    setEditingRegistration(registration.id);
    setEditingSubjects(registration.subject_ids || []);
  };

  const handleSubjectToggle = (subjectId) => {
    setEditingSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const saveRegistrationSubjects = async () => {
    try {
      const res = await fetch(`/api/admin/exams/${examId}/students/${editingRegistration}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ subject_ids: editingSubjects }),
        credentials: 'same-origin'
      });

      if (res.ok) {
        setSuccess(`Subjects updated for ${currentEditingReg?.student_name} successfully`);
        setTimeout(() => setSuccess(''), 3000);
        setEditingRegistration(null);
        setCurrentEditingReg(null);
        fetchData();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to update subjects');
      }
    } catch (err) {
      setError('Error updating subjects: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <p className="text-lg">Loading exam details...</p>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
            Error: {error}
          </div>
          <Link href="/admin/exams" className="text-blue-600 hover:underline">
            Back to Exams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{exam?.exam_name}</h1>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <button 
                onClick={handleCancelEdit} 
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition"
              >
                Cancel Edit
              </button>
            ) : (
              <button 
                onClick={handleEditToggle} 
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
              >
                Edit Exam
              </button>
            )}
            <button 
              onClick={handleDeleteExam} 
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
            >
              Delete Exam
            </button>
            <Link 
              href="/admin/dashboard" 
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded transition"
            >
              Back to Dashboard
            </Link>
          
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {editing ? (
          <EditExamForm
            exam={exam}
            allSubjects={allSubjects}
            grades={grades}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            currentSubjects={currentSubjects}
            allTutors={allTutors}
            examId={examId}
          />
        ) : (
          <>
            {/* Exam Details */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-xl font-bold mb-4">Exam Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Grade</p>
                  <p className="font-semibold">{exam?.grade_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Status</p>
                  <p className="font-semibold capitalize">{exam?.status}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Exam Date</p>
                  <p className="font-semibold">{formatDate(exam?.exam_date)}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Registration Period</p>
                  <p className="font-semibold text-sm">
                    {formatDate(exam?.registration_start_date)} - {formatDate(exam?.registration_end_date)}
                  </p>
                </div>
                {exam?.description && (
                  <div className="col-span-2">
                    <p className="text-gray-600 text-sm">Description</p>
                    <p className="font-semibold">{exam.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Exam Subjects */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Exam Subjects</h2>
                <button 
                  onClick={handleOpenModal} 
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                  Assign Tutors
                </button>
              </div>
              {currentSubjects.length === 0 ? (
                <p className="text-gray-500">No subjects added yet</p>
              ) : (
                <div className="space-y-2">
                  {currentSubjects.map(sub => {
                    const assignment = assignments.find(a => a.subject_id === sub.id);
                    return (
                      <div key={sub.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-semibold">{sub.name}</span>
                          {assignment && (
                            <span className="ml-2 text-sm text-gray-600">
                              Assigned to: {assignment.tutor_name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Registered Students */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Registered Students ({registrations.length})</h2>
                <button 
                  onClick={openAddStudentModal} 
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                  Add Students
                </button>
              </div>
              
              {registrations.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded text-center">
                  <p className="text-gray-500 text-lg mb-4">No students registered yet</p>
                  <button 
                    onClick={openAddStudentModal} 
                    className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition"
                  >
                    Add Students Now
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border p-3 text-left font-semibold">Student Name</th>
                        <th className="border p-3 text-left font-semibold">Email</th>
                        <th className="border p-3 text-left font-semibold">Admission #</th>
                        <th className="border p-3 text-left font-semibold">Registered Date</th>
                        <th className="border p-3 text-left font-semibold">Status</th>
                        <th className="border p-3 text-left font-semibold">Selected Subjects</th>
                        <th className="border p-3 text-left font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((reg, idx) => (
                        <tr key={reg.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border p-3 font-semibold">{reg.student_name}</td>
                          <td className="border p-3 text-xs text-blue-600">{reg.student_email}</td>
                          <td className="border p-3 font-mono font-bold text-blue-700">{reg.admission_number}</td>
                          <td className="border p-3 text-xs">{formatDate(reg.registration_date)}</td>
                          <td className="border p-3">
                            <span className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                              reg.status === 'registered' ? 'bg-yellow-100 text-yellow-800' :
                              reg.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                          <td className="border p-3">
                            {editingRegistration === reg.id ? (
                              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 p-2 rounded bg-gray-50">
                                {currentSubjects.map(subject => (
                                  <label key={subject.id} className="flex items-center p-1 hover:bg-white rounded cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editingSubjects.includes(subject.id)}
                                      onChange={() => handleSubjectToggle(subject.id)}
                                      className="mr-2 w-4 h-4"
                                    />
                                    <span className="text-xs font-medium">{subject.name}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {reg.chosen_subjects ? (
                                  reg.chosen_subjects.split(', ').map((subject, sidx) => (
                                    <span key={sidx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                                      {subject}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs italic">No subjects</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="border p-3">
                            {editingRegistration === reg.id ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={saveRegistrationSubjects}
                                  className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition font-semibold"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingRegistration(null);
                                    setCurrentEditingReg(null);
                                    setEditingSubjects([]);
                                  }}
                                  className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600 transition font-semibold"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditRegistrationSubjects(reg)}
                                className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition font-semibold"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {showAddStudentModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">Add Students to Exam</h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Select students from Grade {exam?.grade_name || 'N/A'} who are not yet registered:</p>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                    {availableStudents.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No available students in this grade</p>
                    ) : (
                      availableStudents.map((student) => (
                        <label key={student.student_id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.student_id)}
                            onChange={() => handleStudentToggle(student.student_id)}
                            className="mr-2 w-4 h-4"
                          />
                          <div className="flex-1">
                            <span className="font-medium">{student.student_name}</span>
                            <span className="text-xs text-gray-500 ml-2">({student.student_email})</span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowAddStudentModal(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                      disabled={addingStudents}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addSelectedStudents}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:bg-gray-400"
                      disabled={addingStudents || selectedStudentIds.length === 0}
                    >
                      {addingStudents ? 'Adding...' : `Add ${selectedStudentIds.length} Student${selectedStudentIds.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showModal && (
              <TutorAssignmentModal
                isOpen={showModal}
                onClose={handleCloseModal}
                examId={examId}
                currentSubjects={currentSubjects}
                allSubjects={allSubjects}
                onSave={handleSaveAssignments}
              />
            )}
          </>
        )}

        {/* Navigation */}
        <div className="mt-8 flex gap-4 justify-end">
          <Link
            href="/admin/exams"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Back to Exams
          </Link>
        </div>
      </div>
    </div>
  );
}