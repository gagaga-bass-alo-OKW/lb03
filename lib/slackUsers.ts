import { google } from "googleapis";

export async function getSlackIdByName(name: string, password?: string): Promise<string | null> {
  if (!name) return null;

  const normalize = (s: string) => {
    try {
      return String(s).normalize("NFKC").replace(/[\u200B-\u200F\uFEFF]/g, "").trim().toLowerCase();
    } catch (e) {
      return String(s).trim().toLowerCase();
    }
  };

  // If it already looks like a Slack ID, return as-is
  if (/^[UW][A-Z0-9]{6,}$/.test(name)) return name;

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "slack_users!A:F",
  });

  const rows = response.data.values ?? [];

  const target = normalize(name);
  console.log(`[DEBUG getSlackIdByName] Looking for: "${name}" -> normalized: "${target}"`);

  for (const r of rows) {
    const display = (r[0] ?? "").toString();
    const real = (r[1] ?? "").toString();
    const id = (r[2] ?? "").toString();
    const isShared = (r[4] ?? "").toString().toLowerCase();
    const pwHash = (r[5] ?? "").toString();

    const displayNorm = normalize(display);
    const realNorm = normalize(real);

    console.log(`  [Row] display: "${display}" -> "${displayNorm}", real: "${real}" -> "${realNorm}", id: "${id}", isShared: "${isShared}"`);

    // If not shared, normal resolution
    if (!(isShared === "true" || isShared === "shared" || isShared === "group")) {
      if (displayNorm === target || realNorm === target || normalize(id) === target) {
        console.log(`  ✓ MATCH FOUND: ${id}`);
        return id || null;
      }
      continue;
    }

    // If entry is shared/group, allow resolution only when password matches
    if (displayNorm === target || realNorm === target || normalize(id) === target) {
      // effective hash: per-row pwHash OR global env hash
      const effectiveHash = pwHash || (process.env.SHARED_ACCOUNT_PASSWORD_HASH ?? "");

      if (!effectiveHash) continue; // no password configured => don't allow

      if (!password) continue; // password not provided

      try {
        const crypto = await import("crypto");
        const hash = crypto.createHash("sha256").update(String(password)).digest("hex");
        if (hash === effectiveHash) {
          console.log(`  ✓ SHARED MATCH FOUND: ${id}`);
          return id || null;
        }
      } catch (e) {
        // on error, skip
        continue;
      }
    }
  }

  console.log(`  ✗ NO MATCH FOUND`);

  return null;
}

export async function getSlackMap(): Promise<Record<string, string>> {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "slack_users!A:E",
  });

  const rows = response.data.values ?? [];

  const map: Record<string, string> = {};

  rows.forEach((r) => {
    const display = (r[0] ?? "").toString();
    const real = (r[1] ?? "").toString();
    const id = (r[2] ?? "").toString();
    const isShared = (r[4] ?? "").toString().toLowerCase();

    if (isShared === "true" || isShared === "shared" || isShared === "group") return;

    if (display && id) map[display] = id;
    if (real && id) map[real] = id;
  });

  return map;
}
