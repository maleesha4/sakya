// ============================================
// FILE: src/app/admin/subjects/create/page.jsx (FIXED WITH SUSPENSE)
// ============================================
import { Suspense } from 'react';
import CreateSubjectClient from './CreateSubjectClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full"><p className="text-lg">Loading...</p></div></div>}>
      <CreateSubjectClient />
    </Suspense>
  );
}