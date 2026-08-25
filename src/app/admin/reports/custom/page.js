// ============================================
// FILE: src/app/admin/reports/custom/page.js (NEW FILE)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomReportBuilder() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({
    exams: [],
    subjects: [],
    grades: [],
    dateRange: { start: '', end: '' }
  });
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('summary'); // 'summary' or 'detailed'

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
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [examsRes, subjectsRes] = await Promise.all([
        fetch('/api/admin/exams', { headers: getAuthHeaders(), credentials: 'same-origin' }),
        fetch('/api/admin/subjects', { headers: getAuthHeaders(), credentials: 'same-origin' })
      ]);

      if (!examsRes.ok || !subjectsRes.ok) {
        throw new Error('Failed to fetch initial data');
      }

      const [examsData, subjectsData] = await Promise.all([
        examsRes.json(),
        subjectsRes.json()
      ]);

      setExams(examsData.exams || []);
      setSubjects(subjectsData.subjects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (selectedFilters.exams.length === 0) {
      setError('Select at least one exam');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        examIds: selectedFilters.exams.join(','),
        subjectIds: selectedFilters.subjects.join(','),
        reportType
      });
      if (selectedFilters.dateRange.start) params.append('startDate', selectedFilters.dateRange.start);
      if (selectedFilters.dateRange.end) params.append('endDate', selectedFilters.dateRange.end);

      const res = await fetch(`/api/admin/reports/custom?${params}`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });

      if (!res.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await res.json();
      setReportData(data.report || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    // Generic export assuming reportData is array of objects
    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom_report.csv';
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
          <h1 className="text-3xl font-bold text-gray-800">Custom Report Builder</h1>
          <Link
            href="/admin/reports"
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
          >
            Back to Reports
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Filters</h2>
          
          {/* Exam Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Exams</label>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {exams.map(exam => (
                <label key={exam.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedFilters.exams.includes(exam.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFilters(prev => ({ ...prev, exams: [...prev.exams, exam.id] }));
                      } else {
                        setSelectedFilters(prev => ({ ...prev, exams: prev.exams.filter(id => id !== exam.id) }));
                      }
                    }}
                    className="mr-2"
                  />
                  {exam.exam_name}
                </label>
              ))}
            </div>
          </div>

          {/* Report Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="summary">Summary</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>

          <button
            onClick={handleGenerateReport}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
          >
            Generate Report
          </button>
        </div>

        {reportData.length > 0 && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={exportToCSV}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
              >
                Export CSV
              </button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {reportData.length > 0 && Object.keys(reportData[0]).map(key => (
                      <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {Object.values(row).map((value, vidx) => (
                        <td key={vidx} className="px-6 py-4 text-gray-700">{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}