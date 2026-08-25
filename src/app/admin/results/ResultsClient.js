// ============================================
// FILE: src/app/admin/results/ResultsClient.js (NEW FILE)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResultsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examIdParam = searchParams.get('examId');
  
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [results, setResults] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    fetchExams();
  }, []);

  useEffect(() => {
    if (examIdParam && exams.length > 0) {
      const exam = exams.find(e => e.id === parseInt(examIdParam));
      if (exam) {
        handleExamSelect(exam);
      }
    }
  }, [examIdParam, exams]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/exams', {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch exams');
      }

      const data = await res.json();
      setExams(data.exams || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = async (exam) => {
    setSelectedExam(exam);
    setSelectedSubject('all');
    setError('');
    
    try {
      setLoading(true);
      
      // Fetch results for this exam
      const res = await fetch(`/api/admin/exams/${exam.id}/results`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await res.json();
      setResults(data.results || []);
      setSubjects(data.subjects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredResults = () => {
    if (selectedSubject === 'all') {
      return results;
    }
    return results.filter(result => {
      return result.subjects.some(s => s.subject_id === parseInt(selectedSubject));
    });
  };

  const exportToCSV = () => {
    const filtered = getFilteredResults();
    if (filtered.length === 0) {
      alert('No results to export');
      return;
    }

    // Create CSV header
    const subjectHeaders = subjects.map(s => s.name).join(',');
    const header = `Student Name,Admission Number,${subjectHeaders},Total,Average\n`;

    // Create CSV rows
    const rows = filtered.map(student => {
      const subjectScores = subjects.map(subject => {
        const found = student.subjects.find(s => s.subject_id === subject.id);
        return found ? (found.score !== null ? found.score : 'N/A') : 'N/A';
      }).join(',');

      return `"${student.student_name}",${student.admission_number},${subjectScores},${student.total},${student.average}`;
    }).join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExam.exam_name}_results.csv`;
    a.click();
  };

  if (loading && exams.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Exam Results</h1>
          <Link
            href="/admin/dashboard"
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Exam Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Select Exam</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map(exam => (
              <button
                key={exam.id}
                onClick={() => handleExamSelect(exam)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedExam?.id === exam.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-semibold text-gray-800">{exam.exam_name}</h3>
                <p className="text-sm text-gray-600">
                  {exam.grade_name} | {new Date(exam.exam_date).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {exam.registration_count || 0} students registered
                </p>
              </button>
            ))}
          </div>
          {exams.length === 0 && (
            <p className="text-gray-500">No exams available</p>
          )}
        </div>

        {/* Results Section */}
        {selectedExam && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="font-semibold text-gray-700">Filter by Subject:</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="all">All Subjects</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={exportToCSV}
                  disabled={results.length === 0}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to CSV
                </button>
              </div>
            </div>

            {/* Results Table */}
            {loading ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">Loading results...</p>
              </div>
            ) : getFilteredResults().length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">No results found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">
                        Student Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">
                        Admission #
                      </th>
                      {subjects.map(subject => (
                        <th key={subject.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">
                          {subject.name}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b bg-blue-50">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b bg-blue-50">
                        Average
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getFilteredResults().map((student, idx) => (
                      <tr key={student.student_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 font-medium text-gray-900 border-b">
                          {student.student_name}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-mono border-b">
                          {student.admission_number}
                        </td>
                        {subjects.map(subject => {
                          const subjectResult = student.subjects.find(s => s.subject_id === subject.id);
                          const score = subjectResult?.score;
                          return (
                            <td key={subject.id} className="px-4 py-3 text-center border-b">
                              {score !== null && score !== undefined ? (
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                                  score >= 75 ? 'bg-green-100 text-green-800' :
                                  score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                  score >= 35 ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {score}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">N/A</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center font-bold text-blue-900 bg-blue-50 border-b">
                          {student.total !== null ? student.total : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-blue-900 bg-blue-50 border-b">
                          {student.average !== null ? student.average.toFixed(2) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}