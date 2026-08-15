import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(_req);
  if (auth?.error) return auth.error;

  const { id } = await params;
  const runId = Number(id);
  if (!Number.isInteger(runId) || runId <= 0) {
    return NextResponse.json({ message: "Invalid run id" }, { status: 422 });
  }

  const runs = await query(
    `SELECT id, status, source_sheet, rows_read, rows_upserted, rows_failed, error_detail, created_at
     FROM intake_runs
     WHERE id = ?`,
    [runId]
  );

  if (!runs.length) {
    return NextResponse.json({ message: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({ run: runs[0] }, { status: 200 });
}
