// ============================================
// FILE: src/app/admin/reports/tutor-performance/page.js (UPDATED - Handle time_taken as null)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TutorPerformanceReport() {
  const router = useRouter();
  const [tutors, setTutors] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
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
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/tutors', {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch tutors');
      }

      const data = await res.json();
      setTutors(data.tutors || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTutorSelect = async (tutor) => {
    setSelectedTutor(tutor);
    setError('');

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports/tutor-performance?tutorId=${tutor.id}`, {
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

  const exportToCSV = () => {
    if (performanceData.length === 0) {
      alert('No data to export');
      return;
    }

    const header = 'Exam Name,Marks Entered,Time Taken (min),Accuracy Rate (%)\n';
    const rows = performanceData.map(exam => 
      `"${exam.exam_name}",${exam.marks_entered},${exam.time_taken || 'N/A'},${exam.accuracy_rate ? parseFloat(exam.accuracy_rate).toFixed(2) : 'N/A'}`
    ).join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTutor.full_name}_performance.csv`;
    a.click();
  };

  if (loading && tutors.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-800">Tutor Performance Report</h1>
          <div className="flex gap-4">
            <Link
              href="/admin/reports"
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
            >
              Back to Reports
            </Link>
            {selectedTutor && (
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
          <h2 className="text-xl font-bold mb-4">Select Tutor</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tutors.map(tutor => (
              <button
                key={tutor.id}
                onClick={() => handleTutorSelect(tutor)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedTutor?.id === tutor.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-semibold text-gray-800">{tutor.full_name}</h3>
                <p className="text-sm text-gray-600">{tutor.email}</p>
                <p className="text-xs text-gray-500">Subjects: {tutor.subjects || 'N/A'}</p>
              </button>
            ))}
          </div>
        </div>

        {selectedTutor && (
          <div className="bg-white rounded-lg shadow">
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
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Marks Entered</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Time Taken (min)</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Accuracy Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {performanceData.map((exam, idx) => (
                      <tr key={exam.exam_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 font-medium text-gray-900">{exam.exam_name}</td>
                        <td className="px-6 py-4 text-center text-gray-700">{exam.marks_entered}</td>
                        <td className="px-6 py-4 text-center text-gray-700">{exam.time_taken || 'N/A'}</td>
                        <td className={`px-6 py-4 text-center font-bold ${exam.accuracy_rate >= 95 ? 'text-green-600' : 'text-red-600'}`}>
                          {exam.accuracy_rate ? parseFloat(exam.accuracy_rate).toFixed(2) : 'N/A'}
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