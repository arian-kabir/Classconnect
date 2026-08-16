import { NextResponse } from 'next/server';
// @ts-ignore - Bypassing JS strict mode for database module
import db from '@/lib/db/db';

export async function GET() {
  try {
    const result: any = await db.query(`
      SELECT 
        c.course_id, c.course_code, c.course_name,
        s.section_id, s.section_code, s.semester, s.year
      FROM courses c
      JOIN sections s ON c.course_id = s.course_id
      ORDER BY c.course_code, s.section_code
    `);

    // MICROSCOPIC FIX: Defensive array normalization
    // Guarantees that whether db.query returns an array, a nested rows object, or a packet, it safely maps.
    const rows = Array.isArray(result) 
      ? result 
      : (result?.rows || result?.[0] || []);

    if (!Array.isArray(rows)) {
      console.error("[API_COURSES] Unexpected database result structure:", result);
      return NextResponse.json([], { status: 200 });
    }

    // Grouping flat SQL rows into nested Course -> Sections objects
    const coursesMap = new Map();
    
    rows.forEach((row: any) => {
      if (!coursesMap.has(row.course_id)) {
        coursesMap.set(row.course_id, {
          course_id: row.course_id,
          course_code: row.course_code,
          course_name: row.course_name,
          sections: []
        });
      }
      
      coursesMap.get(row.course_id).sections.push({
        section_id: row.section_id,
        section_code: row.section_code,
        semester: row.semester,
        year: row.year
      });
    });

    return NextResponse.json(Array.from(coursesMap.values()), { status: 200 });
  } catch (error) {
    console.error("[API_COURSES] Failed to fetch courses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}