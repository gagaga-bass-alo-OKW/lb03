import { google } from "googleapis";
import { cache } from "react";

export type Book = {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  reason: string;
  owner: string;
  createdAt: string;
};

export const getBooks = cache(async (): Promise<Book[]> => {
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
    range: "books!A:I",
  });

  const rows = response.data.values ?? [];

  return rows.slice(1).map((row) => ({
    id: row[0] ?? "",
    isbn: row[1] ?? "",
    title: row[2] ?? "",
    author: row[3] ?? "",
    publisher: row[4] ?? "",
    category: row[5] ?? "",
    reason: row[6] ?? "",
    owner: row[7] ?? "",
    createdAt: row[8] ?? "",
  }));
});

export const getBookById = cache(
  async (id: string): Promise<Book | undefined> => {
    const books = await getBooks();

    return books.find((book) => book.id === id);
  }
);