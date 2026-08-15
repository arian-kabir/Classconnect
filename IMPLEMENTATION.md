# Implementation Status — Demo Routine Intake (Module 1.1)

## Overview
Automated pipeline that pulls university routine data from Google Sheets, parses it, and pre-populates the MySQL baseline calendar (`courses`, `sections`, `instructors`, `routine_slots`) with transactional, idempotent writes.

## Environment
- Dev server runs on `http://localhost:3000` by default (Next.js default port)
- MySQL database: `classconnect_db` on `localhost:3306`
- Admin API key: `demo-admin-key-123` (configured in `.env.local`)
- Google Sheets ID and range are pre-configured in `.env.local`

## Database Schema
Migration file: `src/lib/db/migrations/routine-intake.sql`

Tables created:
- `courses` — course_code (UNIQUE), course_name, department_id, credits
- `sections` — course_id FK, section_no, UNIQUE KEY `uq_section (course_id, section_no)`
- `instructors` — initials (UNIQUE), name
- `routine_slots` — section_id FK, instructor_id FK, day (SMALLINT), start_time, end_time, room_number, source_row_hash, UNIQUE KEY `uq_slot (section_id, day, start_time, source_row_hash)`
- `intake_runs` — status CHECK constraint, source_sheet, row counts, error_detail, created_at

## Core Modules

### Parser (`src/lib/routine-intake/parser.ts`)
- Auto-detects header row (`Course`, `Sec`, `Room`, `Day`, `Time`, `Teacher`)
- Day mapping: `Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6, Sat=7`
- Timeslot validation: `HH:mm-HH:mm` (24h), rejects `start >= end`
- Generates SHA-256 `source_row_hash` per row
- Returns `{ rows: ParsedRow[], failed: { row, reason }[] }`

### Normalizer (`src/lib/routine-intake/normalize.ts`)
- Deduplicates courses, sections, and instructors
- MySQL upsert helpers using `ON DUPLICATE KEY UPDATE`
- Follow-up `SELECT` after each upsert to resolve auto-generated IDs
- Typed with `PoolConnection` and `RowDataPacket` generics (no `any`)

### Ingest (`src/lib/routine-intake/ingest.ts`)
- Wraps full pipeline in a transaction (`BEGIN` / `COMMIT` / `ROLLBACK`)
- Calls: `parseRawRows` → `normalize` → `upsertCourses` → `upsertInstructors` → `upsertSections` → `upsertSlots`
- Logs run to `intake_runs` and returns `RunResult`

### Sheets Fetcher (`src/lib/sheets.ts`)
- Supports Google Sheets API key (public sheets) and service-account JWT auth
- Returns `string[][]` rows from the specified range

### Admin Guard (`src/lib/auth.ts`)
- Checks `x-api-key` header or `admin_api_key` cookie against `ADMIN_API_KEY` env var

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/routine-intake/preview` | Admin | Dry run — parse and normalize without DB writes |
| POST | `/api/routine-intake/run` | Admin | Execute full intake pipeline |
| GET | `/api/routine-intake/runs` | Admin | List recent intake runs |
| GET | `/api/routine-intake/runs/[id]` | Admin | Get single run details |
| GET | `/api/routine/courses` | None | List courses |
| GET | `/api/routine/sections` | None | List sections (optionally filter by courseId) |
| GET | `/api/routine/slots` | None | List slots (optionally filter by sectionId and day) |

## Validation
- Parser unit tests pass: `npm run test` (6/6)
- Build succeeds: `npm run build` (TypeScript + static generation)
- ESLint passes: `npm run lint` (no errors)

## Demo Usage

### 1. Preview
```bash
curl -s -X POST http://localhost:3000/api/routine-intake/preview \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-admin-key-123" \
  -d '{"sheetId":"YOUR_SHEET_ID","range":"Sheet1!A2:F"}'
```

### 2. Run Intake
```bash
curl -s -X POST http://localhost:3000/api/routine-intake/run \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-admin-key-123" \
  -d '{"sheetId":"YOUR_SHEET_ID","range":"Sheet1!A2:F"}'
```

### 3. Verify Baseline
```bash
curl -s http://localhost:3000/api/routine/courses
curl -s http://localhost:3000/api/routine/slots
```

### 4. Run History
```bash
curl -s http://localhost:3000/api/routine-intake/runs
curl -s http://localhost:3000/api/routine-intake/runs/1
```

## Key Properties
- **Idempotent:** Safe to re-run; `source_row_hash` unique key prevents duplicates
- **Transactional:** Either all valid rows commit, or none (rollback on error)
- **Auditable:** Every run logged in `intake_runs` with status and counts
