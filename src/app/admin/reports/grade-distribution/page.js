// ============================================
// FILE: src/app/admin/reports/grade-distribution/page.js
// FULL VERSION WITH "Students with exactly 0 marks" BADGE
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function GradeDistributionReport() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [distributionData, setDistributionData] = useState([]);
  const [subjectDistribution, setSubjectDistribution] = useState({});
  const [zeroCounts, setZeroCounts] = useState({}); // ← Stores exact 0s per subject
  const [topCombinations, setTopCombinations] = useState([]);
  const [selectedCombination, setSelectedCombination] = useState(null);
  const [totalStudents, setTotalStudents] = useState(0);
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
  }, [router]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/exams', {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (!res.ok) throw new Error('Failed to fetch exams');
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
    setSelectedCombination(null);
    setError('');
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports/grade-distribution?examId=${exam.id}`, {
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (!res.ok) throw new Error('Failed to fetch distribution data');
      const data = await res.json();

      setDistributionData(data.distribution || []);
      setSubjectDistribution(data.subjectDistribution || {});
      setZeroCounts(data.zeroCounts || {}); // ← Receive exact 0 counts
      setTopCombinations(data.topCombinations || []);
      setTotalStudents(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCombinationSelect = (combination) => {
    setSelectedCombination(combination === selectedCombination ? null : combination);
  };

  const exportToCSV = () => {
    if (distributionData.length === 0) {
      alert('No data to export');
      return;
    }
    const header = 'Grade,Number of Students,Percentage (%)\n';
    const rows = distributionData
      .map((grade) => `"${grade.grade}",${grade.count},${grade.percentage}`)
      .join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExam.exam_name}_grade_distribution.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const sortedGradesOrder = ['A', 'B', 'C', 'S', 'W'];

  const gradeColors = {
    A: { bg: 'rgba(75, 192, 192, 0.8)', border: 'rgba(75, 192, 192, 1)' },
    B: { bg: 'rgba(255, 206, 86, 0.8)', border: 'rgba(255, 206, 86, 1)' },
    C: { bg: 'rgba(153, 102, 255, 0.8)', border: 'rgba(153, 102, 255, 1)' },
    S: { bg: 'rgba(255, 159, 64, 0.8)', border: 'rgba(255, 159, 64, 1)' },
    W: { bg: 'rgba(255, 99, 132, 0.8)', border: 'rgba(255, 99, 132, 1)' },
  };

  const sortedDistribution = [...distributionData].sort(
    (a, b) => sortedGradesOrder.indexOf(a.grade) - sortedGradesOrder.indexOf(b.grade)
  );

  const pieData = {
    labels: sortedDistribution.map((d) => d.grade),
    datasets: [
      {
        data: sortedDistribution.map((d) => d.count),
        backgroundColor: sortedDistribution.map((d) => gradeColors[d.grade].bg),
        borderColor: sortedDistribution.map((d) => gradeColors[d.grade].border),
        borderWidth: 1,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: `Overall Grade Distribution for ${selectedExam?.exam_name || ''}`,
      },
    },
  };

  if (loading && exams.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-lg">Loading exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
  <h1 className="text-3xl font-bold text-gray-800">Grade Distribution Report</h1>
  
  <div className="flex flex-wrap gap-4">
    {/* Back to Dashboard - NEW */}
    <Link
      href="/admin/dashboard"
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold shadow-md flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      Back to Dashboard
    </Link>

    {/* Back to Reports */}
    <Link
      href="/admin/reports"
      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to Reports
    </Link>

    {/* Export CSV - only when exam selected */}
    {selectedExam && (
      <button
        onClick={exportToCSV}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold shadow-md flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
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
          {exams.length === 0 ? (
            <p className="text-gray-500">No exams found</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => handleExamSelect(exam)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedExam?.id === exam.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-800">{exam.exam_name}</h3>
                  <p className="text-sm text-gray-600">
                    {exam.grade_name} | {new Date(exam.exam_date).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedExam && (
          <div className="space-y-6">
            {/* Overall Distribution */}
            <div className="bg-white rounded-lg shadow">
              <h3 className="p-6 text-lg font-bold text-gray-800 border-b">
                Overall Grade Distribution
              </h3>
              {loading ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : distributionData.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No data found</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6 p-6">
                  <div className="h-64">
                    <Pie data={pieData} options={pieOptions} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Number of Students</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Percentage (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sortedDistribution.map((grade, idx) => (
                          <tr key={grade.grade} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 font-medium text-gray-900">{grade.grade}</td>
                            <td className="px-6 py-4 text-center text-gray-700">{grade.count}</td>
                            <td className="px-6 py-4 text-center text-gray-700">{grade.percentage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Subject-wise Distribution WITH 0 MARKS BADGE */}
            <div className="bg-white rounded-lg shadow">
              <h3 className="p-6 text-lg font-bold text-gray-800 border-b">
                Subject-wise Grade Percentages
              </h3>
              {Object.keys(subjectDistribution).length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No subject data</p>
                </div>
              ) : (
                <div className="p-6 space-y-8">
                  {Object.entries(subjectDistribution).map(([subject, grades]) => {
                    const sortedGrades = Object.entries(grades).sort(
                      ([g1], [g2]) => sortedGradesOrder.indexOf(g1) - sortedGradesOrder.indexOf(g2)
                    );

                    const subjectPieData = {
                      labels: sortedGrades.map(([g]) => g),
                      datasets: [{
                        data: sortedGrades.map(([, c]) => c),
                        backgroundColor: sortedGrades.map(([g]) => gradeColors[g].bg),
                        borderColor: sortedGrades.map(([g]) => gradeColors[g].border),
                        borderWidth: 1,
                      }],
                    };

                    const subjectPieOptions = {
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: `Grade Distribution for ${subject}` },
                      },
                    };

                    const zeroCount = zeroCounts[subject] || 0;

                    return (
                      <div key={subject} className="mb-6 border-b pb-6 last:border-0">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold text-gray-800 text-lg">{subject}</h4>
                          <span className="text-sm font-bold text-red-700 bg-red-100 px-4 py-2 rounded-full">
                            Students with exactly 0 marks: {zeroCount}
                          </span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="h-64">
                            <Pie data={subjectPieData} options={subjectPieOptions} />
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Count</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Percentage (%)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {sortedGrades.map(([grade, count], idx) => (
                                  <tr key={grade} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-2 font-medium text-gray-900">{grade}</td>
                                    <td className="px-4 py-2 text-center text-gray-700">{count}</td>
                                    <td className="px-4 py-2 text-center text-gray-700">
                                      {((count / totalStudents) * 100).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Grade Combinations */}
            <div className="bg-white rounded-lg shadow">
              <h3 className="p-6 text-lg font-bold text-gray-800 border-b">
                Grade Combinations (e.g., A:2, W:1)
              </h3>
              {topCombinations.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No combinations data</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Combination</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Number of Students</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {topCombinations.map((combo, idx) => (
                        <tr
                          key={idx}
                          className={`cursor-pointer hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={() => handleCombinationSelect(combo.combination)}
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">{combo.combination}</td>
                          <td className="px-6 py-4 text-center font-bold text-blue-600">{combo.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {selectedCombination && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-800">Students with {selectedCombination}:</h4>
                        <button
                          onClick={() => setSelectedCombination(null)}
                          className="text-blue-500 hover:text-blue-700 font-semibold"
                        >
                          Close
                        </button>
                      </div>
                      <p className="mb-4 text-gray-600">
                        Total: {topCombinations.find(c => c.combination === selectedCombination)?.count}
                      </p>
                      <ul className="list-disc pl-5 max-h-60 overflow-y-auto space-y-1">
                        {topCombinations.find(c => c.combination === selectedCombination)?.students.map((name, idx) => (
                          <li key={idx} className="text-sm text-gray-700">{name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}