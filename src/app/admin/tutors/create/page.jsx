// ============================================
// FILE: src/app/admin/tutors/create/page.jsx (FIXED WITH SUSPENSE)
// ============================================
import { Suspense } from 'react';
import CreateTutorClient from './CreateTutorClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full"><p className="text-lg">Loading...</p></div></div>}>
      <CreateTutorClient />
    </Suspense>
  );
}