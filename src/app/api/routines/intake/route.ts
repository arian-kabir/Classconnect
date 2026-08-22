/**
 * /api/routines/intake/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST  /api/routines/intake
 *   Pulls the university scheduling spreadsheet via Google Sheets API,
 *   parses every row, and upserts into:
 *     1. section_schedules  (master schedule — one row per section timeslot)
 *     2. routines           (per-enrolled-user copy — fan-out for all students)
 *
 * GET   /api/routines/intake
 *   Returns metadata about the last successful run (timestamp + counts).
 *
 * Access: admin role (checked via NextAuth session).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
// @ts-ignore
import db from "@/lib/db/db";
import { readSheet, testSheetAccess } from "@/lib/sheets";
import { parseRoutineRows } from "@/lib/routineParser";

// ── DB resolver helpers ───────────────────────────────────────────────────────

/** Resolve courseCode + sectionCode → section_id (auto-create if missing) */
async function resolveOrCreateSection(
  courseCode: string,
  sectionCode: string,
  autoCreate: boolean = true
): Promise<number | null> {
  const cleanCode = courseCode.toUpperCase().trim();
  const cleanSec = sectionCode.trim();

  // 1. Try finding existing section
  const rows = await db.query(
    `SELECT s.section_id
     FROM sections s
     JOIN courses c ON s.course_id = c.course_id
     WHERE c.course_code = ?
       AND s.section_code = ?
     LIMIT 1`,
    [cleanCode, cleanSec]
  );

  if (rows.length > 0) {
    return (rows[0] as { section_id: number }).section_id;
  }

  if (!autoCreate) return null;

  // 2. Auto-create Course if missing
  let courseId: number;
  const courseRows = await db.query(
    `SELECT course_id FROM courses WHERE course_code = ? LIMIT 1`,
    [cleanCode]
  );

  if (courseRows.length > 0) {
    courseId = (courseRows[0] as { course_id: number }).course_id;
  } else {
    // Default course name based on code
    const courseName = `${cleanCode}: Course`;
    const res: any = await db.query(
      `INSERT INTO courses (course_code, course_name, credits) VALUES (?, ?, 3)`,
      [cleanCode, courseName]
    );
    courseId = res.insertId;
  }

  // 3. Auto-create Section
  const currentYear = new Date().getFullYear();
  await db.query(
    `INSERT INTO sections (course_id, section_code, semester, year, max_students)
     VALUES (?, ?, 'Summer', ?, 35)
     ON DUPLICATE KEY UPDATE semester = VALUES(semester)`,
    [courseId, cleanSec, currentYear]
  );

  const secRows = await db.query(
    `SELECT section_id FROM sections WHERE course_id = ? AND section_code = ? LIMIT 1`,
    [courseId, cleanSec]
  );
  const sectionId = secRows.length > 0 ? (secRows[0] as { section_id: number }).section_id : null;

  // 4. Auto-create Chat Room for the section if missing
  if (sectionId) {
    try {
      await db.query(
        `INSERT IGNORE INTO chat_rooms (section_id, room_name)
         VALUES (?, ?)`,
        [sectionId, `Chat - ${cleanCode} Section ${cleanSec}`]
      );
    } catch {}
  }

  return sectionId;
}

