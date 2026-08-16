// src/lib/db/test-db.js
import db from './db.js';

async function testDatabaseConnection() {
  try {
    console.log("Attempting to connect to MySQL database...");
    
    const rows = await db.query('SELECT 1 + 1 AS solution');
    
    console.log("Database Connection Successful!");
    console.log("Test Query Result:", rows);
    process.exit(0);
  } catch (error) {
    console.error("Database Connection Failed!");
    console.error(error);
    process.exit(1);
  }
}

testDatabaseConnection();