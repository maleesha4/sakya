// ============================================
// FILE: src/app/admin/reports/student-performance/page.js (UPDATED - Add subject-wise view)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentPerformanceReport() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [subjectData, setSubjectData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSubjects, setShowSubjects] = useState(false);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setStudents([]);
      return;
    }
    fetchStudents();
  }, [searchQuery]);

  const fetchStudents = async () => {
    try {
      setSearchLoading(true);
      const res = await fetch(`/api/admin/students/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      if (!res.ok) {
        throw new Error('Failed to search students');
      }

      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStudentSelect = async (student) => {
    setSelectedStudent(student);
    setError('');
    setShowSubjects(false);
    setSelectedExam(null);

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports/student-performance?studentId=${student.id}`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const data = await res.json();
      setPerformanceData(data.performance || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = async (exam) => {
    setSelectedExam(exam);
    setError('');

    try {
      setSubjectLoading(true);
      const res = await fetch(`/api/admin/reports/student-exam-subjects?studentId=${selectedStudent.id}&examId=${exam.exam_id}`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch subject data');
      }

      const data = await res.json();
      setSubjectData(data.subjects || []);
      setShowSubjects(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubjectLoading(false);
    }
  };

  const closeSubjects = () => {
    setShowSubjects(false);
    setSelectedExam(null);
  };

  const exportToCSV = () => {
    if (performanceData.length === 0) {
      alert('No data to export');
      return;
    }

    const header = 'Exam Name,Exam Date,Total,Average,Grade\n';
    const rows = performanceData.map(exam => 
      `"${exam.exam_name}",${new Date(exam.exam_date).toLocaleDateString()},${exam.total || 'N/A'},${exam.average ? parseFloat(exam.average).toFixed(2) : 'N/A'},"${exam.grade || 'N/A'}"`
    ).join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedStudent.full_name}_performance.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Student Performance Report</h1>
          <div className="flex gap-4">
            <Link
              href="/admin/reports"
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
            >
              Back to Reports
            </Link>
            {selectedStudent && (
              <button
                onClick={exportToCSV}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Student by Name</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter student name..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          {searchLoading && <p className="text-gray-500">Searching...</p>}
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {students.map(student => (
              <button
                key={student.id}
                onClick={() => handleStudentSelect(student)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedStudent?.id === student.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-semibold text-gray-800">{student.full_name}</h3>
              </button>
            ))}
          </div>
          {students.length === 0 && searchQuery.length >= 2 && !searchLoading && (
            <p className="text-gray-500">No students found</p>
          )}
          {searchQuery.length < 2 && searchQuery.length > 0 && (
            <p className="text-gray-500 text-sm">Enter at least 2 characters to search</p>
          )}
        </div>

        {selectedStudent && (
          <>
            <div className="bg-white rounded-lg shadow mb-6">
              {loading ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">Loading performance data...</p>
                </div>
              ) : performanceData.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No performance data found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Average</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {performanceData.map((exam, idx) => (
                        <tr key={exam.exam_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 font-medium text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => handleExamSelect(exam)}>
                            {exam.exam_name}
                          </td>
                          <td className="px-6 py-4 text-gray-700">{new Date(exam.exam_date).toLocaleDateString()}</td>
                          <td className={`px-6 py-4 text-center font-bold ${exam.total >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                            {exam.total || 'N/A'}
                          </td>
                          <td className={`px-6 py-4 text-center font-bold ${parseFloat(exam.average) >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                            {exam.average ? parseFloat(exam.average).toFixed(2) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-700">{exam.grade || 'N/A'}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleExamSelect(exam)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                            >
                              View Subjects
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {showSubjects && selectedExam && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    Subjects for {selectedExam.exam_name} - {selectedStudent.full_name}
                  </h2>
                  <button
                    onClick={closeSubjects}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
                {subjectLoading ? (
                  <div className="p-12 text-center">
                    <p className="text-gray-500">Loading subjects...</p>
                  </div>
                ) : subjectData.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-gray-500">No subject data found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {subjectData.map((subject, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 font-medium text-gray-900">{subject.subject_name}</td>
                            <td className={`px-6 py-4 text-center font-bold ${subject.score >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                              {subject.score !== null ? subject.score : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-center text-gray-700">{subject.grade || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}