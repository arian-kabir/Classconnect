import { parseRawRows } from "./parser";
import { normalize, upsertCourses, upsertInstructors, upsertSections, upsertSlots } from "./normalize";
import { getConnection } from "@/lib/db/db";
import type { PoolConnection, OkPacket } from "mysql2/promise";

export interface RunResult {
  runId: number;
  status: "success" | "partial" | "failed";
  rowsRead: number;
  rowsUpserted: number;
  rowsFailed: number;
  failed: { row: string[]; reason: string }[];
  errorDetail?: string;
}

export async function runIntake(rawRows: string[][], sourceSheet: string): Promise<RunResult> {
  const conn: PoolConnection = await getConnection();
  try {
    await conn.query("BEGIN");

    const { rows: parsed, failed } = parseRawRows(rawRows);
    const normalized = normalize(parsed);

    const courseMap = await upsertCourses(conn, normalized.courses);
    const instructorMap = await upsertInstructors(conn, normalized.instructors);
    const sectionMap = await upsertSections(conn, normalized.sections, courseMap);
    const upsertedCount = await upsertSlots(conn, normalized.slots, sectionMap, instructorMap);

    const status = failed.length > 0 ? "partial" : "success";

    const [runResult] = await conn.query<OkPacket>(
      `INSERT INTO intake_runs (status, source_sheet, rows_read, rows_upserted, rows_failed, error_detail)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [status, sourceSheet, parsed.length + failed.length, upsertedCount, failed.length, null]
    );
    const runId = runResult.insertId;

    await conn.query("COMMIT");

    return {
      runId,
      status,
      rowsRead: parsed.length + failed.length,
      rowsUpserted: upsertedCount,
      rowsFailed: failed.length,
      failed,
    };
  } catch (err) {
    await conn.query("ROLLBACK");
    throw err;
  } finally {
    conn.release();
  }
}
