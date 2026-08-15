import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/db";
import { SlotsListQuerySchema } from "@/lib/routine-intake/schemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { sectionId, day } = SlotsListQuerySchema.parse({
    sectionId: searchParams.get("sectionId") ?? undefined,
    day: searchParams.get("day") ?? undefined,
  });

  const conditions: string[] = [];
  const params: (number | string)[] = [];

  if (sectionId) {
    params.push(sectionId);
    conditions.push(`rs.section_id = ?`);
  }

  if (day) {
    params.push(day);
    conditions.push(`rs.day = ?`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT rs.id, rs.section_id, rs.instructor_id, rs.day, rs.start_time, rs.end_time, rs.room_number, rs.source_row_hash,
           c.course_code, s.section_no, i.initials AS instructor_initials
    FROM routine_slots rs
    JOIN sections s ON s.section_id = rs.section_id
    JOIN courses c ON c.course_id = s.course_id
    LEFT JOIN instructors i ON i.id = rs.instructor_id
    ${where}
    ORDER BY rs.day ASC, rs.start_time ASC
  `;

  const slots = await query(sql, params);
  return NextResponse.json({ slots }, { status: 200 });
}
