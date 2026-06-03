import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      requestId,
      sender,
      message,
    }: {
      requestId?: string;
      sender?: string;
      message?: string;
    } = body;

    if (!requestId || !sender || !message) {
      return NextResponse.json(
        {
          error: "必須項目不足",
        },
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
      range: "messages!A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            id,
            requestId,
            sender,
            message,
            createdAt,
          ],
        ],
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "保存失敗",
      },
      { status: 500 }
    );
  }
}