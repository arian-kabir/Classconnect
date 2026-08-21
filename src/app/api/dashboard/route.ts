// src/app/api/dashboard/route.ts

import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import db from '@/lib/db/db';

export async function GET(req: NextRequest) {
  try {
    const [coursesCount]: any = await db.query('SELECT COUNT(*) as count FROM courses');
    const [studentsCount]: any = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    const [teachersCount]: any = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'");
    const [sectionsCount]: any = await db.query('SELECT COUNT(*) as count FROM sections');

    return NextResponse.json({
      success: true,
      stats: {
        totalCourses: Number(coursesCount?.[0]?.count || 0),
        totalStudents: Number(studentsCount?.[0]?.count || 0),
        totalLecturers: Number(teachersCount?.[0]?.count || 0),
        totalSections: Number(sectionsCount?.[0]?.count || 0),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: (error as Error).message },
      { status: 500 }
    );
  }
}