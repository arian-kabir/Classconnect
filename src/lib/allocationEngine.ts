/**
 * src/lib/allocationEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-Role Section Staffing & Allocation Ledger Engine
 * (Module 2 — Faria Fairooz Zahan)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// @ts-ignore
import db from '@/lib/db/db';

export interface StaffMember {
  userId: number;
  fullName: string;
  email: string;
  role: 'teacher' | 'student_tutor' | 'student' | 'admin';
  staffRoleType: 'primary_instructor' | 'teaching_assistant' | 'lab_assistant' | 'student_tutor';
  initials: string;
  profilePicture?: string | null;
}

export interface SectionScheduleInfo {
  scheduleId?: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
}

export interface SectionLedgerRow {
  sectionId: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  credits: number;
  departmentName?: string;
  sectionCode: string;
  semester: string;
  year: number;
  sectionType: 'LECTURE' | 'LAB' | 'TUTORIAL' | 'COMBINED';
  maxStudents: number;
  enrolledCount: number;
  primaryInstructor: StaffMember | null;
  supportStaff: StaffMember[];
  schedules: SectionScheduleInfo[];
  status: 'synced' | 'conflict' | 'unassigned' | 'warning';
  statusReason?: string;
  lastSyncedAt?: string | null;
}

/**
 * Fetch complete Section Staffing & Allocation Ledger with real-time conflict analysis.
 */
