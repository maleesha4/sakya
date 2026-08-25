// ============================================
// FILE: src/app/student/results/page.js (UPDATED WITH DARK MODE)
// ============================================
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function StudentResultsPage() {
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [results, setResults] = useState(null);
  const [exams, setExams] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getGrade = (percentage) => {
    if (percentage >= 75) return 'A';
    if (percentage >= 65) return 'B';
    if (percentage >= 55) return 'C';
    if (percentage >= 35) return 'S';
    return 'F';
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'text-green-600 dark:text-green-400';
      case 'B': return 'text-blue-600 dark:text-blue-400';
      case 'C': return 'text-yellow-600 dark:text-yellow-400';
      case 'S': return 'text-orange-600 dark:text-orange-400';
      case 'F': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResults(null);
    setExams(null);
    setStudentName('');

    if (!admissionNumber.trim()) {
      setError('Please enter your admission number');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/student/results?admission=${admissionNumber.trim()}`, {
        credentials: 'same-origin'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch results');
      }

      const data = await res.json();
      if (data.exams) {
        setExams(data.exams);
        setStudentName(data.student_name);
      } else if (data.results) {
        setResults(data.results);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = async (examId) => {
    setError('');
    try {
      setLoading(true);
      const res = await fetch(`/api/student/results?admission=${admissionNumber.trim()}&exam=${examId}`, {
        credentials: 'same-origin'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch results');
      }

      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setAdmissionNumber('');
    setResults(null);
    setExams(null);
    setStudentName('');
    setError('');
  };

  return (
    // Updated: Page gradient for dark mode
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {results ? (
        // Results Sheet - Printable
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Action Buttons - Hide on print - Updated: Button colors for dark mode */}
          <div className="print:hidden flex gap-4 justify-end mb-6">
            <button
              onClick={handleReset}
              className="bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Check Another Result
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Save as PDF
            </button>
          </div>

          {/* Result Sheet - Printable - Updated: Card and text for dark mode */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 print:shadow-none print:rounded-none relative border border-gray-200 dark:border-gray-700">
            {/* Header with Certificate Badge - Updated: Badge and text for dark mode */}
            <div className="text-center mb-8 border-b-4 border-blue-600 dark:border-blue-400 pb-6 relative">
              <div className="flex items-center justify-center gap-8">
                {/* Left Badge */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {/* Star badge shape */}
                    <defs>
                      <radialGradient id="badgeGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style={{ stopColor: '#DC2626', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#991B1B', stopOpacity: 1 }} />
                      </radialGradient>
                    </defs>
                    {/* Star points */}
                    <path d="M50,5 L57,35 L87,35 L63,53 L70,83 L50,65 L30,83 L37,53 L13,35 L43,35 Z" 
                          fill="url(#badgeGradient)" stroke="#7F1D1D" strokeWidth="1"/>
                    {/* Inner circle */}
                    <circle cx="50" cy="50" r="25" fill="#DC2626" stroke="#991B1B" strokeWidth="2"/>
                    <circle cx="50" cy="50" r="20" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="1"/>
                    {/* Text */}
                    <text x="50" y="48" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">CERTIFIED</text>
                    <text x="50" y="56" textAnchor="middle" fill="white" fontSize="6">RESULTS</text>
                  </svg>
                </div>
                
                {/* Title */}
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">SIPSARA INSTITUTE</h1>
                  <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">EXAMINATION RESULTS</h2>
                </div>
                
                {/* Right Badge */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <radialGradient id="badgeGradient2" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style={{ stopColor: '#DC2626', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#991B1B', stopOpacity: 1 }} />
                      </radialGradient>
                    </defs>
                    <path d="M50,5 L57,35 L87,35 L63,53 L70,83 L50,65 L30,83 L37,53 L13,35 L43,35 Z" 
                          fill="url(#badgeGradient2)" stroke="#7F1D1D" strokeWidth="1"/>
                    <circle cx="50" cy="50" r="25" fill="#DC2626" stroke="#991B1B" strokeWidth="2"/>
                    <circle cx="50" cy="50" r="20" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="1"/>
                    <text x="50" y="48" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">CERTIFIED</text>
                    <text x="50" y="56" textAnchor="middle" fill="white" fontSize="6">RESULTS</text>
                  </svg>
                </div>
              </div>
            </div>

            {/* Student Information - Updated: Info box for dark mode */}
            <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg border-2 border-gray-200 dark:border-gray-600">
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Student Name: </span>
                  <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{results.student_name}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Examination: </span>
                  <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">{results.exam_name}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Admission Number: </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">{results.admission_number}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Grade: </span>
                  <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">{results.grade_name}</span>
                </div>
              </div>
            </div>

            {/* Results Table - Updated: Table for dark mode */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Subject-wise Performance</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-600 dark:bg-blue-700 text-white">
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left">Subject</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">Percentage</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.subjects.map((subject, index) => {
                    const percentage = subject.score;
                    const grade = getGrade(percentage ?? 0);
                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800'}>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {subject.subject_name}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                          {percentage !== null ? `${percentage}%` : 'N/A'}
                        </td>
                        <td className={`border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-bold text-xl ${getGradeColor(grade)}`}>
                          {percentage !== null ? grade : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Grade Legend - Updated: Legend for dark mode */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-5 gap-2 text-sm">
                <div className="text-center">
                  <span className={`font-bold ${getGradeColor('A')}`}>A</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">75-100%</p>
                </div>
                <div className="text-center">
                  <span className={`font-bold ${getGradeColor('B')}`}>B</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">65-74%</p>
                </div>
                <div className="text-center">
                  <span className={`font-bold ${getGradeColor('C')}`}>C</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">55-64%</p>
                </div>
                <div className="text-center">
                  <span className={`font-bold ${getGradeColor('S')}`}>S</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">35-54%</p>
                </div>
                <div className="text-center">
                  <span className={`font-bold ${getGradeColor('F')}`}>F</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">0-34%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : exams ? (
        // Exam Selection - Updated: Card and buttons for dark mode
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            {/* Header - Updated: Icon and text for dark mode */}
            <div className="text-center mb-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 dark:from-green-600 dark:to-blue-700 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Select Exam</h1>
              <p className="text-gray-600 dark:text-gray-400">Choose an exam to view your results, {studentName}</p>
            </div>

            {error && (
              // Updated: Error alert for dark mode
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-4 mb-6">
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => handleExamSelect(exam.id)}
                  disabled={loading}
                  className="w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 border-2 border-blue-200 dark:border-blue-600 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none shadow-md text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1">{exam.exam_name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
                    <span>Grade: {exam.grade_name}</span>
                    <span>{new Date(exam.exam_date).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={handleReset}
                disabled={loading}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold hover:underline disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                ← Change Admission Number
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Admission Number Form - Updated: Card and form for dark mode
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            {/* Header - Updated: Icon and text for dark mode */}
            <div className="text-center mb-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">View Your Results</h1>
              <p className="text-gray-600 dark:text-gray-400">Enter your admission number to see your exam results</p>
            </div>

            {error && (
              // Updated: Error alert for dark mode
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="admission" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Admission Number
                </label>
                <input
                  type="text"
                  id="admission"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value.toUpperCase())}
                  placeholder="Enter your admission number"
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-500 text-lg font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Example: 25012301
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !admissionNumber.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-800 dark:hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 disabled:transform-none shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Loading...
                  </span>
                ) : (
                  'View Results'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 0.5in;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}