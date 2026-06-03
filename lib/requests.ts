import { google } from "googleapis";
import { cache } from "react";

export type BookRequest = {
  id: string;
  bookId: string;
  bookTitle: string;
  requester: string;
  period: string;
  comment: string;
  status: string;
  token: string;
  createdAt: string;
};

export const getRequests = cache(async (): Promise<BookRequest[]> => {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "requests!A:I",
  });

  const rows = response.data.values ?? [];

  return rows.slice(1).map((row) => ({
  id: row[0] ?? "",
  bookId: row[1] ?? "",
  bookTitle: row[2] ?? "",
  requester: row[3] ?? "",
  period: row[4] ?? "",
  comment: row[5] ?? "",
  status: row[6] ?? "pending",
  token: row[7] ?? "",
  createdAt: row[8] ?? "",
}));
})

export const getRequestsByBookId = cache(
  async (bookId: string): Promise<BookRequest[]> => {
    const requests = await getRequests();

    return requests.filter((request) => request.bookId === bookId);
  }
);