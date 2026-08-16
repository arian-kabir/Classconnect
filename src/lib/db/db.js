// src/lib/db/db.js
import mysql from 'mysql2/promise';

let pool = null;

export async function query(sql, params = []) {
  try {
    if (!pool) {
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'classconnect_db',
        port: parseInt(process.env.DB_PORT || '3306'),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    }

    // Use pool.query for universal compatibility and extract the first element (rows)
    const [rows] = await pool.query(sql, params);
    
    // Defensive normalization: guarantee an array is always returned
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getConnection() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'classconnect_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool.getConnection();
}

export default { query, getConnection };