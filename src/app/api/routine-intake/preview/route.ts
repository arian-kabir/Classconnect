import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { parseRawRows } from "@/lib/routine-intake/parser";
import { normalize } from "@/lib/routine-intake/normalize";
import { fetchSheetRows } from "@/lib/sheets";
import { PreviewQuerySchema } from "@/lib/routine-intake/schemas";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth?.error) return auth.error;

  const body = PreviewQuerySchema.parse(await req.json().catch(() => ({})));
  const sheetId = body.sheetId || process.env.ROUTINE_SHEET_ID;
  const range = body.range || process.env.ROUTINE_SHEET_RANGE;

  if (!sheetId || !range) {
    return NextResponse.json({ message: "sheetId and range are required" }, { status: 422 });
  }

  try {
    const rows = await fetchSheetRows(sheetId, range);
    const { rows: parsed, failed } = parseRawRows(rows);
    const normalized = normalize(parsed);
    return NextResponse.json({ parsed, normalized, failed }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ message: "Preview failed", error: String(err) }, { status: 502 });
  }
}
