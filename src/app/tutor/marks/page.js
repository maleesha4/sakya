// ============================================
// FILE: app/tutor/marks/page.js
// ============================================
import { Suspense } from 'react';
import MarksClient from './MarksClient';

export default function Page({ searchParams }) {
  return (
    <Suspense fallback={<MarksLoading />}>
      <MarksClient searchParams={searchParams} />
    </Suspense>
  );
}

// Simple fallback component (shows during hydration)
function MarksLoading() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Loading marks...</p>
      </div>
    </div>
  );
}