// src/lib/studySchedulerEngine.ts
// @ts-ignore - Database query module
import db from '@/lib/db/db';

export interface ClassScheduleItem {
  type: 'class';
  id: number;
  course_code: string;
  course_name: string;
  section_code: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_number: string;
  teacher_name?: string;
  source?: string;
}

export interface StudySessionItem {
  type: 'study_session';
  id: number;
  course_id?: number | null;
  course_code?: string;
  course_name?: string;
  title: string;
  description?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'completed' | 'skipped';
  duration_minutes: number;
  color_tag: string;
}

export interface FreeGapItem {
  type: 'free_slot';
  day_of_week: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  label: string;
}

export interface UnifiedDaySchedule {
  day_of_week: string;
  items: (ClassScheduleItem | StudySessionItem)[];
  free_slots: FreeGapItem[];
  total_class_minutes: number;
  total_study_minutes: number;
  total_free_minutes: number;
}

export interface DeadlineReminder {
  reminder_id?: number;
  assignment_id?: number;
  session_id?: number;
  title: string;
  course_code?: string;
  message: string;
  due_at: string;
  hours_left: number;
  urgency: 'urgent' | 'approaching' | 'upcoming' | 'overdue';
  is_dismissed: boolean;
  submission_link?: string;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Converts "HH:MM" or "HH:MM:SS" into total minutes from midnight.
 */
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * Converts total minutes from midnight into "HH:MM:SS"
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
}

/**
 * Formats "09:00:00" to "9:00 AM"
 */
