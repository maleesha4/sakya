// ============================================
// FILE: src/app/admin/results/page.js (UPDATED)
// ============================================
import { Suspense } from 'react';
import ResultsClient from './ResultsClient';

export default function AdminResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    }>
      <ResultsClient />
    </Suspense>
  );
}