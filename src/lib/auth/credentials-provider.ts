// backend/src/lib/auth/credentials-provider.ts
import bcrypt from 'bcrypt';
import { query } from '../db/db';

interface User {
  user_id: number;
  email: string;
  full_name: string;
  role: string;
  password_hash: string;
}

export async function authenticateUser(email: string, password: string) {
  try {
    // Find user by email
    const users: any = await query(
      'SELECT user_id, email, full_name, role, password_hash FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Compare password
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return null;
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export function determineRole(email: string): 'student' | 'teacher' | 'admin' {
  if (email === 'admin@gmail.com') {
    return 'admin';
  }
  if (email.endsWith('@g.bracu.ac.bd')) {
    return 'student';
  }
  if (email.endsWith('@bracu.ac.bd')) {
    return 'teacher';
  }
  return 'student'; // Default fallback
}
