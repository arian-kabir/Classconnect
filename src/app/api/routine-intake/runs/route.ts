import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db/db";
import { RunsListQuerySchema } from "@/lib/routine-intake/schemas";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth?.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const { limit } = RunsListQuerySchema.parse({ limit: searchParams.get("limit") ?? undefined });

  const runs = await query(
    `SELECT id, status, source_sheet, rows_read, rows_upserted, rows_failed, error_detail, created_at
     FROM intake_runs
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );

  return NextResponse.json({ runs }, { status: 200 });
}
