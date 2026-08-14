// app/api/test-db/route.js
import { query } from '@/lib/db';
import { NextResponse } from '../../src/node_modules/next/server';

export async function GET() {
    try {
        // Test connection
        const result = await query('SELECT 1 + 1 as test');
        
        // Get list of tables
        const tables = await query('SHOW TABLES');
        
        // Check if notes table exists
        const notesExist = await query("SHOW TABLES LIKE 'notes'");
        
        // Check users table
        const users = await query('SELECT * FROM users LIMIT 5');
        
        // Check sections table
        const sections = await query('SELECT * FROM sections LIMIT 5');
        
        // Check notes table
        const notes = await query('SELECT * FROM notes LIMIT 5');
        
        return NextResponse.json({
            success: true,
            database: 'Connected',
            test_result: result[0],
            tables: tables.map(t => Object.values(t)[0]),
            notes_table_exists: notesExist.length > 0,
            sample_users: users,
            sample_sections: sections,
            sample_notes: notes
        });
    } catch (error) {
        console.error('Database test error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}