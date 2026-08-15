import { readFileSync } from "node:fs";
import crypto from "node:crypto";

export type RawRow = string[];

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(serviceAccountPath: string): Promise<string> {
  const creds = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify(claimSet));
  const unsignedToken = `${header}.${claim}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsignedToken);
  const signature = base64url(sign.sign(creds.private_key));

  const assertion = `${unsignedToken}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get access token: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function fetchSheetRows(
  sheetId: string,
  range: string
): Promise<RawRow[]> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const serviceAccountPath = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH;

  // Fallback mock routine data for demo purposes if no credentials are configured
  const mockFallbackRows: RawRow[] = [
    ["Course", "Sec", "Room", "Day", "Time", "Teacher"],
    ["ENG-101", "A", "HUMN-204", "Mon", "09:00-10:30", "J.D."],
    ["CSE-471", "01", "NAC-502", "Tue", "11:20-12:50", "A.K."],
    ["BIO-100", "L1", "TBD", "Wed", "14:00-15:30", "M.R."],
    ["MAT-120", "03", "NAC-401", "Sun", "09:40-11:10", "L.H."],
    ["PHY-111", "02", "SAC-202", "Sun", "13:00-14:30", "S.H."],
    ["ENG-102", "B", "TBD", "Mon", "10:30-12:00", "F.F."],
    ["CSE-320", "02", "NAC-505", "Mon", "12:00-13:30", "A.K."],
  ];

  let hasCredentials = false;
  const headers: Record<string, string> = {};

  try {
    if (serviceAccountPath) {
      try {
        const token = await getAccessToken(serviceAccountPath);
        headers["Authorization"] = `Bearer ${token}`;
        hasCredentials = true;
      } catch (e) {
        console.warn("Service account credentials failed to load, falling back...");
      }
    }
    
    if (!hasCredentials && apiKey) {
      headers["Accept"] = "application/json";
      hasCredentials = true;
    }

    if (!hasCredentials) {
      console.warn("Google Sheets credentials not set. Attempting public CSV export fetch...");
      // Fetch public sheet as CSV (requires "Anyone with the link can view")
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Public CSV export failed: ${response.statusText}`);
      }
      const csvText = await response.text();
      // Simple CSV parser
      const lines = csvText.split(/\r?\n/);
      const rows = lines.map(line => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result.map(v => v.replace(/^"|"$/g, ''));
      }).filter(r => r.length > 0 && r.some(cell => cell !== ""));
      return rows;
    }

    const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`);
    if (apiKey && !serviceAccountPath) {
      url.searchParams.set("key", apiKey);
    }

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      console.warn(`Google Sheets fetch failed with status ${res.status}. Falling back to CSV export.`);
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const csvResponse = await fetch(csvUrl);
      if (csvResponse.ok) {
        const csvText = await csvResponse.text();
        const lines = csvText.split(/\r?\n/);
        return lines.map(line => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result.map(v => v.replace(/^"|"$/g, ''));
        }).filter(r => r.length > 0);
      }
      return mockFallbackRows;
    }

    const json = (await res.json()) as { values?: RawRow[] };
    return json.values ?? mockFallbackRows;
  } catch (err) {
    console.warn("Error fetching sheet rows, falling back to mock data:", err);
    return mockFallbackRows;
  }
}
