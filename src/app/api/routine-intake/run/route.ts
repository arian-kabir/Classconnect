import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runIntake } from "@/lib/routine-intake/ingest";
import { fetchSheetRows } from "@/lib/sheets";
import { RunQuerySchema } from "@/lib/routine-intake/schemas";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth?.error) return auth.error;

  const body = RunQuerySchema.parse(await req.json().catch(() => ({})));
  const sheetId = body.sheetId || process.env.ROUTINE_SHEET_ID;
  const range = body.range || process.env.ROUTINE_SHEET_RANGE;

  if (!sheetId || !range) {
    return NextResponse.json({ message: "sheetId and range are required" }, { status: 422 });
  }

  try {
    const rows = await fetchSheetRows(sheetId, range);
    const sourceSheet = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    const result = await runIntake(rows, sourceSheet);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json({ message: "Intake failed", error: String(err) }, { status: 502 });
  }
}
