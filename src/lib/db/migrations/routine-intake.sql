-- Base tables required by routine intake (if not already present)
CREATE TABLE IF NOT EXISTS courses (
  course_id INT PRIMARY KEY AUTO_INCREMENT,
  course_code VARCHAR(20) UNIQUE NOT NULL,
  course_name VARCHAR(100) NOT NULL,
  department_id INT,
  credits INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sections (
  section_id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  section_no VARCHAR(8) NOT NULL,
  UNIQUE KEY uq_section (course_id, section_no),
  FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

-- Routine Intake tables
CREATE TABLE IF NOT EXISTS instructors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  initials VARCHAR(16) NOT NULL UNIQUE,
  name VARCHAR(120) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS routine_slots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  section_id INT NOT NULL,
  instructor_id INT DEFAULT NULL,
  day SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number VARCHAR(32) DEFAULT NULL,
  source_row_hash VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_slot (section_id, day, start_time, source_row_hash),
  FOREIGN KEY (section_id) REFERENCES sections(section_id),
  FOREIGN KEY (instructor_id) REFERENCES instructors(id)
);

CREATE TABLE IF NOT EXISTS intake_runs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  status VARCHAR(16) NOT NULL CHECK (status IN ('started','success','partial','failed')),
  source_sheet VARCHAR(255) NOT NULL,
  rows_read INT DEFAULT 0,
  rows_upserted INT DEFAULT 0,
  rows_failed INT DEFAULT 0,
  error_detail TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure sections table has unique constraint on (course_id, section_no) for idempotent upserts
-- Only add if not exists (handled by base schema creation above)
