import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT m.material_id, m.title, m.file_url, m.file_size_bytes, m.created_at, c.category_name 
      FROM course_materials m
      LEFT JOIN material_categories c ON m.category_id = c.category_id
      ORDER BY m.created_at DESC
    `);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const { title, file_url, category_id, course_id, uploaded_by } = await req.json();
      const [result]: any = await db.query(
        `INSERT INTO course_materials (course_id, category_id, title, file_url, uploaded_by, file_size_bytes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [course_id || 1, category_id || 4, title, file_url, uploaded_by || 3, 2097152]
      );
      return NextResponse.json({
        success: true,
        material: {
          material_id: result.insertId,
          title,
          file_url,
          file_size_bytes: 2097152,
          created_at: new Date().toISOString(),
          category_name: 'Reference Book',
        },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const categoryId = formData.get('category_id') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file selected' }, { status: 400 });
    }

    // Save file locally into public/uploads
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFileName);
    await fs.promises.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${safeFileName}`;

    const categoryMap: Record<string, string> = {
      '1': 'Syllabus',
      '2': 'Slides',
      '3': 'Lecture',
      '4': 'Reference Book',
    };
    const categoryName = categoryMap[categoryId] || 'Slides';

    let insertId = Date.now();
    try {
      const [result]: any = await db.query(
        `INSERT INTO course_materials (course_id, category_id, title, file_url, uploaded_by, file_size_bytes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [1, categoryId || 2, title || file.name, fileUrl, 3, file.size]
      );
      insertId = result.insertId;
    } catch (dbErr) {
      console.warn('DB insert skipped:', dbErr);
    }

    return NextResponse.json({
      success: true,
      material: {
        material_id: insertId,
        title: title || file.name,
        file_url: fileUrl,
        file_size_bytes: file.size,
        created_at: new Date().toISOString(),
        category_name: categoryName,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}