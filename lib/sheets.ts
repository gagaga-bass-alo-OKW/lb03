import { google } from "googleapis";

// 書き込み権限付きの Sheets クライアント
export function getWritableSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

// タブ名から sheetId（行の削除などに必要な数値ID）を引く。無ければ null
export async function getSheetId(title: string): Promise<number | null> {
  const sheets = getWritableSheets();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    fields: "sheets.properties(sheetId,title)",
  });

  const sheet = res.data.sheets?.find((s) => s.properties?.title === title);
  return sheet?.properties?.sheetId ?? null;
}
