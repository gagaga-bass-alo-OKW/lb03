import { google } from "googleapis";
import { cache } from "react";
import { normalizeCategory } from "@/lib/categories";
import { getSheetId, getWritableSheets } from "@/lib/sheets";

export type Book = {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  reason: string;
  owner: string;
  description: string;
  createdAt: string;
};

export const getBooks = cache(async (): Promise<Book[]> => {
  console.log("GET BOOKS");
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
    range: "books!A:J",
  });

  const rows = response.data.values ?? [];

  return rows.slice(1).map((row) => ({
    id: row[0] ?? "",
    isbn: row[1] ?? "",
    title: row[2] ?? "",
    author: row[3] ?? "",
    publisher: row[4] ?? "",
    category: normalizeCategory(row[5] ?? ""),
    reason: row[6] ?? "",
    owner: row[7] ?? "",
    createdAt: row[8] ?? "",
    description: row[9] ?? "",
  }));
});

export const getBookById = cache(
  async (id: string): Promise<Book | undefined> => {
    const books = await getBooks();

    return books.find((book) => book.id === id);
  }
);
// 登録後に変更できる項目（ISBN・持ち主・登録日時は変えない）
export type BookEdit = Pick<
  Book,
  "title" | "author" | "publisher" | "category" | "reason" | "description"
>;

async function findBookRow(id: string) {
  const sheets = getWritableSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "books!A:A",
  });
  const index = (res.data.values ?? []).findIndex((r) => r[0] === id);
  return index === -1 ? null : index + 1; // シートの行番号（1始まり）
}

export async function updateBook(id: string, edit: BookEdit) {
  const rowNumber = await findBookRow(id);
  if (!rowNumber) return false;

  const sheets = getWritableSheets();
  // C〜G列（タイトル・著者・出版社・カテゴリー・所有理由）と J列（説明）
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: `books!C${rowNumber}:G${rowNumber}`,
          values: [[edit.title, edit.author, edit.publisher, edit.category, edit.reason]],
        },
        {
          range: `books!J${rowNumber}`,
          values: [[edit.description]],
        },
      ],
    },
  });
  return true;
}

export async function deleteBook(id: string) {
  const [rowNumber, sheetId] = await Promise.all([
    findBookRow(id),
    getSheetId("books"),
  ]);
  if (!rowNumber || sheetId === null) return false;

  await getWritableSheets().spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
  return true;
}
