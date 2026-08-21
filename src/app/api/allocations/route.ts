/**
 * src/app/api/allocations/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-Role Section Staffing & Allocation Ledger API
 * (Module 2 — Faria Fairooz Zahan)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { getStaffingLedger, saveSectionAllocations } from '@/lib/allocationEngine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const semester = searchParams.get('semester') || undefined;
    const course = searchParams.get('course') || undefined;

    const ledger = await getStaffingLedger(semester, course);
    return NextResponse.json({ success: true, ledger }, { status: 200 });
  } catch (error) {
    console.error('[API_ALLOCATIONS_GET] Error fetching staffing ledger:', error);
    return NextResponse.json(
      { error: 'Failed to fetch section staffing ledger', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    
    // Support both batch updates and single section update
    if (Array.isArray(body.allocations)) {
      const results = [];
      for (const item of body.allocations) {
        const res = await saveSectionAllocations(item);
        results.push(res);
      }
      return NextResponse.json({ success: true, count: results.length }, { status: 200 });
    } else if (body.sectionId) {
      const res = await saveSectionAllocations(body);
      return NextResponse.json({ success: true, sectionId: res.sectionId }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'Invalid payload. Expects sectionId or allocations array.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API_ALLOCATIONS_POST] Error updating section allocations:', error);
    return NextResponse.json(
      { error: 'Failed to save section allocations', details: (error as Error).message },
      { status: 500 }
    );
  }
}
