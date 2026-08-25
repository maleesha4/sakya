// src/app/api/auth/logout/route.js
import { NextResponse } from 'next/server';

export async function POST() {
  // Server-side: No cookie to clear, just return success
  return NextResponse.json({ message: 'Logged out successfully' });
}