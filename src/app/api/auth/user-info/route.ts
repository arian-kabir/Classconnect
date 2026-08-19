// src/app/api/auth/user-info/route.ts (Backend)
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email query param required.' }, { status: 400 });
    }

    const users = await query(
      'SELECT user_id, full_name, email, role, profile_picture FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json(users[0]);
  } catch (error) {
    console.error('User-info error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
