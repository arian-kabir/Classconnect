import { NextRequest } from "next/server";

export async function requireAdmin(req: NextRequest): Promise<{ error: Response } | null> {
  const key = req.headers.get("x-api-key") || req.cookies.get("admin_api_key")?.value;
  const expected = process.env.ADMIN_API_KEY;

  if (!expected || key !== expected) {
    return {
      error: new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  return null;
}
