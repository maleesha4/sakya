// ============================================
// FILE: src/app/admin/reports/subject-analysis/page.js (UPDATED - Fix Chart.js registration and line chart)
// ============================================
'use client';

import { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function SubjectAnalysisReport() {
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [analysisData, setAnalysisData] = useState([]);
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
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/subjects', {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch subjects');
      }

      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSelect = async (subject) => {
    setSelectedSubject(subject);
    setError('');

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports/subject-analysis?subjectId=${subject.id}`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch analysis data');
      }

      const data = await res.json();
      setAnalysisData(data.analysis || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (analysisData.length === 0) {
      alert('No data to export');
      return;
    }

    const header = 'Exam Name,Average Score,Pass Rate (%),Difficulty Index\n';
    const rows = analysisData.map(exam => 
      `"${exam.exam_name}",${exam.avg_score ? parseFloat(exam.avg_score).toFixed(2) : 'N/A'},${exam.pass_rate ? parseFloat(exam.pass_rate).toFixed(2) : 'N/A'},"${exam.difficulty_index || 'N/A'}"`
    ).join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSubject.name}_analysis.csv`;
    a.click();
  };

  const chartData = {
    labels: analysisData.map(exam => exam.exam_name),
    datasets: [
      {
        label: 'Average Score',
        data: analysisData.map(exam => parseFloat(exam.avg_score || 0)),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: `Average Score Trend for ${selectedSubject?.name}`,
      },
      legend: {
        display: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Score (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Exams'
        }
      }
    },
  };

  if (loading && subjects.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-800">Subject Analysis Report</h1>
          <div className="flex gap-4">
            <Link
              href="/admin/reports"
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
            >
              Back to Reports
            </Link>
            {selectedSubject && (
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
          <h2 className="text-xl font-bold mb-4">Select Subject</h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjects.map(subject => (
              <button
                key={subject.id}
                onClick={() => handleSubjectSelect(subject)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedSubject?.id === subject.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-semibold text-gray-800">{subject.name}</h3>
                <p className="text-sm text-gray-600">{subject.code || 'N/A'}</p>
              </button>
            ))}
          </div>
        </div>

        {selectedSubject && (
          <div className="bg-white rounded-lg shadow space-y-6">
            {loading ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">Loading analysis data...</p>
              </div>
            ) : analysisData.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No analysis data found</p>
              </div>
            ) : (
              <>
                {/* Line Chart for Average Score Trend */}
                <div className="p-6 border-b">
                  <h3 className="text-lg font-bold mb-4">Average Score Trend Over Exams</h3>
                  <div className="h-64">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam Name</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Average Score</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pass Rate (%)</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Difficulty Index</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {analysisData.map((exam, idx) => (
                        <tr key={exam.exam_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 font-medium text-gray-900">{exam.exam_name}</td>
                          <td className={`px-6 py-4 text-center font-bold ${parseFloat(exam.avg_score) >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                            {exam.avg_score ? parseFloat(exam.avg_score).toFixed(2) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-700">{exam.pass_rate ? parseFloat(exam.pass_rate).toFixed(2) : 'N/A'}</td>
                          <td className="px-6 py-4 text-center text-gray-700">{exam.difficulty_index || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}