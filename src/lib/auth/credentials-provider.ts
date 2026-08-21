// backend/src/lib/auth/credentials-provider.ts

import bcrypt from 'bcrypt';
import { query } from '../db/db';

interface User {
  user_id: number;
  email: string;
  full_name: string;
  role: string;
  password_hash: string | null;
}

export function isAllowedEmail(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();

  return (
    normalizedEmail === 'admin@bracu.ac.bd' ||
    normalizedEmail.endsWith('@bracu.ac.bd') ||
    normalizedEmail.endsWith('@g.bracu.ac.bd')
  );
}

export function determineRole(
  email: string
): 'student' | 'teacher' | 'admin' {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === 'admin@bracu.ac.bd') {
    return 'admin';
  }

  if (normalizedEmail.endsWith('@g.bracu.ac.bd')) {
    return 'student';
  }

  if (normalizedEmail.endsWith('@bracu.ac.bd')) {
    return 'teacher';
  }

  throw new Error('Only BRAC University email addresses are allowed');
}

export async function authenticateUser(
  email: string,
  password: string
) {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isAllowedEmail(normalizedEmail)) {
      return null;
    }

    const expectedRole = determineRole(normalizedEmail);

    const users = await query<User[]>(
      `
      SELECT
        user_id,
        email,
        full_name,
        role,
        password_hash
      FROM users
      WHERE LOWER(email) = ?
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    if (!user.password_hash) {
      return null;
    }

    const isValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isValid) {
      return null;
    }

    // Make sure the database role agrees with the email-derived role.
    if (user.role.toLowerCase() !== expectedRole) {
      console.error(
        `Role mismatch for ${normalizedEmail}: DB=${user.role}, expected=${expectedRole}`
      );

      return null;
    }

    return {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: expectedRole,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}