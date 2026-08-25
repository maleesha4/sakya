// ============================================
// FILE: src/app/admin/dashboard/page.js
// ============================================
import { Suspense } from 'react';
import AdminDashboardClient from './AdminDashboardClient';

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboardClient />
    </Suspense>
  );
}