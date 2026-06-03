import { google } from "googleapis";

async function main() {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!slackToken) {
    console.error("SLACK_BOT_TOKEN is not set");
    process.exit(1);
  }

  if (!spreadsheetId) {
    console.error("GOOGLE_SHEETS_ID is not set");
    process.exit(1);
  }

  try {
    const res = await fetch("https://slack.com/api/users.list?limit=1000", {
      headers: { Authorization: `Bearer ${slackToken}` },
    });

    const data = await res.json();

    if (!data.ok) {
      console.error("Slack API error:", data.error);
      process.exit(1);
    }

    const members = (data.members || []).filter((m) => !m.deleted && !m.is_bot && !m.is_app_user);

    const rows = [];

    // header
    rows.push(["display_name", "real_name", "id", "email", "is_shared", "password_hash"]);

    const sanitize = (s) => {
      if (!s) return "";
      try {
        // Normalize to NFKC, remove zero-width/control chars, normalize spaces
        return String(s)
          .normalize("NFKC")
          .replace(/[\u200B-\u200F\uFEFF]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      } catch (e) {
        return String(s);
      }
    };

    for (const m of members) {
      const profile = m.profile || {};
      const displayRaw = profile.display_name_normalized || profile.display_name || profile.real_name || m.name || "";
      const realRaw = profile.real_name_normalized || profile.real_name || "";
      const display = sanitize(displayRaw);
      const real = sanitize(realRaw);
      const id = m.id || "";
      const email = profile.email || "";

      // default is_shared empty; you can mark "shared"/"true" in sheet to exclude
      // password_hash left empty by default; admins can populate with sha256 hex
      rows.push([display, real, id, email, "", ""]);
    }

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "slack_users!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });

    console.log(`Synced ${members.length} users to slack_users tab.`);
  } catch (e) {
    console.error("Sync failed:", e);
    process.exit(1);
  }
}

main();
