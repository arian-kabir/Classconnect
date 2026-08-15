// src/lib/db/queries/user.queries.ts
import { query } from '../db';

export class UserQueries {
  static async getUserById(userId: number) {
    const sql = `
      SELECT 
        user_id,
        email,
        full_name,
        role,
        profile_picture,
        created_at,
        last_active
      FROM users 
      WHERE user_id = ?
    `;
    const users = await query(sql, [userId]);
    return users.length > 0 ? users[0] : null;
  }

  static async getUserByEmail(email: string) {
    const sql = `
      SELECT 
        user_id,
        email,
        full_name,
        role,
        profile_picture,
        created_at,
        last_active
      FROM users 
      WHERE email = ?
    `;
    const users = await query(sql, [email]);
    return users.length > 0 ? users[0] : null;
  }
}
