import mysql from 'mysql2/promise';

async function check() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '@sHaikryan222',
      database: 'classconnect_db',
      port: 3306,
    });
    
    console.log('Altering courses table...');
    await conn.query(`ALTER TABLE courses MODIFY course_name VARCHAR(100) NULL`);
    console.log('Altering courses table completed.');
    
    for (const table of ['courses', 'sections', 'instructors', 'routine_slots', 'intake_runs']) {
      const [desc] = await conn.query(`DESCRIBE ${table}`);
      console.log(`Table ${table}:`, desc);
    }
    
    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

check();
