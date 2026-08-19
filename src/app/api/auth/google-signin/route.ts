// src/app/api/auth/google-signin/route.ts (Backend)
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';

export async function POST(req: NextRequest) {
  try {
    const { email, full_name, profile_picture } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await query('SELECT user_id FROM users WHERE email = ?', [email]) as any[];
    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'User already exists.', existing: true });
    }

    // Determine role from email prefix
    let role = 'student';
    const emailLocal = email.split('@')[0]?.toLowerCase() || '';
    if (emailLocal.startsWith('prof.') || emailLocal.startsWith('dr.') || emailLocal.includes('.faculty')) {
      role = 'teacher';
    } else if (emailLocal === 'admin') {
      role = 'admin';
    }

    // Auto-register
    await query(
      'INSERT INTO users (email, password_hash, full_name, role, profile_picture) VALUES (?, ?, ?, ?, ?)',
      [email, 'oauth_user', full_name || 'G-Suite User', role, profile_picture || null]
    );

    return NextResponse.json({ message: 'User registered successfully.', existing: false });
  } catch (error) {
    console.error('Google sign-in error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
