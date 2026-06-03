import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      isbn,
      title,
      author,
      publisher,
      category,
      reason,
      owner,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "タイトルは必須です" },
        { status: 400 }
      );
    }

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "books!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            id,
            isbn ?? "",
            title ?? "",
            author ?? "",
            publisher ?? "",
            category ?? "",
            reason ?? "",
            owner ?? "",
            createdAt,
          ],
        ],
      },
    });

    return NextResponse.json({
      ok: true,
      book: {
        id,
        isbn,
        title,
        author,
        publisher,
        category,
        reason,
        owner,
        createdAt,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "本の登録に失敗しました" },
      { status: 500 }
    );
  }
}