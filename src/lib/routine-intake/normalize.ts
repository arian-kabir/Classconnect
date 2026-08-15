import { ParsedRow, computeSourceRowHash } from "./parser";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

export interface NormalizedEntities {
  courses: { code: string }[];
  sections: { courseCode: string; sectionNo: string }[];
  instructors: { initials: string }[];
  slots: {
    section: { courseCode: string; sectionNo: string };
    instructorInitials: string;
    day: number;
    startTime: string;
    endTime: string;
    roomNumber: string;
    sourceRowHash: string;
  }[];
}

export function normalize(rows: ParsedRow[]): NormalizedEntities {
  const courses: { code: string }[] = [];
  const sections: { courseCode: string; sectionNo: string }[] = [];
  const instructors: { initials: string }[] = [];
  const slots: NormalizedEntities["slots"] = [];

  const seenCourses = new Set<string>();
  const seenSections = new Set<string>();
  const seenInstructors = new Set<string>();

  for (const row of rows) {
    if (!seenCourses.has(row.courseCode)) {
      seenCourses.add(row.courseCode);
      courses.push({ code: row.courseCode });
    }

    const sectionKey = `${row.courseCode}|${row.sectionNo}`;
    if (!seenSections.has(sectionKey)) {
      seenSections.add(sectionKey);
      sections.push({ courseCode: row.courseCode, sectionNo: row.sectionNo });
    }

    if (!seenInstructors.has(row.teacherInitials)) {
      seenInstructors.add(row.teacherInitials);
      instructors.push({ initials: row.teacherInitials });
    }

    slots.push({
      section: { courseCode: row.courseCode, sectionNo: row.sectionNo },
      instructorInitials: row.teacherInitials,
      day: row.day,
      startTime: row.startTime,
      endTime: row.endTime,
      roomNumber: row.roomNumber,
      sourceRowHash: computeSourceRowHash(row),
    });
  }

  return { courses, sections, instructors, slots };
}

export async function upsertCourses(
  conn: PoolConnection,
  courses: { code: string }[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const c of courses) {
    await conn.execute(
      `INSERT INTO courses (course_code) VALUES (?) ON DUPLICATE KEY UPDATE course_code = VALUES(course_code)`,
      [c.code]
    );
    const [rows] = await conn.execute<RowDataPacket[]>(`SELECT course_id FROM courses WHERE course_code = ?`, [c.code]);
    const fetched = rows as { course_id: number }[];
    if (fetched.length > 0) {
      map.set(c.code, fetched[0].course_id);
    }
  }
  return map;
}

export async function upsertInstructors(
  conn: PoolConnection,
  instructors: { initials: string }[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const inst of instructors) {
    await conn.execute(
      `INSERT INTO instructors (initials) VALUES (?) ON DUPLICATE KEY UPDATE initials = VALUES(initials)`,
      [inst.initials]
    );
    const [rows] = await conn.execute<RowDataPacket[]>(`SELECT id FROM instructors WHERE initials = ?`, [inst.initials]);
    const fetched = rows as { id: number }[];
    if (fetched.length > 0) {
      map.set(inst.initials, fetched[0].id);
    }
  }
  return map;
}

export async function upsertSections(
  conn: PoolConnection,
  sections: { courseCode: string; sectionNo: string }[],
  courseMap: Map<string, number>
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const s of sections) {
    const courseId = courseMap.get(s.courseCode);
    if (!courseId) continue;
    await conn.execute(
      `INSERT INTO sections (course_id, section_no) VALUES (?, ?) ON DUPLICATE KEY UPDATE section_no = VALUES(section_no)`,
      [courseId, s.sectionNo]
    );
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT section_id FROM sections WHERE course_id = ? AND section_no = ?`,
      [courseId, s.sectionNo]
    );
    const fetched = rows as { section_id: number }[];
    if (fetched.length > 0) {
      const key = `${s.courseCode}|${s.sectionNo}`;
      map.set(key, fetched[0].section_id);
    }
  }
  return map;
}

export async function upsertSlots(
  conn: PoolConnection,
  slots: NormalizedEntities["slots"],
  sectionMap: Map<string, number>,
  instructorMap: Map<string, number>
) {
  let count = 0;
  for (const slot of slots) {
    const sectionId = sectionMap.get(`${slot.section.courseCode}|${slot.section.sectionNo}`);
    const instructorId = instructorMap.get(slot.instructorInitials);
    if (!sectionId) continue;

    await conn.execute(
      `INSERT INTO routine_slots (section_id, instructor_id, day, start_time, end_time, room_number, source_row_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         instructor_id = VALUES(instructor_id),
         room_number = VALUES(room_number),
         end_time = VALUES(end_time)`,
      [sectionId, instructorId ?? null, slot.day, slot.startTime, slot.endTime, slot.roomNumber, slot.sourceRowHash]
    );
    count++;
  }
  return count;
}
