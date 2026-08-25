// ============================================
// FILE: src/app/student/dashboard/page.js
// ============================================
import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardClient />
    </Suspense>
  );
}