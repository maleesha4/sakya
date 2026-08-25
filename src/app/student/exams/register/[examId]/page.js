// ============================================
// FILE: src/app/student/exams/register/[examId]/page.js (ATTRACTIVE UI + DARK MODE)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from "next/image";

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function RegisterExam() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId;
  const [exam, setExam] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchExam();
    fetchSubjects();
  }, [examId]);

  const fetchExam = async () => {
    try {
      const res = await fetch(`/api/student/exams/${examId}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('auth_token');
          router.push('/login');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch exam');
      }
      const data = await res.json();
      setExam(data.exam);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`/api/student/exams/${examId}/subjects`, { headers: getAuthHeaders() });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('auth_token');
          router.push('/login');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch subjects');
      }
      const data = await res.json();
      setAvailableSubjects(data.subjects);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleRegister = async () => {
    if (selectedSubjects.length === 0) {
      setError('Please select at least one subject');
      return;
    }

    try {
      setError('');
      setRegistering(true);
      const res = await fetch('/api/student/exams/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          exam_id: parseInt(examId),
          subject_ids: selectedSubjects
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('auth_token');
          router.push('/login');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.error || 'Registration failed');
      }

      const data = await res.json();
      router.push(`/student/dashboard?success=registered&admission=${data.admission_number}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      // Updated: Dark mode for loading screen
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">Loading exam details...</p>
        </div>
      </div>
    );
  }

  return (
    // Updated: Page gradient for dark mode
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Section - Updated: Text contrast for dark mode */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center">
            <div className="bg-white dark:bg-gray-700 rounded-full p-3 shadow-xl mb-4">
              <Image src="/logo.png" alt="Institute Logo" width={80} height={80} className="rounded-full" />
            </div>
            <Image src="/sipsara.png" alt="සිප්සර" width={250} height={70} className="mb-2" />
            <h1 className="text-2xl font-bold tracking-wide">අධ්‍යාපන ආයතනය</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Title - Updated: Text for dark mode */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">විභාගය සඳහා ලියාපදිංචිවීම</h2>
          <div className="h-1 w-32 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
        </div>
        
        {/* Exam Details Card - Updated: Card and text for dark mode */}
        {exam && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8 border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">{exam.exam_name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-4 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold">
                    {exam.grade_name}
                  </span>
                  <span className="inline-block px-4 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full text-sm font-semibold">
                    {exam.status}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
                  <div className="text-xs uppercase tracking-wide mb-1">Exam Date</div>
                  <div className="text-2xl font-bold">{new Date(exam.exam_date).getDate()}</div>
                  <div className="text-sm">{new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
            
            {exam.description && (
              // Updated: Description box for dark mode
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 border-blue-500 dark:border-blue-400">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{exam.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase">Registration Opens</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatDate(exam.registration_start_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase">Registration Closes</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatDate(exam.registration_end_date)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Message - Updated: Alert for dark mode */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-lg flex items-start gap-3 animate-shake">
            <svg className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">Registration Error</h4>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}
        
        {/* Subject Selection Card - Updated: Card and text for dark mode */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">විෂය තෝරන්න</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">ඔබ සම්බන්ද වීමට බලාපොරොත්තු වන විෂයන් සියල්ල සලකුණු කරන්න</p>
            </div>
          </div>

          {/* Selected Count Badge - Updated: Badge for dark mode */}
          {selectedSubjects.length > 0 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Selected Subjects:</span>
                <span className="px-4 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-bold shadow-md">
                  {selectedSubjects.length} {selectedSubjects.length === 1 ? 'Subject' : 'Subjects'}
                </span>
              </div>
            </div>
          )}
          
          <div className="space-y-2 max-h-96 overflow-y-auto p-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl">
            {availableSubjects.length > 0 ? (
              availableSubjects.map((subject, index) => (
                <label 
                  key={subject.id} 
                  className={`group flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedSubjects.includes(subject.id)
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-400 dark:border-blue-600 shadow-md scale-[1.02]'
                      : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-sm'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center flex-1">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(subject.id)}
                        onChange={() => handleSubjectChange(subject.id)}
                        className="w-5 h-5 text-blue-600 dark:text-blue-400 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
                      />
                      {selectedSubjects.includes(subject.id) && (
                        <div className="absolute -top-1 -right-1 bg-green-500 dark:bg-green-600 rounded-full p-0.5">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className={`ml-4 font-medium transition-colors ${
                      selectedSubjects.includes(subject.id)
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100'
                    }`}>
                      {subject.name}
                    </span>
                  </div>
                  {selectedSubjects.includes(subject.id) && (
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>
              ))
            ) : (
              // Updated: Empty subjects state for dark mode
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 text-lg">No subjects available for this exam</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons - Updated: Buttons for dark mode */}
          <div className="mt-8 flex gap-4 justify-end">
            <button 
              onClick={() => router.back()} 
              disabled={registering}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all duration-200 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Cancel
            </button>
            <button 
              onClick={handleRegister} 
              disabled={selectedSubjects.length === 0 || registering}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {registering ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Registering...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Register for Exam
                  {selectedSubjects.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-white bg-opacity-20 rounded-full text-xs">
                      {selectedSubjects.length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>

          {/* Info Message - Updated: Info box for dark mode */}
          {selectedSubjects.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Registration Confirmation</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">You are about to register for {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''}. Click "Register for Exam" to complete your registration.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
}