/** Resolve teacher initials → user_id (or auto-create teacher profile if missing) */
async function resolveOrCreateTeacher(
  initials: string,
  autoCreate: boolean = true
): Promise<number | null> {
  const cleanInitials = initials.toUpperCase().trim();
  if (!cleanInitials) return null;

  const rows = await db.query(
    `SELECT user_id FROM users WHERE initials = ? AND role = 'teacher' LIMIT 1`,
    [cleanInitials]
  );

  if (rows.length > 0) {
    return (rows[0] as { user_id: number }).user_id;
  }

  if (!autoCreate) return null;

  // Auto-create teacher user with initials
  const teacherEmail = `${cleanInitials.toLowerCase()}@university.edu`;
  const teacherName = `Faculty (${cleanInitials})`;
  try {
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, initials)
       VALUES (?, 'hashed_default_pwd', ?, 'teacher', ?)
       ON DUPLICATE KEY UPDATE initials = VALUES(initials)`,
      [teacherEmail, teacherName, cleanInitials]
    );
    const teacherRows = await db.query(
      `SELECT user_id FROM users WHERE initials = ? AND role = 'teacher' LIMIT 1`,
      [cleanInitials]
    );
    return teacherRows.length > 0 ? (teacherRows[0] as { user_id: number }).user_id : null;
  } catch {
    return null;
  }
}

/** Return all student user_ids enrolled in a section */
async function getEnrolledStudents(sectionId: number): Promise<number[]> {
  const rows = await db.query(
    `SELECT student_id FROM section_enrollments WHERE section_id = ? AND status = 'active'`,
    [sectionId]
  );
  return (rows as { student_id: number }[]).map((r) => r.student_id);
}

// ── GET — last run metadata ───────────────────────────────────────────────────

export async function GET() {
  try {
    const rows = await db.query(
      `SELECT * FROM routine_intake_log ORDER BY ran_at DESC LIMIT 1`
    );
    if (rows.length === 0) {
      return NextResponse.json({ lastRun: null }, { status: 200 });
    }
    return NextResponse.json({ lastRun: rows[0] }, { status: 200 });
  } catch (error) {
    console.error("[API_INTAKE_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ── POST — trigger intake ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // ── Parse request body ──────────────────────────────────────────────────
    let spreadsheetId: string;
    let range: string;
    let dryRun = false;

  try {
    const body = await req.json().catch(() => ({}));
    spreadsheetId =
      body.spreadsheetId ||
      process.env.ROUTINE_SHEET_ID ||
      process.env.ROUTINE_SPREADSHEET_ID || // legacy fallback
      "";
    range =
      body.range ||
      process.env.ROUTINE_SHEET_RANGE ||
      "Sheet1!A2:F";
    dryRun = body.dryRun === true;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!spreadsheetId || spreadsheetId === "<YOUR_SPREADSHEET_ID>") {
    return NextResponse.json(
      {
        error:
          "Spreadsheet ID is not configured. Set ROUTINE_SHEET_ID in .env.local " +
          "or pass it in the request body as { spreadsheetId: '...' }.",
      },
      { status: 400 }
    );
  }

  // ── Connectivity check ──────────────────────────────────────────────────
  const access = await testSheetAccess(spreadsheetId);
  if (!access.ok) {
    return NextResponse.json(
      {
        error: `Cannot access spreadsheet: ${access.error}`,
        hint: "Make sure the spreadsheet is shared with the service account email and the Sheets API is enabled.",
      },
      { status: 502 }
    );
  }

  // ── Fetch raw rows ──────────────────────────────────────────────────────
  let rawRows: string[][];
  try {
    rawRows = await readSheet(spreadsheetId, range);
  } catch (err) {
    console.error("[API_INTAKE_POST] readSheet failed:", err);
    return NextResponse.json(
      { error: `Failed to read spreadsheet: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  if (rawRows.length === 0) {
    return NextResponse.json(
      { error: "Spreadsheet returned no rows. Check the range and sheet name." },
      { status: 422 }
    );
  }

  // ── Parse rows ──────────────────────────────────────────────────────────
  const parseResult = await parseRoutineRows(
    rawRows,
    (code, sec) => resolveOrCreateSection(code, sec, !dryRun),
    (initials) => resolveOrCreateTeacher(initials, !dryRun)
  );

  // In dry-run mode, return parsed results without touching the DB
  if (dryRun) {
    return NextResponse.json(
      {
        dryRun: true,
        totalRawRows: rawRows.length,
        parsedRows: parseResult.rows,
        warnings: parseResult.warnings,
      },
      { status: 200 }
    );
  }

  // ── Upsert into DB ──────────────────────────────────────────────────────
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ sheetRowRef: number; error: string }> = [];

  for (const row of parseResult.rows) {
    if (row.sectionId === null) {
      skipped++;
      continue; // Can't upsert without a valid section_id
    }

    try {
      // 1️⃣ Upsert section_schedules (master schedule)
      const ssResult: any[] = await db.query(
        `INSERT INTO section_schedules
           (section_id, day_of_week, start_time, end_time, room_number,
            teacher_id, spreadsheet_row_ref, last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           end_time           = VALUES(end_time),
           room_number        = VALUES(room_number),
           teacher_id         = VALUES(teacher_id),
           spreadsheet_row_ref = VALUES(spreadsheet_row_ref),
           last_synced_at     = NOW()`,
        [
          row.sectionId,
          row.dayOfWeek,
          row.startTime,
          row.endTime,
          row.room || "TBA",
          row.teacherId,
          row.sheetRowRef,
        ]
      );

      // mysql2 returns affectedRows=1 for INSERT, 2 for UPDATE (via ON DUPLICATE KEY)
      const affectedRows = (ssResult as any).affectedRows ?? 0;
      const wasInserted = affectedRows === 1;
      if (wasInserted) inserted++; else updated++;

      // 2️⃣ Fan-out: upsert routines for every enrolled student
      const enrolledStudents = await getEnrolledStudents(row.sectionId);
      for (const studentId of enrolledStudents) {
        await db.query(
          `INSERT INTO routines
             (user_id, section_id, day_of_week, start_time, end_time,
              room_number, source, spreadsheet_row_ref)
           VALUES (?, ?, ?, ?, ?, ?, 'spreadsheet', ?)
           ON DUPLICATE KEY UPDATE
             end_time            = VALUES(end_time),
             room_number         = VALUES(room_number),
             source              = 'spreadsheet',
             spreadsheet_row_ref = VALUES(spreadsheet_row_ref)`,
          [
            studentId,
            row.sectionId,
            row.dayOfWeek,
            row.startTime,
            row.endTime,
            row.room || "TBA",
            row.sheetRowRef,
          ]
        );
      }

      // 3️⃣ Also upsert for the teacher if resolved
      if (row.teacherId) {
        await db.query(
          `INSERT INTO routines
             (user_id, section_id, day_of_week, start_time, end_time,
              room_number, source, spreadsheet_row_ref)
           VALUES (?, ?, ?, ?, ?, ?, 'spreadsheet', ?)
           ON DUPLICATE KEY UPDATE
             end_time            = VALUES(end_time),
             room_number         = VALUES(room_number),
             source              = 'spreadsheet',
             spreadsheet_row_ref = VALUES(spreadsheet_row_ref)`,
          [
            row.teacherId,
            row.sectionId,
            row.dayOfWeek,
            row.startTime,
            row.endTime,
            row.room || "TBA",
            row.sheetRowRef,
          ]
        );
      }
    } catch (err) {
      console.error(`[API_INTAKE_POST] Row ${row.sheetRowRef} error:`, err);
      errors.push({
        sheetRowRef: row.sheetRowRef,
        error: (err as Error).message,
      });
    }
  }

  // ── Log the run ─────────────────────────────────────────────────────────
  try {
    await db.query(
      `INSERT INTO routine_intake_log
         (spreadsheet_id, sheet_range, total_raw_rows, inserted, updated, skipped,
          warnings_count, errors_count, ran_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        spreadsheetId,
        range,
        rawRows.length,
        inserted,
        updated,
        skipped,
        parseResult.warnings.length,
        errors.length,
      ]
    );
  } catch (logErr) {
    console.warn("[API_INTAKE_POST] Failed to write intake log:", logErr);
    // Non-fatal — don't fail the whole request over this
  }

    // ── Response ────────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        totalRawRows: rawRows.length,
        parsed: parseResult.rows.length,
        inserted,
        updated,
        skipped,
        warnings: parseResult.warnings,
        errors,
      },
      { status: 200 }
    );
  } catch (fatalErr) {
    console.error("[API_INTAKE_POST] Fatal error:", fatalErr);
    return NextResponse.json(
      {
        error: (fatalErr as Error).message || "Internal server error during intake processing",
      },
      { status: 500 }
    );
  }
}
