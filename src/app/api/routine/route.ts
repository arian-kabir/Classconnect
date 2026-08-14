import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// Strict TypeScript Interfaces
interface RoutinePayload {
  sectionId: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
    }

    // Parallelize DB queries for maximum performance
    const [coursesPromise, sectionsPromise, userRoutinePromise] = await Promise.all([
      db.execute('SELECT id, course_code, course_name FROM courses'),
      db.execute('SELECT id, course_id, section_number, time_slot FROM sections'),
      db.execute(`
        SELECT r.id, s.section_number, s.time_slot, c.course_code 
        FROM user_routines r
        JOIN sections s ON r.section_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE r.user_id = ?
      `, [session.user.id])
    ]);

    return NextResponse.json({
      courses: coursesPromise[0],
      sections: sectionsPromise[0],
      routine: userRoutinePromise[0]
    }, { status: 200 });

  } catch (error: any) {
    console.error('Routine API GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
    }

    const body: RoutinePayload = await req.json();
    if (!body.sectionId) {
      return NextResponse.json({ error: 'Invalid Payload: sectionId required' }, { status: 400 });
    }

    // Idempotency check: Prevent duplicate entries
    const [existing] = await db.execute(
      'SELECT id FROM user_routines WHERE user_id = ? AND section_id = ?',
      [session.user.id, body.sectionId]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'Section already exists in your routine' }, { status: 409 });
    }

    await db.execute(
      'INSERT INTO user_routines (user_id, section_id) VALUES (?, ?)',
      [session.user.id, body.sectionId]
    );

    return NextResponse.json({ success: true, message: 'Routine updated successfully' }, { status: 201 });

  } catch (error: any) {
    console.error('Routine API POST Error:', error.message);
    return NextResponse.json({ error: 'Database Transaction Failed' }, { status: 500 });
  }
}