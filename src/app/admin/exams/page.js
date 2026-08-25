// ============================================
// FILE: src/app/admin/exams/page.js (FIXED WITH SUSPENSE)
// ============================================
import { Suspense } from 'react';
import AdminExamsClient from './AdminExamsClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 p-8"><p className="text-lg">Loading exams...</p></div>}>
      <AdminExamsClient />
    </Suspense>
  );
}