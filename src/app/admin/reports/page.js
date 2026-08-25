// ============================================
// FILE: src/app/admin/reports/page.js
// ============================================
'use client';
import { useEffect, useState } from 'react';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';

export default function AdminReports() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      setUser(userData.user);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar user={user} />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header with Back to Dashboard button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
          
          <Link
            href="/admin/dashboard"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold shadow-md flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Student Performance Report */}
          <Link
            href="/admin/reports/student-performance"
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition p-6"
          >
            <div className="text-blue-600 text-5xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Student Performance</h3>
            <p className="text-gray-600 mb-4">
              Comprehensive analysis of individual student performance across all exams
            </p>
            <span className="text-blue-600 font-semibold">View Report →</span>
          </Link>

          {/* Subject Analysis Report */}
          <Link
            href="/admin/reports/subject-analysis"
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition p-6"
          >
            <div className="text-purple-600 text-5xl mb-4">📚</div>
            <h3 className="text-xl font-bold mb-2">Subject Analysis</h3>
            <p className="text-gray-600 mb-4">
              Subject-wise performance trends and difficulty analysis
            </p>
            <span className="text-purple-600 font-semibold">View Report →</span>
          </Link>

          {/* Tutor Performance Report */}
          <Link
            href="/admin/reports/tutor-performance"
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition p-6"
          >
            <div className="text-orange-600 text-5xl mb-4">👨‍🏫</div>
            <h3 className="text-xl font-bold mb-2">Tutor Performance</h3>
            <p className="text-gray-600 mb-4">
              Track tutor workload, marks entry speed, and student outcomes
            </p>
            <span className="text-orange-600 font-semibold">View Report →</span>
          </Link>

          {/* Top Performers Report */}
          <Link
            href="/admin/reports/top-performers"
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition p-6"
          >
            <div className="text-yellow-600 text-5xl mb-4">🏆</div>
            <h3 className="text-xl font-bold mb-2">Top Performers</h3>
            <p className="text-gray-600 mb-4">
              Leaderboard and recognition for outstanding students
            </p>
            <span className="text-yellow-600 font-semibold">View Report →</span>
          </Link>

          {/* Grade Distribution Report */}
          <Link
            href="/admin/reports/grade-distribution"
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition p-6"
          >
            <div className="text-indigo-600 text-5xl mb-4">📉</div>
            <h3 className="text-xl font-bold mb-2">Grade Distribution</h3>
            <p className="text-gray-600 mb-4">
              Visual analysis of grade distributions across exams
            </p>
            <span className="text-indigo-600 font-semibold">View Report →</span>
          </Link>

          {/* Custom Report Builder */}
          <Link
            href="/admin/reports/custom"
            className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transition p-6"
          >
            <div className="text-white text-5xl mb-4">🔧</div>
            <h3 className="text-xl font-bold mb-2">Custom Report</h3>
            <p className="mb-4">
              Build your own custom reports with flexible filters
            </p>
            <span className="font-semibold">Create Report →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}