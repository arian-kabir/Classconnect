// src/lib/db/connection.ts
import { getConnection as getDbConnection } from './db';

export async function getConnection() {
  return getDbConnection();
}
