import { google } from "googleapis";

export async function getMessagesByRequestId(
  requestId: string
) {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  const response =
    await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "messages!A:E",
    });

  const rows = response.data.values ?? [];

  return rows
    .slice(1)
    .filter((row) => row[1] === requestId)
    .map((row) => ({
      id: row[0],
      requestId: row[1],
      sender: row[2],
      message: row[3],
      createdAt: row[4],
    }));
}