/**
 * src/app/api/allocations/staff-pool/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Staff Pool Endpoint: returns all instructors, student tutors, and assistants.
 * (Module 2 — Faria Fairooz Zahan)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { getStaffPool } from '@/lib/allocationEngine';

export async function GET() {
  try {
    const staffPool = await getStaffPool();
    return NextResponse.json({ success: true, staffPool }, { status: 200 });
  } catch (error) {
    console.error('[API_STAFF_POOL_GET] Error fetching staff pool:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff pool', details: (error as Error).message },
      { status: 500 }
    );
  }
}
