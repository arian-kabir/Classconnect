/**
 * routineParser.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Parses raw string[][] rows from the university scheduling spreadsheet and
 * resolves them into structured DB-ready objects.
 *
 * Spreadsheet layout (from observed screenshot):
 *   Col A: Course code  (e.g. CSE471)
 *   Col B: Section no.  (e.g. 1, 14)
 *   Col C: Room         (e.g. 10A22C)
 *   Col D: Day          (e.g. Mon, Sun, Wed)
 *   Col E: Time range   (e.g. 09:00-10:30)
 *   Col F: Teacher init (e.g. AQU, MSMA)
 *
 * The column indices are configurable via ROUTINE_SHEET_COLUMN_MAP env var
 * so the admin can adapt to any spreadsheet without code changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ColumnMap {
  courseCode: number;
  sectionCode: number;
  room: number;
  day: number;
  timeRange: number;
  teacherInitials: number;
}

/** A fully resolved row ready for DB insertion */
export interface ParsedRoutineRow {
  /** Original 1-based row index in the spreadsheet (for traceability) */
  sheetRowRef: number;
  courseCode: string;
  sectionCode: string;
  sectionId: number | null;
  teacherInitials: string;
  teacherId: number | null;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:MM:SS"
  endTime: string;   // "HH:MM:SS"
  room: string;
}

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface ParseWarning {
  sheetRowRef: number;
  rawRow: string[];
  reason: string;
}

export interface ParseResult {
  rows: ParsedRoutineRow[];
  warnings: ParseWarning[];
}

// ── Day name normalisation ────────────────────────────────────────────────────

const DAY_ALIASES: Record<string, DayOfWeek> = {
  mon: "Monday",
  monday: "Monday",
  tue: "Tuesday",
  tues: "Tuesday",
  tuesday: "Tuesday",
  wed: "Wednesday",
  wednesday: "Wednesday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  thursday: "Thursday",
  fri: "Friday",
  friday: "Friday",
  sat: "Saturday",
  saturday: "Saturday",
  sun: "Sunday",
  sunday: "Sunday",
};

function normaliseDay(raw: string): DayOfWeek | null {
  return DAY_ALIASES[raw.toLowerCase().trim()] ?? null;
}

// ── Time parsing ──────────────────────────────────────────────────────────────

/**
 * Converts a time string to MySQL TIME format "HH:MM:SS".
 * Handles:
 *   "09:00"         → "09:00:00"
 *   "9:00 AM"       → "09:00:00"
 *   "1:30 PM"       → "13:30:00"
 *   "10:30"         → "10:30:00"
 */
function parseTime(raw: string): string | null {
  const clean = raw.trim().toUpperCase();

  // Match "H:MM" or "HH:MM" optionally followed by " AM"/" PM"
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3];

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

/**
 * Splits "09:00-10:30" or "09:00 - 10:30" into { start, end }.
 * Returns null if the format is unrecognisable.
 */
function parseTimeRange(raw: string): { start: string; end: string } | null {
  // Support dash, en-dash, em-dash
  const parts = raw.split(/[-–—]/);
  if (parts.length !== 2) return null;

  const start = parseTime(parts[0].trim());
  const end = parseTime(parts[1].trim());

  if (!start || !end) return null;
  return { start, end };
}

// ── Column map loader ─────────────────────────────────────────────────────────

const DEFAULT_COLUMN_MAP: ColumnMap = {
  courseCode: 0,
  sectionCode: 1,
  room: 2,
  day: 3,
  timeRange: 4,
  teacherInitials: 5,
};

export function loadColumnMap(): ColumnMap {
  const raw = process.env.ROUTINE_SHEET_COLUMN_MAP;
  if (!raw) return DEFAULT_COLUMN_MAP;
  try {
    return { ...DEFAULT_COLUMN_MAP, ...JSON.parse(raw) };
  } catch {
    console.warn(
      "[routineParser] Failed to parse ROUTINE_SHEET_COLUMN_MAP — using defaults."
    );
    return DEFAULT_COLUMN_MAP;
  }
}

// ── Main parser ───────────────────────────────────────────────────────────────

/**
 * Parses raw spreadsheet rows into structured ParsedRoutineRow objects.
 * DB resolution (section_id, teacher_id) is done by the caller via the
 * resolve* callbacks — this keeps the parser pure and independently testable.
 *
 * @param rows - Raw string[][] from readSheet()
 * @param resolveSectionId - async fn that returns section_id or null
 * @param resolveTeacherId - async fn that returns teacher user_id or null
 * @param colMap - column index map (defaults to env var / hardcoded fallback)
 */
export async function parseRoutineRows(
  rows: string[][],
  resolveSectionId: (
    courseCode: string,
    sectionCode: string
  ) => Promise<number | null>,
  resolveTeacherId: (initials: string) => Promise<number | null>,
  colMap: ColumnMap = loadColumnMap()
): Promise<ParseResult> {
  const result: ParseResult = { rows: [], warnings: [] };

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    // sheetRowRef is 1-based; +2 because row 1 is the header, data starts row 2
    const sheetRowRef = i + 2;

    const courseCode = (raw[colMap.courseCode] ?? "").trim();
    const sectionCode = String(raw[colMap.sectionCode] ?? "").trim();
    const room = (raw[colMap.room] ?? "").trim();
    const dayRaw = (raw[colMap.day] ?? "").trim();
    const timeRangeRaw = (raw[colMap.timeRange] ?? "").trim();
    const teacherInitials = (raw[colMap.teacherInitials] ?? "").trim();

    // Skip truly empty rows
    if (!courseCode && !sectionCode && !dayRaw) continue;

    // ── Validate required fields ──────────────────────────────────────────
    if (!courseCode) {
      result.warnings.push({
        sheetRowRef,
        rawRow: raw,
        reason: "Missing course code",
      });
      continue;
    }
    if (!sectionCode) {
      result.warnings.push({
        sheetRowRef,
        rawRow: raw,
        reason: `Row ${sheetRowRef}: Missing section code`,
      });
      continue;
    }

    const dayOfWeek = normaliseDay(dayRaw);
    if (!dayOfWeek) {
      result.warnings.push({
        sheetRowRef,
        rawRow: raw,
        reason: `Unrecognised day "${dayRaw}"`,
      });
      continue;
    }

    const times = parseTimeRange(timeRangeRaw);
    if (!times) {
      result.warnings.push({
        sheetRowRef,
        rawRow: raw,
        reason: `Could not parse time range "${timeRangeRaw}"`,
      });
      continue;
    }

    // ── DB resolution ─────────────────────────────────────────────────────
    const [sectionId, teacherId] = await Promise.all([
      resolveSectionId(courseCode, sectionCode),
      teacherInitials ? resolveTeacherId(teacherInitials) : Promise.resolve(null),
    ]);

    if (sectionId === null) {
      result.warnings.push({
        sheetRowRef,
        rawRow: raw,
        reason: `No section found for course "${courseCode}" section "${sectionCode}"`,
      });
      // Still include the row — the admin may want to see unmatched entries
    }

    result.rows.push({
      sheetRowRef,
      courseCode,
      sectionCode,
      sectionId,
      teacherInitials,
      teacherId,
      dayOfWeek,
      startTime: times.start,
      endTime: times.end,
      room,
    });
  }

  return result;
}
