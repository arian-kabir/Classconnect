// src/app/api/auth/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { query } from '@/lib/db/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { full_name, email, password, role } = body;

    // Validate required fields
    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: 'Full name, email, and password are required.' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['student', 'teacher', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'student';

    // Check if user already exists
    const existing = await query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // Hash the password
    const salt = await bcryptjs.genSalt(12);
    const password_hash = await bcryptjs.hash(password, salt);

    // Insert new user
    await query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [email, password_hash, full_name, userRole]
    );

    return NextResponse.json(
      { message: 'Account created successfully.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
