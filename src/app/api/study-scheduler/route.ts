// src/app/api/study-scheduler/route.ts
import { NextResponse } from 'next/server';
import {
  getUnifiedTimetable,
  createStudySession,
  updateStudySession,
  deleteStudySession,
} from '@/lib/studySchedulerEngine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? parseInt(userIdParam, 10) : 1;

    const data = await getUnifiedTimetable(userId);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[API_STUDY_SCHEDULER_GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contextual study schedule', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId = 1,
      course_id,
      title,
      description,
      day_of_week,
      start_time,
      end_time,
      priority,
      color_tag,
      allow_conflict,
    } = body;

    if (!title || !day_of_week || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Title, day of the week, start time, and end time are required.' },
        { status: 400 }
      );
    }

    const result = await createStudySession(userId, {
      course_id: course_id ? parseInt(course_id, 10) : null,
      title,
      description,
      day_of_week,
      start_time,
      end_time,
      priority,
      color_tag,
      allow_conflict,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 409 }); // 409 Conflict
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('[API_STUDY_SCHEDULER_POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create study session', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { userId = 1, sessionId, ...updateData } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const result = await updateStudySession(userId, sessionId, updateData);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API_STUDY_SCHEDULER_PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update study session', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const sessionIdParam = searchParams.get('sessionId');

    const userId = userIdParam ? parseInt(userIdParam, 10) : 1;
    const sessionId = sessionIdParam ? parseInt(sessionIdParam, 10) : null;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const result = await deleteStudySession(userId, sessionId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API_STUDY_SCHEDULER_DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete study session', details: error.message },
      { status: 500 }
    );
  }
}