export async function getStaffingLedger(filterSemester?: string, filterCourse?: string): Promise<SectionLedgerRow[]> {
  // 1. Fetch all sections and course metadata
  let sectionSql = `
    SELECT 
      s.section_id, s.course_id, s.section_code, s.semester, s.year, 
      s.section_type, s.max_students, s.teacher_id as direct_teacher_id,
      c.course_code, c.course_name, c.credits,
      d.department_name
    FROM sections s
    JOIN courses c ON s.course_id = c.course_id
    LEFT JOIN departments d ON c.department_id = d.department_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filterSemester) {
    sectionSql += ` AND s.semester = ?`;
    params.push(filterSemester);
  }
  if (filterCourse) {
    sectionSql += ` AND c.course_code LIKE ?`;
    params.push(`%${filterCourse}%`);
  }

  sectionSql += ` ORDER BY c.course_code ASC, s.section_code ASC`;

  const sections: any[] = await db.query(sectionSql, params);

  // 2. Fetch all staff allocations from section_staff joined with users
  const staffRows: any[] = await db.query(`
    SELECT 
      ss.section_id, ss.role_type,
      u.user_id, u.full_name, u.email, u.role, u.initials, u.profile_picture
    FROM section_staff ss
    JOIN users u ON ss.user_id = u.user_id
    ORDER BY ss.section_id, ss.role_type ASC
  `);

  // Map staff by section_id
  const staffBySection = new Map<number, StaffMember[]>();
  for (const row of staffRows) {
    const list = staffBySection.get(row.section_id) || [];
    const initials = row.initials || row.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 3).toUpperCase();
    list.push({
      userId: row.user_id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      staffRoleType: row.role_type,
      initials,
      profilePicture: row.profile_picture || null,
    });
    staffBySection.set(row.section_id, list);
  }

  // 3. Fetch enrollment counts per section
  const enrollmentRows: any[] = await db.query(`
    SELECT section_id, COUNT(*) as enrolled_count
    FROM section_enrollments
    WHERE status = 'active'
    GROUP BY section_id
  `);
  const enrollmentMap = new Map<number, number>();
  for (const row of enrollmentRows) {
    enrollmentMap.set(row.section_id, Number(row.enrolled_count));
  }

  // 4. Fetch schedules from section_schedules (and routines fallback)
  const scheduleRows: any[] = await db.query(`
    SELECT schedule_id, section_id, day_of_week, start_time, end_time, room_number, last_synced_at
    FROM section_schedules
    ORDER BY section_id, FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), start_time
  `);
  const schedulesBySection = new Map<number, { schedules: SectionScheduleInfo[]; lastSyncedAt?: string | null }>();
  for (const row of scheduleRows) {
    const entry: { schedules: SectionScheduleInfo[]; lastSyncedAt?: string | null } =
      schedulesBySection.get(row.section_id) || { schedules: [], lastSyncedAt: row.last_synced_at };
    entry.schedules.push({
      scheduleId: row.schedule_id,
      dayOfWeek: row.day_of_week,
      startTime: String(row.start_time).substring(0, 5),
      endTime: String(row.end_time).substring(0, 5),
      roomNumber: row.room_number || 'TBA',
    });
    if (row.last_synced_at) entry.lastSyncedAt = row.last_synced_at;
    schedulesBySection.set(row.section_id, entry);
  }

  // 5. Fetch all teacher schedules to detect instructor timetable collisions
  const teacherSchedules: any[] = await db.query(`
    SELECT ss.teacher_id, ss.section_id, ss.day_of_week, ss.start_time, ss.end_time
    FROM section_schedules ss
    WHERE ss.teacher_id IS NOT NULL
  `);

  // 6. Build and compute conflict diagnostics for each row
  const ledger: SectionLedgerRow[] = [];

  for (const sec of sections) {
    const secId = sec.section_id;
    const allStaff = staffBySection.get(secId) || [];
    
    // Find primary instructor from section_staff, or fallback to section.teacher_id
    let primaryInstructor = allStaff.find(s => s.staffRoleType === 'primary_instructor') || null;
    if (!primaryInstructor && sec.direct_teacher_id) {
      // Find user info for direct_teacher_id
      const uRows: any[] = await db.query(
        `SELECT user_id, full_name, email, role, initials, profile_picture FROM users WHERE user_id = ? LIMIT 1`,
        [sec.direct_teacher_id]
      );
      if (uRows.length > 0) {
        const u = uRows[0];
        primaryInstructor = {
          userId: u.user_id,
          fullName: u.full_name,
          email: u.email,
          role: u.role,
          staffRoleType: 'primary_instructor',
          initials: u.initials || u.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 3).toUpperCase(),
          profilePicture: u.profile_picture || null,
        };
      }
    }

    const supportStaff = allStaff.filter(s => s.staffRoleType !== 'primary_instructor');
    const enrolled = enrollmentMap.get(secId) || 0;
    const maxStudents = sec.max_students || 35;
    const scheduleData = schedulesBySection.get(secId) || { schedules: [], lastSyncedAt: null };

    // ── Diagnostic Conflict Engine ──────────────────────────────────────────
    let status: 'synced' | 'conflict' | 'unassigned' | 'warning' = 'synced';
    let statusReason = 'Staffing & schedule synchronized';

    if (!primaryInstructor) {
      status = 'unassigned';
      statusReason = 'No primary instructor assigned';
    } else if (enrolled > maxStudents) {
      status = 'conflict';
      statusReason = `Enrollment (${enrolled}) exceeds maximum capacity (${maxStudents})`;
    } else if (scheduleData.schedules.length === 0) {
      status = 'warning';
      statusReason = 'No timetable slots scheduled';
    } else {
      // Check for teacher schedule collisions
      const currentTeacherId = primaryInstructor.userId;
      for (const currSched of scheduleData.schedules) {
        const hasCollision = teacherSchedules.some(ts => 
          ts.teacher_id === currentTeacherId &&
          ts.section_id !== secId &&
          ts.day_of_week === currSched.dayOfWeek &&
          String(ts.start_time).substring(0, 5) === currSched.startTime
        );

        if (hasCollision) {
          status = 'conflict';
          statusReason = `Instructor schedule collision on ${currSched.dayOfWeek} ${currSched.startTime}`;
          break;
        }
      }
    }

    ledger.push({
      sectionId: secId,
      courseId: sec.course_id,
      courseCode: sec.course_code,
      courseName: sec.course_name,
      credits: sec.credits,
      departmentName: sec.department_name || 'Academic Department',
      sectionCode: sec.section_code,
      semester: sec.semester,
      year: sec.year,
      sectionType: sec.section_type || 'LECTURE',
      maxStudents,
      enrolledCount: enrolled,
      primaryInstructor,
      supportStaff,
      schedules: scheduleData.schedules,
      status,
      statusReason,
      lastSyncedAt: scheduleData.lastSyncedAt ? new Date(scheduleData.lastSyncedAt).toISOString() : null,
    });
  }

  return ledger;
}

/**
 * Fetch available staff pool for assignment pickers.
 */
export async function getStaffPool() {
  const users: any[] = await db.query(`
    SELECT user_id, email, full_name, role, initials, profile_picture
    FROM users
    WHERE role IN ('teacher', 'student_tutor', 'student')
    ORDER BY role ASC, full_name ASC
  `);

  return users.map(u => ({
    userId: u.user_id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    initials: u.initials || u.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 3).toUpperCase(),
    profilePicture: u.profile_picture || null,
  }));
}

/**
 * Save cross-role staffing & allocation changes for a section.
 */
export async function saveSectionAllocations(payload: {
  sectionId: number;
  primaryInstructorId?: number | null;
  supportStaff?: Array<{
    userId: number;
    staffRoleType: 'teaching_assistant' | 'lab_assistant' | 'student_tutor';
  }>;
  sectionType?: 'LECTURE' | 'LAB' | 'TUTORIAL' | 'COMBINED';
  maxStudents?: number;
}) {
  const { sectionId, primaryInstructorId, supportStaff = [], sectionType, maxStudents } = payload;

  // 1. Update section attributes
  const updateFields: string[] = [];
  const updateParams: any[] = [];

  if (sectionType) {
    updateFields.push('section_type = ?');
    updateParams.push(sectionType);
  }
  if (typeof maxStudents === 'number' && maxStudents > 0) {
    updateFields.push('max_students = ?');
    updateParams.push(maxStudents);
  }
  if (primaryInstructorId !== undefined) {
    updateFields.push('teacher_id = ?');
    updateParams.push(primaryInstructorId);
  }

  if (updateFields.length > 0) {
    updateParams.push(sectionId);
    await db.query(
      `UPDATE sections SET ${updateFields.join(', ')} WHERE section_id = ?`,
      updateParams
    );
  }

  // 2. Sync section_schedules teacher_id if primary instructor changed
  if (primaryInstructorId !== undefined) {
    await db.query(
      `UPDATE section_schedules SET teacher_id = ? WHERE section_id = ?`,
      [primaryInstructorId, sectionId]
    );
  }

  // 3. Re-sync section_staff table
  // Clear existing staff allocations for this section
  await db.query(`DELETE FROM section_staff WHERE section_id = ?`, [sectionId]);

  // Insert primary instructor
  if (primaryInstructorId) {
    await db.query(
      `INSERT INTO section_staff (section_id, user_id, role_type)
       VALUES (?, ?, 'primary_instructor')
       ON DUPLICATE KEY UPDATE role_type = 'primary_instructor'`,
      [sectionId, primaryInstructorId]
    );
  }

  // Insert support staff
  for (const staff of supportStaff) {
    if (staff.userId && staff.staffRoleType) {
      await db.query(
        `INSERT INTO section_staff (section_id, user_id, role_type)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE role_type = VALUES(role_type)`,
        [sectionId, staff.userId, staff.staffRoleType]
      );
    }
  }

  return { success: true, sectionId };
}
