// ============================================
// FILE: src/app/admin/students/create/page.js
// ============================================
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BulkCreateStudents() {
  const router = useRouter();
  const [students, setStudents] = useState(
    Array.from({ length: 20 }, () => ({
      fullName: '',
      phone: '',
      gender: '',
      grade: ''
    }))
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (index, field, value) => {
    const newStudents = [...students];
    newStudents[index][field] = value;
    setStudents(newStudents);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Filter out empty rows (no fullName)
    const validStudents = students.filter(s => s.fullName.trim() !== '');
    if (validStudents.length === 0) {
      setError('At least one student must have a name.');
      return;
    }

    setLoading(true);

    try {
      // FIXED: Changed 'token' to 'auth_token' to match your tutor code
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found. Please log in as admin.');
      }

      const res = await fetch('/api/admin/create_students', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'same-origin',
        body: JSON.stringify({ students: validStudents })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Bulk creation failed');
      }

      if (data.errors && data.errors.length > 0) {
        setError(`Partial success: ${data.errors.length} errors. Details: ${JSON.stringify(data.errors)}`);
        setSuccessMessage(`Successfully created ${data.successes.length} students.`);
      } else {
        setSuccessMessage(`Successfully created ${data.successes.length} students.`);
        // Reset form on full success
        setTimeout(() => {
          router.push('/admin/students?created=true');
        }, 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Bulk Create Students</h1>
            <Link href="/admin/students" className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
              Back to Students
            </Link>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {successMessage}
            </div>
          )}

          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Full Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Phone</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Gender</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student, index) => (
                    <tr key={index} className={student.fullName.trim() === '' ? 'bg-gray-50 opacity-50' : ''}>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          placeholder="Full Name"
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={student.fullName}
                          onChange={(e) => handleInputChange(index, 'fullName', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="tel"
                          placeholder="Phone (10 digits)"
                          maxLength={10}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={student.phone}
                          onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={student.gender}
                          onChange={(e) => handleInputChange(index, 'gender', e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={student.grade}
                          onChange={(e) => handleInputChange(index, 'grade', e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="6">Grade 6</option>
                          <option value="7">Grade 7</option>
                          <option value="8">Grade 8</option>
                          <option value="9">Grade 9</option>
                          <option value="10">Grade 10</option>
                          <option value="11">Grade 11</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                type="button"
                onClick={() => router.push('/admin/students')}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Creating...' : 'Create Students'}
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            Defaults applied: Email = {`{name}@gmail.com`}, Password = Full Name, Date of Birth = null, Address = "not given", Parent Name = "not given"
          </p>
        </div>
      </div>
    </div>
  );
}