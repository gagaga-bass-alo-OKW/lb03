import { google } from "googleapis";
import { NextResponse } from "next/server";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  try {
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
        spreadsheetId:
          process.env.GOOGLE_SHEETS_ID,
        range: "books!A:J",
      });

    const rows = response.data.values ?? [];

    let updatedCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      const isbn = row[1] ?? "";
      const description = row[9] ?? "";

      if (!isbn) continue;

      if (description.trim() !== "") {
        continue;
      }

      try {
        const bookResponse = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
        );

        const bookData =
          await bookResponse.json();

        const newDescription =
          bookData.items?.[0]?.volumeInfo
            ?.description ?? "";

        if (!newDescription) {
          continue;
        }

        const sheetRow = i + 1;

        await sheets.spreadsheets.values.update({
          spreadsheetId:
            process.env.GOOGLE_SHEETS_ID,
          range: `books!J${sheetRow}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[newDescription]],
          },
        });

        updatedCount++;

        console.log(
          `updated row ${sheetRow}`
        );

        await sleep(200);

      } catch (error) {
        console.error(
          `row ${i + 1} failed`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}