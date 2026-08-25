// ============================================
// FILE: src/app/admin/students/page.jsx (FIXED WITH SUSPENSE)
// ============================================
import { Suspense } from 'react';
import ManageStudentsClient from './ManageStudentsClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 flex justify-center items-center h-64"><p className="text-lg">Loading students...</p></div>}>
      <ManageStudentsClient />
    </Suspense>
  );
}