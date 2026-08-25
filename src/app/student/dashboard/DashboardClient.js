// ============================================
// FILE: src/app/student/dashboard/DashboardClient.js (WITH LOADING BUTTON STATE & DARK MODE)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';
import Image from 'next/image';
import ChangePasswordModal from '../../../components/ChangePasswordModal';
import AdmissionCardGenerator from '../../../components/AdmissionCardGenerator';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token')}`
});

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [downloadedIds, setDownloadedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  // Loading state for the admission button
  const [loadingRegId, setLoadingRegId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const success = searchParams.get('success');
    const admission = searchParams.get('admission');
    
    if (success === 'registered') {
      setSuccessMessage('Registration successful!');
      if (admission) {
        setAdmissionNumber(admission);
      }
      router.replace('/student/dashboard');
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (!userRes.ok) {
        localStorage.removeItem('auth_token');
        router.push('/login?error=unauthorized');
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);

      const examsRes = await fetch('/api/student/exams/available', { headers: getAuthHeaders() });
      if (examsRes.ok) {
        const examsData = await examsRes.json();
        setExams(examsData.exams || []);
      }

      const regsRes = await fetch('/api/student/registrations', { headers: getAuthHeaders() });
      if (regsRes.ok) {
        const regsData = await regsRes.json();
        setRegistrations(regsData.registrations || []);
      }

      const assignmentsRes = await fetch('/api/student/assignments', { headers: getAuthHeaders() });
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      localStorage.removeItem('auth_token');
      router.push('/login?error=fetch_failed');
    } finally {
      setLoading(false);
    }
  };

  // For testing with provided date: const now = new Date('2025-12-20');
  const now = new Date();
  const availableExams = exams.filter(exam => {
    const regStart = new Date(exam.registration_start_date);
    const regEnd = new Date(exam.registration_end_date);
    const isOpen = now >= regStart && now <= regEnd && exam.status === 'registration_open';
    const notRegistered = !registrations.some(reg => reg.admin_exam_id === exam.id);
    return isOpen && notRegistered;
  });

  const availableExamsCount = availableExams.length;

  // Filter assignments not yet submitted, including those within 24-hour late submission window
  const pendingAssignments = assignments.filter(assignment => {
    const closingDateTime = new Date(`${assignment.due_date}T${assignment.closing_time}`);
    const isOverdue = new Date() > closingDateTime;
    const isSubmitted = assignment.submission_status === 'submitted' || assignment.submission_status === 'graded';
    
    // Allow late submission within 24 hours after deadline
    const lateSubmissionWindow = new Date(closingDateTime.getTime() + 24 * 60 * 60 * 1000);
    const withinLateSubmission = new Date() <= lateSubmissionWindow;
    
    return !isSubmitted && (!isOverdue || withinLateSubmission);
  });

  const hasPendingAssignments = pendingAssignments.length > 0;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (err) {
      return 'Invalid Date';
    }
  };

  const openAdmissionModal = async (reg) => {
    try {
      const res = await fetch(`/api/student/registrations/${reg.id}`, { headers: getAuthHeaders() });

      let detailedReg = reg;
      if (res.ok) {
        const data = await res.json();
        detailedReg = data.registration;
      }

      setSelectedRegistration(detailedReg);
      setShowAdmissionModal(true);

    } catch (error) {
      console.error('Error fetching detailed registration:', error);
      setSelectedRegistration(reg);
      setShowAdmissionModal(true);
    } finally {
      setLoadingRegId(null);
    }
  };

  const handleDownloadComplete = (regId) => {
    setDownloadedIds(prev => new Set([...prev, regId]));
  };

  // FIXED: Use user.student_id instead of user.id
  const studentAdmissionNumber = user && user.student_id 
    ? (25012300 + Number(user.student_id)).toString() 
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar user={user} />
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-700 dark:text-gray-300">Access denied. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-300 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <Navbar user={user} />
      
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 p-4 m-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              ✔
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {successMessage}
              </p>
              {admissionNumber && (
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Your admission number: <span className="font-bold">{admissionNumber}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-auto text-green-400 dark:text-green-500 hover:text-green-600 dark:hover:text-green-400"
            >
              ✖
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center py-6">
        <div className="mb-4">
          <Image 
            src="/logo.png" 
            alt="Institute Logo" 
            width={120} 
            height={120}
            className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-[120px] lg:h-[120px] object-contain"
          />
        </div>

        <div className="flex flex-col items-center mt-2">
          <Image 
            src="/sipsara.png" 
            alt="සිප්සර" 
            width={300} 
            height={80}
            className="w-48 h-12 sm:w-64 sm:h-16 md:w-80 md:h-20 lg:w-[300px] lg:h-[80px] object-contain"
          />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mt-3 text-black dark:text-white">
            අධ්‍යාපන ආයතනය
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-grow">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Student Dashboard</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link href="/student/exams" className="bg-blue-500 dark:bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500">
            <h3 className="text-xl font-bold mb-2">Available Exams</h3>
            <p className="text-3xl">{availableExamsCount}</p>
          </Link>
          
          <Link href="/student/registrations" className="bg-green-500 dark:bg-green-600 text-white p-6 rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500">
            <h3 className="text-xl font-bold mb-2">My Registrations</h3>
            <p className="text-3xl">{registrations.length}</p>
          </Link>
          
          <Link href="/student/results" className="bg-purple-500 dark:bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-600 dark:hover:bg-purple-700 transition focus:outline-none focus:ring-2 focus:ring-purple-500">
            <h3 className="text-xl font-bold mb-2">Exam Results</h3>
            <p className="text-3xl">View</p>
          </Link>

          {hasPendingAssignments && (
            <Link href="/student/assignments" className="bg-orange-500 dark:bg-orange-600 text-white p-6 rounded-lg hover:bg-orange-600 dark:hover:bg-orange-700 transition focus:outline-none focus:ring-2 focus:ring-orange-500">
              <h3 className="text-xl font-bold mb-2">📝 My Assignments</h3>
              <p className="text-sm">View & submit work</p>
            </Link>
          )}

          <Link href="/student/marks" className="bg-indigo-500 dark:bg-indigo-600 text-white p-6 rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <h3 className="text-xl font-bold mb-2">📊 View Assignment Marks</h3>
            <p className="text-sm">Your grades & feedback</p>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Available Exams</h2>
            {availableExams.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No exams available</p>
            ) : (
              <div className="space-y-4">
                {availableExams.slice(0, 3).map(exam => (
                  <div key={exam.id} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 bg-blue-50 dark:bg-blue-900/20">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{exam.exam_name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Grade: {exam.grade_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Date: {formatDate(exam.exam_date)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Registration: {formatDate(exam.registration_start_date)} - {formatDate(exam.registration_end_date)}</p>
                    
                    <Link 
                      href={`/student/exams/register/${exam.id}`}
                      className="mt-2 inline-block bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Register
                    </Link>
                  </div>
                ))}
                {availableExamsCount > 3 && (
                  <Link href="/student/exams" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-semibold">
                    View All Exams →
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">My Registrations</h2>
            {registrations.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">You haven't registered for any exams yet</p>
            ) : (
              <div className="space-y-4">
                {registrations.slice(0, 3).map(reg => (
                  <div key={reg.id} className="border-l-4 border-green-500 dark:border-green-400 pl-4 bg-green-50 dark:bg-green-900/20 p-3 rounded">
                    <h3 className="font-semibold text-green-900 dark:text-green-200">{reg.exam_name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status: <span className="font-semibold capitalize">{reg.registration_status}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Exam Status: <span className="font-semibold capitalize">{reg.exam_status}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Admission: <span className="font-mono font-bold">{reg.admission_number}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span className="font-semibold">Subjects:</span>
                    </p>

                    {reg.chosen_subjects ? (
                      <div className="flex flex-wrap gap-1">
                        {reg.chosen_subjects.split(', ').map((subject, idx) => (
                          <span key={idx} className="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs font-semibold">
                            {subject}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 dark:text-gray-400">No subjects selected</p>
                    )}

                    {reg.exam_status === 'send_admission_cards' && (
                      <button
                        onClick={() => {
                          setLoadingRegId(reg.id); 
                          openAdmissionModal(reg);
                        }}
                        disabled={downloadedIds.has(reg.id) || loadingRegId === reg.id}
                        className={`mt-2 px-4 py-1 rounded transition text-sm font-semibold focus:outline-none focus:ring-2 ${
                          downloadedIds.has(reg.id)
                            ? 'bg-gray-400 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed'
                            : loadingRegId === reg.id
                              ? 'bg-blue-300 dark:bg-blue-700 text-white cursor-wait'
                              : 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700'
                        }`}
                      >
                        {downloadedIds.has(reg.id)
                          ? '✅ Admission Card Downloaded'
                          : loadingRegId === reg.id
                            ? '⏳ Loading...'
                            : '📄 View & Download Admission Card'}
                      </button>
                    )}
                  </div>
                ))}
                {registrations.length > 3 && (
                  <Link href="/student/registrations" className="text-green-600 dark:text-green-400 hover:underline text-sm font-semibold">
                    View All Registrations →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Student Admission Number Card - Now correctly using student_id */}
        {user && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Student Admission Number</h2>
            {studentAdmissionNumber ? (
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {studentAdmissionNumber}
              </p>
            ) : (
              <p className="text-lg text-gray-500 dark:text-gray-400">
                Not available
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="container mx-auto flex justify-end">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            🔒 Change Password
          </button>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)}
        user={user}
      />

      {showAdmissionModal && selectedRegistration && (
        <AdmissionCardGenerator 
          registration={selectedRegistration} 
          onClose={() => {
            setShowAdmissionModal(false);
            setSelectedRegistration(null);
          }}
          onDownload={() => handleDownloadComplete(selectedRegistration.id)}
        />
      )}
    </div>
  );
}