// ============================================
// FILE: src/app/admin/reports/top-performers/page.js (UPDATED - Fix toFixed with parseFloat)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TopPerformersReport() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
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

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/exams', {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      if (!res.ok) {
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
    setError('');

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports/top-performers?examId=${exam.id}`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch top performers');
      }

      const data = await res.json();
      setTopPerformers(data.top_performers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (topPerformers.length === 0) {
      alert('No data to export');
      return;
    }

    const header = 'Rank,Student Name,Admission Number,Average Score\n';
    const rows = topPerformers.map((performer, idx) => 
      `${idx + 1},"${performer.student_name}",${performer.admission_number},${performer.average ? parseFloat(performer.average).toFixed(2) : 'N/A'}`
    ).join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExam.exam_name}_top_performers.csv`;
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Top Performers Report</h1>
          <div className="flex gap-4">
            <Link
              href="/admin/reports"
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
            >
              Back to Reports
            </Link>
            {selectedExam && (
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
          <h2 className="text-xl font-bold mb-4">Select Exam</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map(exam => (
              <button
                key={exam.id}
                onClick={() => handleExamSelect(exam)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedExam?.id === exam.id
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-semibold text-gray-800">{exam.exam_name}</h3>
                <p className="text-sm text-gray-600">{exam.grade_name} | {new Date(exam.exam_date).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </div>

        {selectedExam && (
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">Loading top performers...</p>
              </div>
            ) : topPerformers.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No top performers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admission Number</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Average Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {topPerformers.map((performer, idx) => (
                      <tr key={performer.student_id} className="bg-yellow-50">
                        <td className="px-6 py-4 font-bold text-yellow-800 text-center">{idx + 1}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{performer.student_name}</td>
                        <td className="px-6 py-4 text-gray-700">{performer.admission_number}</td>
                        <td className="px-6 py-4 text-center font-bold text-green-600">
                          {performer.average ? parseFloat(performer.average).toFixed(2) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}