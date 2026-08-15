import crypto from "node:crypto";

export interface ParsedRow {
  courseCode: string;
  sectionNo: string;
  roomNumber: string;
  day: number;
  startTime: string;
  endTime: string;
  teacherInitials: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  failed: { row: string[]; reason: string }[];
}

function hashRow(row: ParsedRow): string {
  const payload = `${row.courseCode}|${row.sectionNo}|${row.roomNumber}|${row.day}|${row.startTime}|${row.endTime}|${row.teacherInitials}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function computeSourceRowHash(row: ParsedRow): string {
  return hashRow(row);
}

const DAY_MAP: Record<string, number> = {
  sun: 1,
  mon: 2,
  tue: 3,
  wed: 4,
  thu: 5,
  fri: 6,
  sat: 7,
};

function parseDay(raw: string): number | null {
  const v = raw.trim().toLowerCase();
  if (DAY_MAP[v] !== undefined) return DAY_MAP[v];
  const n = Number(v);
  if (Number.isInteger(n) && n >= 1 && n <= 7) return n;
  return null;
}

function parseTime(raw: string): string | null {
  const t = raw.trim();
  if (!/^\d{2}:\d{2}$/.test(t)) return null;
  return t;
}

const HEADER_CANDIDATES = new Set(["course", "sec", "section", "room", "day", "time", "teacher", "initials"]);

function looksLikeHeader(row: string[]): boolean {
  if (row.length === 0) return false;
  const first = row[0]?.trim().toLowerCase() ?? "";
  return HEADER_CANDIDATES.has(first);
}

function splitTimeslot(raw: string): { start: string; end: string } | null {
  const parts = raw.split("-").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const [start, end] = parts.map(parseTime);
  if (!start || !end) return null;
  if (start >= end) return null;
  return { start, end };
}

export function parseRawRows(rows: string[][]): ParseResult {
  const out: ParsedRow[] = [];
  const failed: { row: string[]; reason: string }[] = [];

  const dataRows = looksLikeHeader(rows[0] ?? []) ? rows.slice(1) : rows;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] ?? [];
    const idx = i + (looksLikeHeader(rows[0] ?? []) ? 2 : 1);

    if (row.length < 6) {
      failed.push({ row, reason: `insufficient columns at row ${idx}` });
      continue;
    }

    const [rawCourse, rawSection, rawRoom, rawDay, rawTime, rawTeacher] = row;

    const course = rawCourse.trim();
    const section = rawSection.trim();
    const room = rawRoom.trim();
    const day = parseDay(rawDay);
    const timeslot = splitTimeslot(rawTime);
    const teacher = rawTeacher.trim().toUpperCase();

    if (!course || !section || !room || !day || !timeslot || !teacher) {
      failed.push({ row, reason: `missing/invalid values at row ${idx}` });
      continue;
    }

    out.push({
      courseCode: course,
      sectionNo: section,
      roomNumber: room,
      day,
      startTime: timeslot.start,
      endTime: timeslot.end,
      teacherInitials: teacher,
    });
  }

  return { rows: out, failed };
}
