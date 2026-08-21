// migrate.js — Run DB schema migrations for Spreadsheet Routine Intake feature
const mysql = require('mysql2/promise');

// Load env from .env.local
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'classconnect_db',
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  console.log('Connected to DB. Running migrations...\n');

  // ── 1. Add initials column to users ─────────────────────────────────────
  try {
    await conn.query('ALTER TABLE `users` ADD COLUMN `initials` VARCHAR(10) DEFAULT NULL');
    console.log('[OK]   users.initials column added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('[SKIP] users.initials already exists');
    } else throw e;
  }

  // ── 2. Add source column to routines ─────────────────────────────────────
  try {
    await conn.query("ALTER TABLE `routines` ADD COLUMN `source` ENUM('manual','spreadsheet') DEFAULT 'manual'");
    console.log('[OK]   routines.source column added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('[SKIP] routines.source already exists');
    } else throw e;
  }

  // ── 3. Add spreadsheet_row_ref column to routines ─────────────────────────
  try {
    await conn.query('ALTER TABLE `routines` ADD COLUMN `spreadsheet_row_ref` INT DEFAULT NULL');
    console.log('[OK]   routines.spreadsheet_row_ref column added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('[SKIP] routines.spreadsheet_row_ref already exists');
    } else throw e;
  }

  // ── 4. Add unique key on routines for idempotent UPSERT ───────────────────
  try {
    await conn.query('ALTER TABLE `routines` ADD UNIQUE KEY `uq_user_section_day` (`user_id`, `section_id`, `day_of_week`)');
    console.log('[OK]   routines unique key (user_id, section_id, day_of_week) added');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('[SKIP] routines unique key already exists');
    } else if (e.code === 'ER_DUP_ENTRY') {
      console.log('[WARN] Duplicate entries exist — unique key not added. Clean duplicates first.');
    } else throw e;
  }

  // ── 5. Create section_schedules master table ──────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`section_schedules\` (
      \`schedule_id\`         INT PRIMARY KEY AUTO_INCREMENT,
      \`section_id\`          INT NOT NULL,
      \`day_of_week\`         ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
      \`start_time\`          TIME NOT NULL,
      \`end_time\`            TIME NOT NULL,
      \`room_number\`         VARCHAR(30) DEFAULT 'TBA',
      \`teacher_id\`          INT DEFAULT NULL,
      \`spreadsheet_row_ref\` INT DEFAULT NULL,
      \`last_synced_at\`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`created_at\`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`section_id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`teacher_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE SET NULL,
      UNIQUE KEY \`uq_section_day_start\` (\`section_id\`, \`day_of_week\`, \`start_time\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   section_schedules table ready');

  // ── 6. Create routine_intake_log table ────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`routine_intake_log\` (
      \`log_id\`          INT PRIMARY KEY AUTO_INCREMENT,
      \`spreadsheet_id\`  VARCHAR(255),
      \`sheet_range\`     VARCHAR(100),
      \`total_raw_rows\`  INT DEFAULT 0,
      \`inserted\`        INT DEFAULT 0,
      \`updated\`         INT DEFAULT 0,
      \`skipped\`         INT DEFAULT 0,
      \`warnings_count\`  INT DEFAULT 0,
      \`errors_count\`    INT DEFAULT 0,
      \`ran_at\`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   routine_intake_log table ready');

  // ── 7. Module 2: Expand users.role for student_tutor ────────────────────
  try {
    await conn.query(
      "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('student', 'teacher', 'student_tutor', 'admin') DEFAULT 'student'"
    );
    console.log('[OK]   users.role updated to support student_tutor');
  } catch (e) {
    console.log('[WARN] users.role update notice:', e.message);
  }

  // ── 8. Module 2: Add section_type column to sections ──────────────────────
  try {
    await conn.query(
      "ALTER TABLE `sections` ADD COLUMN `section_type` ENUM('LECTURE', 'LAB', 'TUTORIAL', 'COMBINED') DEFAULT 'LECTURE'"
    );
    console.log('[OK]   sections.section_type column added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('[SKIP] sections.section_type already exists');
    } else throw e;
  }

  // ── 9. Module 2: Create section_staff table ──────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`section_staff\` (
      \`allocation_id\` INT PRIMARY KEY AUTO_INCREMENT,
      \`section_id\`    INT NOT NULL,
      \`user_id\`       INT NOT NULL,
      \`role_type\`     ENUM('primary_instructor', 'teaching_assistant', 'lab_assistant', 'student_tutor') NOT NULL,
      \`assigned_at\`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`assigned_by\`   INT DEFAULT NULL,
      FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`section_id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
      UNIQUE KEY \`uq_section_user_role\` (\`section_id\`, \`user_id\`, \`role_type\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   section_staff table ready');

  // ── 10. Module 2: Seed sample Student Tutors & Staff Allocations ─────────
  try {
    // Insert sample student tutors if they don't exist
    await conn.query(`
      INSERT INTO users (user_id, email, password_hash, full_name, role, initials) VALUES
      (9, 'alex.turner@university.edu', 'hashed_pwd_9', 'Alex Turner (TA)', 'student_tutor', 'AT'),
      (10, 'lisa.ann@university.edu', 'hashed_pwd_10', 'Lisa Ann (LA)', 'student_tutor', 'LA'),
      (11, 'kevin.park@university.edu', 'hashed_pwd_11', 'Kevin Park (Tutor)', 'student_tutor', 'KP')
      ON DUPLICATE KEY UPDATE role = 'student_tutor'
    `);
    console.log('[OK]   Sample student tutors seeded');

    // Populate initial section_staff from existing sections' primary instructors
    await conn.query(`
      INSERT IGNORE INTO section_staff (section_id, user_id, role_type)
      SELECT section_id, teacher_id, 'primary_instructor'
      FROM sections
      WHERE teacher_id IS NOT NULL
    `);

    // Assign sample TAs / LAs to sections 1, 2, 4
    await conn.query(`
      INSERT IGNORE INTO section_staff (section_id, user_id, role_type) VALUES
      (1, 9, 'teaching_assistant'),
      (1, 10, 'lab_assistant'),
      (2, 9, 'teaching_assistant'),
      (3, 11, 'student_tutor'),
      (4, 10, 'lab_assistant')
    `);
    console.log('[OK]   Sample section staffing allocations seeded');
  } catch (seedErr) {
    console.log('[WARN] Seed step notice:', seedErr.message);
  }

  // ── 11. Module 3: Create study_sessions table ─────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`study_sessions\` (
      \`session_id\`        INT PRIMARY KEY AUTO_INCREMENT,
      \`user_id\`           INT NOT NULL,
      \`course_id\`         INT DEFAULT NULL,
      \`title\`             VARCHAR(255) NOT NULL,
      \`description\`       TEXT DEFAULT NULL,
      \`day_of_week\`       ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
      \`start_time\`        TIME NOT NULL,
      \`end_time\`          TIME NOT NULL,
      \`session_date\`      DATE DEFAULT NULL,
      \`priority\`          ENUM('low','medium','high','urgent') DEFAULT 'medium',
      \`status\`            ENUM('scheduled','completed','skipped') DEFAULT 'scheduled',
      \`duration_minutes\`  INT DEFAULT 60,
      \`color_tag\`         VARCHAR(20) DEFAULT '#002626',
      \`created_at\`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`course_id\`) REFERENCES \`courses\`(\`course_id\`) ON DELETE SET NULL,
      INDEX \`idx_user_day\` (\`user_id\`, \`day_of_week\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   study_sessions table ready');

  // ── 12. Module 3: Create reminders table ──────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`reminders\` (
      \`reminder_id\`        INT PRIMARY KEY AUTO_INCREMENT,
      \`user_id\`            INT NOT NULL,
      \`entity_type\`        ENUM('assignment','study_session','custom') NOT NULL,
      \`entity_id\`          INT DEFAULT NULL,
      \`title\`              VARCHAR(255) NOT NULL,
      \`message\`            TEXT DEFAULT NULL,
      \`due_at\`             DATETIME NOT NULL,
      \`alert_offset_hours\` INT DEFAULT 24,
      \`is_dismissed\`       BOOLEAN DEFAULT FALSE,
      \`is_read\`            BOOLEAN DEFAULT FALSE,
      \`created_at\`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
      INDEX \`idx_user_alerts\` (\`user_id\`, \`is_dismissed\`, \`due_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   reminders table ready');

  // ── 13. Module 3: Seed initial dynamic deadline reminders ────────────────
  try {
    // Seed dynamic reminders for upcoming assignment deadlines
    await conn.query(`
      INSERT IGNORE INTO reminders 
      (reminder_id, user_id, entity_type, entity_id, title, message, due_at, alert_offset_hours, is_dismissed)
      VALUES
      (1, 1, 'assignment', 1, 'CS101: Programming Assignment 1', 'Factorial calculation in Python due soon. Complete submission box review.', DATE_ADD(NOW(), INTERVAL 18 HOUR), 24, FALSE),
      (2, 1, 'assignment', 2, 'CSE471: Architecture Assignment 2', 'Complete System Analysis & Design module documentation.', DATE_ADD(NOW(), INTERVAL 42 HOUR), 48, FALSE)
    `);
    console.log('[OK]   Sample deadline reminders seeded');
  } catch (seedErr) {
    console.log('[WARN] Seed Module 3 notice:', seedErr.message);
  }

  await conn.end();
  console.log('\\n✅ All migrations complete.');
}

migrate().catch((e) => {
  console.error('\\n❌ Migration FAILED:', e.message);
  process.exit(1);
});

