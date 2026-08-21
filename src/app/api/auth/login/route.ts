// src/app/api/auth/login/route.ts (Backend)
import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { query } from '@/lib/db/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const users = await query('SELECT * FROM users WHERE email = ?', [email]) as any[];

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'No account found with this email.' }, { status: 401 });
    }

    const user = users[0];

    if (user.password_hash === 'oauth_user') {
      return NextResponse.json({ error: 'Please sign in with Google for this account.' }, { status: 401 });
    }

    const isValid = await bcryptjs.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
