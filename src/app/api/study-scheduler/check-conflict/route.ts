// src/app/api/study-scheduler/check-conflict/route.ts
import { NextResponse } from 'next/server';
import { checkTimetableConflict } from '@/lib/studySchedulerEngine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId = 1,
      day_of_week,
      start_time,
      end_time,
      excludeSessionId,
    } = body;

    if (!day_of_week || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'day_of_week, start_time, and end_time are required' },
        { status: 400 }
      );
    }

    const conflictResult = await checkTimetableConflict(
      userId,
      day_of_week,
      start_time,
      end_time,
      excludeSessionId
    );

    return NextResponse.json(conflictResult, { status: 200 });
  } catch (error: any) {
    console.error('[API_CHECK_CONFLICT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate conflict', details: error.message },
      { status: 500 }
    );
  }
}
