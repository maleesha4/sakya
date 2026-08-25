// src/app/tutor/papers/PapersClient.js (DARK MODE + AUTH)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';

export default function PapersClient() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchUser();
    fetchPapers();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (!res.ok) {
        localStorage.removeItem('auth_token');
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.user?.role !== 'tutor') {
        setError('Access denied: Tutor role required.');
        setTimeout(() => router.push('/login'), 1500);
        return;
      }
      setUser(data.user);
    } catch (err) {
      console.error('Error fetching user:', err);
      localStorage.removeItem('auth_token');
      router.push('/login');
    }
  };

  const fetchPapers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tutor/papers', { headers: getAuthHeaders() });
      if (!res.ok) {
        throw new Error('Failed to fetch papers');
      }
      const data = await res.json();
      setPapers(data.papers || []);
    } catch (error) {
      console.error('Error fetching papers:', error);
      setError(error.message || 'Failed to load papers');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.target);
    try {
      const res = await fetch('/api/tutor/papers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      fetchPapers();  // Refresh list
      e.target.reset();
    } catch (error) {
      console.error('Error uploading paper:', error);
      setError(error.message || 'Failed to upload paper');
    }
  };

  if (loading) {
    return (
      // Updated: Dark mode for loading screen
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar user={user} />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-xl text-gray-700 dark:text-gray-300">Loading papers...</p>
        </div>
      </div>
    );
  }

  return (
    // Updated: Page background for dark mode
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar user={user} />
      <div className="container mx-auto px-4 py-8">
        {error && (
          // Updated: Error alert for dark mode
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 rounded-md">
            {error}
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Upload Papers</h1>
          <Link href="/tutor/dashboard" className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Back to Dashboard
          </Link>
        </div>

        {/* Upload Form - Updated: Card and form for dark mode */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Upload New Paper</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <input 
              type="text" 
              name="title" 
              placeholder="Paper Title" 
              required 
              className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-500" 
            />
            <input 
              type="file" 
              name="file" 
              accept=".pdf" 
              required 
              className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" 
            />
            <textarea 
              name="description" 
              placeholder="Description" 
              rows={3} 
              className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-500" 
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Upload
            </button>
          </form>
        </div>

        {/* Uploaded Papers List - Updated: Card and list for dark mode */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold p-6 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">Uploaded Papers</h2>
          {papers.length === 0 ? (
            // Updated: Empty state for dark mode
            <p className="p-6 text-gray-500 dark:text-gray-400">No papers uploaded yet.</p>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-600">
              {papers.map((paper) => (
                <div key={paper.id} className="p-6 flex justify-between items-center">
                  <div className="text-gray-900 dark:text-gray-100">
                    <h3 className="font-semibold">{paper.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{paper.description}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Uploaded: {new Date(paper.created_at).toLocaleDateString()}</p>
                  </div>
                  <a 
                    href={paper.file_path} 
                    className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    download
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}