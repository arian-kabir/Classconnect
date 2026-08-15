import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/db";
import { SectionsListQuerySchema } from "@/lib/routine-intake/schemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { courseId } = SectionsListQuerySchema.parse({
    courseId: searchParams.get("courseId") ?? undefined,
  });

  const sql = courseId
    ? `SELECT s.section_id, s.course_id, s.section_no, c.course_code FROM sections s JOIN courses c ON c.course_id = s.course_id WHERE s.course_id = ? ORDER BY s.section_no ASC`
    : `SELECT s.section_id, s.course_id, s.section_no, c.course_code FROM sections s JOIN courses c ON c.course_id = s.course_id ORDER BY c.course_code ASC, s.section_no ASC`;
  const params = courseId ? [courseId] : [];

  const sections = await query(sql, params);
  return NextResponse.json({ sections }, { status: 200 });
}
