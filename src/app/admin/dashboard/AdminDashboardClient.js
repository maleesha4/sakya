// src/app/admin/dashboard/AdminDashboardClient.js
'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';
import ChangePasswordModal from '../../../components/ChangePasswordModal';
import AdminChangePasswordModal from '../../../components/AdminChangePasswordModal';
import { 
  Users, 
  UserCheck, 
  FileText, 
  Calendar, 
  Clock, 
  Plus, 
  BookOpen, 
  BarChart3, 
  ArrowRight,
  GraduationCap,
  School,
  TrendingUp,
  Activity,
  Award
} from 'lucide-react';

// Animated counter hook
function useCountUp(end, duration = 1000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!end) { setCount(0); return; }
    let startTime;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);
  return count;
}

function StatCard({ icon: Icon, label, value, subtext, color, trend }) {
  const displayValue = useCountUp(value);
  const gradients = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    emerald: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    rose: 'from-rose-500 to-rose-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };
  const bgColors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    rose: 'bg-rose-50 text-rose-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };

  return (
    <div className="group relative bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradients[color]} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 ${bgColors[color]} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-7 h-7" />
          </div>
          {trend && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" /> {trend}
            </span>
          )}
        </div>
        <p className="text-4xl font-bold text-gray-800 mb-1">{displayValue}</p>
        <p className="font-semibold text-gray-700">{label}</p>
        <p className="text-sm text-gray-400 mt-1">{subtext}</p>
      </div>
    </div>
  );
}

