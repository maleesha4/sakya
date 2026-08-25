// ============================================
// FILE: src/app/admin/tutors/page.jsx (FIXED WITH SUSPENSE)
// ============================================
import { Suspense } from 'react';
import ManageTutorsClient from './ManageTutorsClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 flex justify-center items-center h-64"><p className="text-lg">Loading tutors...</p></div>}>
      <ManageTutorsClient />
    </Suspense>
  );
}