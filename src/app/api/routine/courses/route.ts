import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/db";
import { CoursesListQuerySchema } from "@/lib/routine-intake/schemas";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { courseId } = CoursesListQuerySchema.parse({
    courseId: searchParams.get("courseId") ?? undefined,
  });

  const sql = courseId
    ? `SELECT course_id, course_code, course_name FROM courses WHERE course_id = ?`
    : `SELECT course_id, course_code, course_name FROM courses ORDER BY course_code ASC`;
  const params = courseId ? [courseId] : [];

  const courses = await query(sql, params);
  return NextResponse.json({ courses }, { status: 200 });
}