function MiniBarChart({ data }) {
  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  
  return (
    <div className="flex items-end justify-between gap-2 h-40 mt-4">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="relative w-full flex justify-center">
            <div 
              className="w-full max-w-[40px] bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-500 group-hover:from-emerald-600 group-hover:to-emerald-500"
              style={{ height: `${(item.value / max) * 120}px` }}
            />
            <span className="absolute -top-6 text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.value}
            </span>
          </div>
          <span className="text-xs font-medium text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showNotification, setShowNotification] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: { grade6: 0, grade7: 0, grade8: 0, grade9: 0, grade10: 0, grade11: 0 },
    totalTutors: 0,
    totalExams: 0,
    activeExams: 0,
    pendingRegistrations: 0
  });
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const successMessage = searchParams.get('success');

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
    fetchData();
  }, [router]);

  useEffect(() => {
    if (successMessage) {
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userRes = await fetch('/api/auth/me', { 
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (userRes.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/login');
        return;
      }
      if (userRes.status !== 200) throw new Error('Failed to fetch user data');
      const userData = await userRes.json();
      const fetchedUser = userData.user;
      if (!fetchedUser || fetchedUser.role !== 'admin') {
        localStorage.removeItem('auth_token');
        router.push('/login');
        return;
      }
      setUser(fetchedUser);

      const statsRes = await fetch('/api/admin/stats', { 
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (statsRes.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/login');
        return;
      }
      if (statsRes.status !== 200) throw new Error('Failed to fetch stats');
      const statsData = await statsRes.json();
      setStats(statsData.stats || {
        totalStudents: { grade6: 0, grade7: 0, grade8: 0, grade9: 0, grade10: 0, grade11: 0 },
        totalTutors: 0,
        totalExams: 0,
        activeExams: 0,
        pendingRegistrations: 0
      });

      const examsRes = await fetch('/api/admin/exams', { 
        headers: getAuthHeaders(),
        credentials: 'same-origin'
      });
      if (examsRes.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/login');
        return;
      }
      if (examsRes.status !== 200) throw new Error('Failed to fetch exams');
      const examsData = await examsRes.json();
      setRecentExams(examsData.exams?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error in fetchData:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalStudentsCount = Object.values(stats.totalStudents || {}).reduce((a, b) => a + Number(b), 0);
  const gradeData = [6, 7, 8, 9, 10, 11].map(g => ({
    label: `G${g}`,
    value: Number(stats.totalStudents[`grade${g}`]) || 0
  }));

  const quickActions = [
    { href: '/admin/exams/create', title: 'Create Exam', desc: 'Set up a new exam', icon: Plus, gradient: 'from-blue-500 to-blue-600' },
    { href: '/admin/students', title: 'Manage Students', desc: 'View & edit students', icon: Users, gradient: 'from-emerald-500 to-emerald-600' },
    { href: '/admin/tutors', title: 'Manage Tutors', desc: 'View & edit tutors', icon: UserCheck, gradient: 'from-purple-500 to-purple-600' },
    { href: '/admin/results', title: 'Exam Results', desc: 'View all exam results', icon: BarChart3, gradient: 'from-cyan-500 to-cyan-600' },
    { href: '/admin/reports', title: 'Reports', desc: 'Analytics & reports', icon: Activity, gradient: 'from-orange-500 to-orange-600' },
    { href: '/admin/students/create', title: 'Create Student', desc: 'Add a new student', icon: GraduationCap, gradient: 'from-rose-500 to-rose-600' },
    { href: '/admin/tutors/create', title: 'Create Tutor', desc: 'Add a new tutor', icon: School, gradient: 'from-violet-500 to-violet-600' },
    { href: '/admin/subjects/create', title: 'Create Subject', desc: 'Add a new subject', icon: BookOpen, gradient: 'from-teal-500 to-teal-600' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-72px)]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-gray-500 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-gray-800">Error Loading Dashboard</h1>
          <p className="mb-6 text-gray-500">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={fetchData} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">
              Retry
            </button>
            <Link href="/login" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-semibold transition-colors">
              Logout
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />
      
      {showNotification && (
        <div className="fixed top-20 right-4 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <Award className="w-5 h-5" />
          {successMessage}
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8 flex-grow max-w-7xl">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white p-8 mb-8 shadow-lg">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-emerald-100 font-medium mb-1">Welcome back! 👋</p>
                <h1 className="text-3xl md:text-4xl font-bold">{user?.full_name || 'Admin'}</h1>
                <p className="text-emerald-100 mt-2 max-w-xl">
                  Manage exams, students, tutors, and track your institute performance from one place.
                </p>
              </div>
              <Link 
                href="/admin/exams/create"
                className="inline-flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all w-fit"
              >
                <Plus className="w-5 h-5" /> Create Exam
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            icon={Users} 
            label="Total Students" 
            value={totalStudentsCount} 
            subtext="Across all grades" 
            color="blue" 
            trend="+12%"
          />
          <StatCard 
            icon={UserCheck} 
            label="Active Tutors" 
            value={stats.totalTutors} 
            subtext="Teaching staff" 
            color="purple" 
          />
          <StatCard 
            icon={FileText} 
            label="Total Exams" 
            value={stats.totalExams} 
            subtext="Created exams" 
            color="emerald" 
            trend="+5"
          />
          <StatCard 
            icon={Calendar} 
            label="Active Exams" 
            value={stats.activeExams} 
            subtext="Open for registration" 
            color="orange" 
          />
        </div>

        {/* Grade Chart + Pending */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Students by Grade</h2>
                <p className="text-sm text-gray-400">Distribution across grades 6-11</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
            <MiniBarChart data={gradeData} />
          </div>

          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl shadow-lg p-6 text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Pending</h2>
                  <p className="text-white/70 text-sm">Registrations</p>
                </div>
              </div>
              <p className="text-6xl font-bold">{stats.pendingRegistrations}</p>
              <p className="text-white/80 mt-2">Awaiting confirmation</p>
            </div>
            <Link 
              href="/admin/exams" 
              className="inline-flex items-center justify-center gap-2 mt-6 text-sm font-bold bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-3 rounded-xl transition-colors"
            >
              Review all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-6 bg-emerald-500 rounded-full" />
            <h2 className="text-xl font-bold text-gray-800">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-11 h-11 bg-gradient-to-br ${action.gradient} text-white rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-800">{action.title}</h3>
                <p className="text-sm text-gray-400 mt-0.5">{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Exams */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Recent Exams</h2>
              <p className="text-sm text-gray-400">Latest exam activity</p>
            </div>
            <Link href="/admin/exams" className="text-emerald-600 hover:text-emerald-700 font-bold text-sm flex items-center gap-1 bg-emerald-50 px-4 py-2 rounded-xl transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentExams.length === 0 ? (
            <div className="text-center py-14 bg-slate-50 rounded-2xl border-2 border-dashed border-gray-200">
              <FileText className="w-14 h-14 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No exams created yet</p>
              <Link href="/admin/exams/create" className="text-emerald-600 font-bold text-sm mt-2 inline-block hover:underline">
                Create your first exam
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExams.map(exam => (
                <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-emerald-50/50 transition-colors border border-transparent hover:border-emerald-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{exam.exam_name}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(exam.exam_date).toLocaleDateString()} · Grade {exam.grade_name || 'N/A'} · {exam.registration_count || 0} registrations
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize ${
                      exam.status === 'registration_open' ? 'bg-emerald-100 text-emerald-700' :
                      exam.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      exam.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {exam.status?.replace(/_/g, ' ')}
                    </span>
                    <Link
                      href={`/admin/exams/${exam.id}`}
                      className="text-emerald-600 hover:text-emerald-700 font-bold text-sm bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4 mt-8">
        <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Institute of Sakya</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-gray-700 px-5 py-2.5 rounded-xl transition-colors font-semibold text-sm"
            >
              Change My Password
            </button>
            <button
              onClick={() => setShowAdminPasswordModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition-colors font-semibold text-sm"
            >
              Change User Password
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)}
        user={user}
      />
      <AdminChangePasswordModal 
        isOpen={showAdminPasswordModal} 
        onClose={() => setShowAdminPasswordModal(false)}
      />
    </div>
  );
}
