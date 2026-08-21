import { NextResponse } from 'next/server';
// @ts-ignore - Bypassing JS strict mode for database module
import db from '@/lib/db/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? parseInt(userIdParam, 10) : 1;

    // 1. Try fetching user-specific routines
    let rows: any[] = await db.query(`
      SELECT 
        r.routine_id, r.day_of_week, r.start_time, r.end_time, r.room_number,
        c.course_code, c.course_name, 
        s.section_code,
        r.source
      FROM routines r
      JOIN sections s ON r.section_id = s.section_id
      JOIN courses c ON s.course_id = c.course_id
      WHERE r.user_id = ?
      ORDER BY 
        FIELD(r.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        r.start_time
    `, [userId]);

    // 2. If no user-specific routines, return all master section schedules synced from intake
    if (!rows || rows.length === 0) {
      rows = await db.query(`
        SELECT 
          ss.schedule_id AS routine_id, 
          ss.day_of_week, 
          ss.start_time, 
          ss.end_time, 
          ss.room_number,
          c.course_code, 
          c.course_name, 
          s.section_code,
          'spreadsheet' AS source
        FROM section_schedules ss
        JOIN sections s ON ss.section_id = s.section_id
        JOIN courses c ON s.course_id = c.course_id
        ORDER BY 
          FIELD(ss.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
          ss.start_time
      `);
    }

    return NextResponse.json(Array.isArray(rows) ? rows : [], { status: 200 });
  } catch (error) {
    console.error("[API_ROUTINES_GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = 1; // Temporary bypass for isolated local testing
    
    const body = await req.json();
    const { section_id, day_of_week, start_time, end_time, room_number } = body;

    if (!section_id || !day_of_week || !start_time || !end_time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const numericSectionId = parseInt(section_id, 10);
    if (isNaN(numericSectionId)) {
      return NextResponse.json({ error: "Invalid section ID format" }, { status: 400 });
    }

    await db.query(`
      INSERT INTO routines (user_id, section_id, day_of_week, start_time, end_time, room_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, numericSectionId, day_of_week, start_time, end_time, room_number || 'TBA']);

    return NextResponse.json({ success: true, message: "Saved successfully" }, { status: 201 });
  } catch (error) {
    console.error("[API_ROUTINES_POST] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}