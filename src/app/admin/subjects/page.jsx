// ============================================
// FILE: src/app/admin/subjects/page.jsx (FIXED WITH SUSPENSE)
// ============================================
import { Suspense } from 'react';
import ManageSubjectsClient from './ManageSubjectsClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 flex justify-center items-center h-64"><p className="text-lg">Loading subjects...</p></div>}>
      <ManageSubjectsClient />
    </Suspense>
  );
}