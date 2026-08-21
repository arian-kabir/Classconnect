// src/app/api/reminders/route.ts
import { NextResponse } from 'next/server';
import { getUpcomingDeadlineReminders, dismissReminder } from '@/lib/studySchedulerEngine';
// @ts-ignore
import db from '@/lib/db/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? parseInt(userIdParam, 10) : 1;

    const reminders = await getUpcomingDeadlineReminders(userId);
    return NextResponse.json(reminders, { status: 200 });
  } catch (error: any) {
    console.error('[API_REMINDERS_GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deadline reminders', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId = 1, reminderId, entity_type, entity_id, title, message, due_at, alert_offset_hours } = body;

    if (action === 'dismiss') {
      if (!reminderId) {
        return NextResponse.json({ error: 'Reminder ID is required for dismissal' }, { status: 400 });
      }
      const res = await dismissReminder(userId, reminderId);
      return NextResponse.json(res, { status: 200 });
    }

    // Create custom reminder
    if (!title || !due_at) {
      return NextResponse.json({ error: 'Title and due_at are required' }, { status: 400 });
    }

    const insertRes: any = await db.query(`
      INSERT INTO reminders (user_id, entity_type, entity_id, title, message, due_at, alert_offset_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      entity_type || 'custom',
      entity_id || null,
      title,
      message || null,
      due_at,
      alert_offset_hours || 24,
    ]);

    return NextResponse.json(
      { success: true, reminderId: insertRes.insertId, message: 'Reminder set successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API_REMINDERS_POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process reminder action', details: error.message },
      { status: 500 }
    );
  }
}