function formatPrettyTime(timeStr: string): string {
  const mins = timeToMinutes(timeStr);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Fetch unified weekly schedule combining Classes, Study Sessions, and Free Slots.
 */
export async function getUnifiedTimetable(userId: number = 1) {
  // 1. Fetch Classes (User routines or Master section schedules)
  let classRows: any[] = await db.query(
    `
    SELECT 
      r.routine_id AS id, 
      r.day_of_week, 
      r.start_time, 
      r.end_time, 
      r.room_number,
      c.course_code, 
      c.course_name, 
      s.section_code,
      u.full_name AS teacher_name,
      r.source
    FROM routines r
    JOIN sections s ON r.section_id = s.section_id
    JOIN courses c ON s.course_id = c.course_id
    LEFT JOIN users u ON s.teacher_id = u.user_id
    WHERE r.user_id = ?
    ORDER BY 
      FIELD(r.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
      r.start_time
  `,
    [userId]
  );

  if (!classRows || classRows.length === 0) {
    classRows = await db.query(`
      SELECT 
        ss.schedule_id AS id, 
        ss.day_of_week, 
        ss.start_time, 
        ss.end_time, 
        ss.room_number,
        c.course_code, 
        c.course_name, 
        s.section_code,
        u.full_name AS teacher_name,
        'spreadsheet' AS source
      FROM section_schedules ss
      JOIN sections s ON ss.section_id = s.section_id
      JOIN courses c ON s.course_id = c.course_id
      LEFT JOIN users u ON ss.teacher_id = u.user_id
      ORDER BY 
        FIELD(ss.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        ss.start_time
    `);
  }

  // 2. Fetch User's Scheduled Study Sessions
  const studyRows: any[] = await db.query(
    `
    SELECT 
      ss.session_id AS id,
      ss.course_id,
      c.course_code,
      c.course_name,
      ss.title,
      ss.description,
      ss.day_of_week,
      ss.start_time,
      ss.end_time,
      ss.priority,
      ss.status,
      ss.duration_minutes,
      ss.color_tag
    FROM study_sessions ss
    LEFT JOIN courses c ON ss.course_id = c.course_id
    WHERE ss.user_id = ?
    ORDER BY 
      FIELD(ss.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
      ss.start_time
  `,
    [userId]
  );

  // Group classes and study sessions by day
  const weeklySchedule: Record<string, UnifiedDaySchedule> = {};
  let totalWeekClassMins = 0;
  let totalWeekStudyMins = 0;
  let totalWeekFreeMins = 0;

  for (const day of DAYS_OF_WEEK) {
    weeklySchedule[day] = {
      day_of_week: day,
      items: [],
      free_slots: [],
      total_class_minutes: 0,
      total_study_minutes: 0,
      total_free_minutes: 0,
    };
  }

  // Populate Classes
  for (const cls of classRows) {
    const day = cls.day_of_week;
    if (!weeklySchedule[day]) continue;
    const dur = Math.max(0, timeToMinutes(cls.end_time) - timeToMinutes(cls.start_time));
    weeklySchedule[day].total_class_minutes += dur;
    totalWeekClassMins += dur;

    weeklySchedule[day].items.push({
      type: 'class',
      id: cls.id,
      course_code: cls.course_code,
      course_name: cls.course_name,
      section_code: cls.section_code,
      day_of_week: cls.day_of_week,
      start_time: cls.start_time,
      end_time: cls.end_time,
      room_number: cls.room_number || 'TBA',
      teacher_name: cls.teacher_name || 'Assigned Lecturer',
      source: cls.source || 'manual',
    });
  }

  // Populate Study Sessions
  for (const st of studyRows) {
    const day = st.day_of_week;
    if (!weeklySchedule[day]) continue;
    const dur = Math.max(0, timeToMinutes(st.end_time) - timeToMinutes(st.start_time));
    weeklySchedule[day].total_study_minutes += dur;
    totalWeekStudyMins += dur;

    weeklySchedule[day].items.push({
      type: 'study_session',
      id: st.id,
      course_id: st.course_id,
      course_code: st.course_code || 'STUDY',
      course_name: st.course_name || 'Self-Directed Study',
      title: st.title,
      description: st.description,
      day_of_week: st.day_of_week,
      start_time: st.start_time,
      end_time: st.end_time,
      priority: st.priority,
      status: st.status,
      duration_minutes: st.duration_minutes || dur,
      color_tag: st.color_tag || '#002626',
    });
  }

  // 3. Compute Free Study Gaps for each day
  // Operating academic window: 08:00 AM (480 min) to 08:00 PM (1200 min)
  const DAY_START_MIN = 8 * 60; // 08:00
  const DAY_END_MIN = 20 * 60; // 20:00

  for (const day of DAYS_OF_WEEK) {
    const dayObj = weeklySchedule[day];

    // Sort all scheduled items by start_time
    dayObj.items.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

    let currentPointer = DAY_START_MIN;

    for (const item of dayObj.items) {
      const itemStart = timeToMinutes(item.start_time);
      const itemEnd = timeToMinutes(item.end_time);

      if (itemStart > currentPointer) {
        const gapMins = itemStart - currentPointer;
        // Only surface gaps >= 30 minutes
        if (gapMins >= 30) {
          const gapStart = minutesToTime(currentPointer);
          const gapEnd = minutesToTime(itemStart);
          dayObj.free_slots.push({
            type: 'free_slot',
            day_of_week: day,
            start_time: gapStart,
            end_time: gapEnd,
            duration_minutes: gapMins,
            label: `${Math.floor(gapMins / 60)}h ${gapMins % 60 > 0 ? (gapMins % 60) + 'm' : ''} Open Study Window (${formatPrettyTime(gapStart)} - ${formatPrettyTime(gapEnd)})`,
          });
          dayObj.total_free_minutes += gapMins;
          totalWeekFreeMins += gapMins;
        }
      }

      if (itemEnd > currentPointer) {
        currentPointer = itemEnd;
      }
    }

    // Check remaining evening window
    if (currentPointer < DAY_END_MIN) {
      const eveningGap = DAY_END_MIN - currentPointer;
      if (eveningGap >= 45) {
        const gapStart = minutesToTime(currentPointer);
        const gapEnd = minutesToTime(DAY_END_MIN);
        dayObj.free_slots.push({
          type: 'free_slot',
          day_of_week: day,
          start_time: gapStart,
          end_time: gapEnd,
          duration_minutes: eveningGap,
          label: `${Math.floor(eveningGap / 60)}h ${eveningGap % 60 > 0 ? (eveningGap % 60) + 'm' : ''} Evening Study Block (${formatPrettyTime(gapStart)} - ${formatPrettyTime(gapEnd)})`,
        });
        dayObj.total_free_minutes += eveningGap;
        totalWeekFreeMins += eveningGap;
      }
    }
  }

  return {
    days: weeklySchedule,
    stats: {
      totalClassHours: +(totalWeekClassMins / 60).toFixed(1),
      totalStudyHours: +(totalWeekStudyMins / 60).toFixed(1),
      totalFreeHours: +(totalWeekFreeMins / 60).toFixed(1),
      studySessionCount: studyRows.length,
      classCount: classRows.length,
    },
  };
}

/**
 * Checks for conflict between proposed study session and existing classes or study blocks.
 */
export async function checkTimetableConflict(
  userId: number,
  dayOfWeek: string,
  startTime: string,
  endTime: string,
  excludeSessionId?: number
) {
  const proposedStart = timeToMinutes(startTime);
  const proposedEnd = timeToMinutes(endTime);

  if (proposedEnd <= proposedStart) {
    return {
      hasConflict: true,
      conflictType: 'invalid_range',
      message: 'End time must be after start time.',
    };
  }

  // 1. Check Collision with Class Routines
  const classRows: any[] = await db.query(
    `
    SELECT 
      r.routine_id, r.start_time, r.end_time, r.room_number,
      c.course_code, c.course_name, s.section_code
    FROM routines r
    JOIN sections s ON r.section_id = s.section_id
    JOIN courses c ON s.course_id = c.course_id
    WHERE r.user_id = ? AND r.day_of_week = ?
  `,
    [userId, dayOfWeek]
  );

  for (const cls of classRows) {
    const clsStart = timeToMinutes(cls.start_time);
    const clsEnd = timeToMinutes(cls.end_time);

    // Overlap condition: startA < endB && endA > startB
    if (proposedStart < clsEnd && proposedEnd > clsStart) {
      return {
        hasConflict: true,
        conflictType: 'class',
        conflictEntity: cls,
        message: `Schedule Conflict: You have a scheduled class (${cls.course_code} Sec ${cls.section_code}) on ${dayOfWeek} from ${formatPrettyTime(cls.start_time)} to ${formatPrettyTime(cls.end_time)}.`,
      };
    }
  }

  // 2. Check Collision with Other Study Sessions
  let studyQuery = `
    SELECT session_id, title, start_time, end_time, day_of_week
    FROM study_sessions
    WHERE user_id = ? AND day_of_week = ? AND status != 'skipped'
  `;
  const queryParams: any[] = [userId, dayOfWeek];

  if (excludeSessionId) {
    studyQuery += ' AND session_id != ?';
    queryParams.push(excludeSessionId);
  }

  const existingStudyRows: any[] = await db.query(studyQuery, queryParams);

  for (const st of existingStudyRows) {
    const stStart = timeToMinutes(st.start_time);
    const stEnd = timeToMinutes(st.end_time);

    if (proposedStart < stEnd && proposedEnd > stStart) {
      return {
        hasConflict: true,
        conflictType: 'study_session',
        conflictEntity: st,
        message: `Overlapping Study Session: "${st.title}" is already scheduled on ${dayOfWeek} from ${formatPrettyTime(st.start_time)} to ${formatPrettyTime(st.end_time)}.`,
      };
    }
  }

  return {
    hasConflict: false,
    conflictType: 'none',
    message: 'Time slot is open and available.',
  };
}

/**
 * Pulls upcoming assignment deadlines and active deadline reminders.
 */
export async function getUpcomingDeadlineReminders(userId: number = 1) {
  // 1. Fetch upcoming assignments for sections the student is enrolled in or active assignments
  const assignmentRows: any[] = await db.query(`
    SELECT 
      a.assignment_id,
      a.title,
      a.description,
      a.submission_link,
      a.max_score,
      a.due_date,
      c.course_code,
      c.course_name,
      s.section_code,
      u.full_name AS instructor_name,
      sub.status AS submission_status,
      sub.submitted_at
    FROM assignments a
    JOIN sections s ON a.section_id = s.section_id
    JOIN courses c ON s.course_id = c.course_id
    LEFT JOIN users u ON a.teacher_id = u.user_id
    LEFT JOIN assignment_submissions sub ON a.assignment_id = sub.assignment_id AND sub.student_id = ?
    WHERE (sub.status IS NULL OR sub.status != 'graded')
    ORDER BY a.due_date ASC
  `, [userId]);

  // 2. Fetch custom active alerts from reminders table
  const customReminders: any[] = await db.query(`
    SELECT 
      reminder_id,
      entity_type,
      entity_id,
      title,
      message,
      due_at,
      alert_offset_hours,
      is_dismissed,
      is_read,
      created_at
    FROM reminders
    WHERE user_id = ? AND is_dismissed = FALSE
    ORDER BY due_at ASC
  `, [userId]);

  const now = new Date().getTime();
  const alerts: DeadlineReminder[] = [];

  for (const a of assignmentRows) {
    const dueTime = new Date(a.due_date).getTime();
    const diffHours = (dueTime - now) / (1000 * 60 * 60);

    let urgency: 'urgent' | 'approaching' | 'upcoming' | 'overdue' = 'upcoming';
    if (diffHours < 0) {
      urgency = 'overdue';
    } else if (diffHours <= 24) {
      urgency = 'urgent';
    } else if (diffHours <= 72) {
      urgency = 'approaching';
    }

    alerts.push({
      assignment_id: a.assignment_id,
      title: `${a.course_code} - Sec ${a.section_code}: ${a.title}`,
      course_code: a.course_code,
      message: a.description || `Assignment due on ${new Date(a.due_date).toLocaleDateString()} at ${new Date(a.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      due_at: a.due_date,
      hours_left: Math.round(diffHours),
      urgency,
      is_dismissed: false,
      submission_link: a.submission_link,
    });
  }

  // Merge custom reminders
  for (const r of customReminders) {
    const dueTime = new Date(r.due_at).getTime();
    const diffHours = (dueTime - now) / (1000 * 60 * 60);

    let urgency: 'urgent' | 'approaching' | 'upcoming' | 'overdue' = 'upcoming';
    if (diffHours < 0) urgency = 'overdue';
    else if (diffHours <= 24) urgency = 'urgent';
    else if (diffHours <= 72) urgency = 'approaching';

    // Avoid duplicate title if already listed
    if (!alerts.some(al => al.title === r.title)) {
      alerts.push({
        reminder_id: r.reminder_id,
        session_id: r.entity_type === 'study_session' ? r.entity_id : undefined,
        title: r.title,
        message: r.message || 'Scheduled reminder alert.',
        due_at: r.due_at,
        hours_left: Math.round(diffHours),
        urgency,
        is_dismissed: Boolean(r.is_dismissed),
      });
    }
  }

  // Sort by urgency priority (urgent/overdue first)
  const urgencyWeight = { overdue: 0, urgent: 1, approaching: 2, upcoming: 3 };
  alerts.sort((a, b) => urgencyWeight[a.urgency] - urgencyWeight[b.urgency] || a.hours_left - b.hours_left);

  return alerts;
}

/**
 * Creates a new study session in the database after validating conflicts.
 */
export async function createStudySession(userId: number, data: {
  course_id?: number | null;
  title: string;
  description?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  color_tag?: string;
  allow_conflict?: boolean;
}) {
  const {
    course_id,
    title,
    description,
    day_of_week,
    start_time,
    end_time,
    priority = 'medium',
    color_tag = '#002626',
    allow_conflict = false,
  } = data;

  if (!title || !day_of_week || !start_time || !end_time) {
    throw new Error('Title, day of week, start time, and end time are required.');
  }

  // Validate conflict
  const conflictCheck = await checkTimetableConflict(userId, day_of_week, start_time, end_time);
  if (conflictCheck.hasConflict && !allow_conflict) {
    return {
      success: false,
      conflict: true,
      conflictType: conflictCheck.conflictType,
      message: conflictCheck.message,
    };
  }

  const durMins = Math.max(30, timeToMinutes(end_time) - timeToMinutes(start_time));

  const result: any = await db.query(`
    INSERT INTO study_sessions 
    (user_id, course_id, title, description, day_of_week, start_time, end_time, priority, status, duration_minutes, color_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
  `, [
    userId,
    course_id || null,
    title,
    description || null,
    day_of_week,
    start_time,
    end_time,
    priority,
    durMins,
    color_tag,
  ]);

  return {
    success: true,
    sessionId: result.insertId,
    message: 'Study session scheduled successfully.',
  };
}

/**
 * Updates an existing study session status or details.
 */
export async function updateStudySession(userId: number, sessionId: number, data: Partial<StudySessionItem>) {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) {
    fields.push('title = ?');
    params.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    params.push(data.description);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    params.push(data.status);
  }
  if (data.priority !== undefined) {
    fields.push('priority = ?');
    params.push(data.priority);
  }
  if (data.day_of_week !== undefined) {
    fields.push('day_of_week = ?');
    params.push(data.day_of_week);
  }
  if (data.start_time !== undefined) {
    fields.push('start_time = ?');
    params.push(data.start_time);
  }
  if (data.end_time !== undefined) {
    fields.push('end_time = ?');
    params.push(data.end_time);
  }

  if (fields.length === 0) return { success: false, message: 'No fields to update' };

  params.push(sessionId, userId);
  await db.query(`
    UPDATE study_sessions 
    SET ${fields.join(', ')}
    WHERE session_id = ? AND user_id = ?
  `, params);

  return { success: true, message: 'Study session updated successfully.' };
}

/**
 * Deletes a scheduled study session.
 */
export async function deleteStudySession(userId: number, sessionId: number) {
  await db.query(`
    DELETE FROM study_sessions 
    WHERE session_id = ? AND user_id = ?
  `, [sessionId, userId]);

  return { success: true, message: 'Study session removed.' };
}

/**
 * Dismisses a reminder banner.
 */
export async function dismissReminder(userId: number, reminderId: number) {
  await db.query(`
    UPDATE reminders 
    SET is_dismissed = TRUE 
    WHERE reminder_id = ? AND user_id = ?
  `, [reminderId, userId]);

  return { success: true, message: 'Reminder dismissed.' };
}
