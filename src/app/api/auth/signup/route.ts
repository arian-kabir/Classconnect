//backend/src/app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

import { query } from '@/lib/db/db';
import {
  determineRole,
  isAllowedEmail,
} from '@/lib/auth/credentials-provider';

interface ExistingUser {
  user_id: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const confirmPassword = body.confirmPassword;
    const fullName = body.fullName?.trim();

    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        {
          error: 'Email, password and password confirmation are required',
        },
        { status: 400 }
      );
    }

    if (!isAllowedEmail(email)) {
      return NextResponse.json(
        {
          error:
            'Only @bracu.ac.bd and @g.bracu.ac.bd accounts are allowed',
        },
        { status: 403 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          error: 'Passwords do not match',
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: 'Password must be at least 6 characters long',
        },
        { status: 400 }
      );
    }

    const role = determineRole(email);

    const existingUsers = await query<ExistingUser[]>(
      `
      SELECT user_id
      FROM users
      WHERE LOWER(email) = ?
      LIMIT 1
      `,
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        {
          error: 'An account with this email already exists',
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const name =
      fullName ||
      email
        .split('@')[0]
        .replace(/[._]/g, ' ');

    await query(
      `
      INSERT INTO users
        (email, full_name, role, password_hash)
      VALUES
        (?, ?, ?, ?)
      `,
      [email, name, role, passwordHash]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create account',
      },
      { status: 500 }
    );
  }
}