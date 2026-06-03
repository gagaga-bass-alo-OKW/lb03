import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getBookById } from "@/lib/books";
import { getSlackIdByName } from "@/lib/slackUsers";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      status,
      token,
    }: {
      status?: string;
      token?: string;
    } = body;

    if (!status || !token) {
      return NextResponse.json(
        { error: "status または token が不足しています" },
        { status: 400 }
      );
    }

    // ✅ Google認証
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    // ✅ requests取得（J列まで使う）
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "requests!A:J",
    });

    const rows = response.data.values ?? [];

    const rowIndex = rows.findIndex((row) => row[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: "申請が見つかりません" },
        { status: 404 }
      );
    }

    const row = rows[rowIndex];

    // ✅ tokenチェック
    if (row[7] !== token) {
      return NextResponse.json(
        { error: "tokenが不正です" },
        { status: 403 }
      );
    }

    // ✅ ステータス更新
    row[6] = status;

    // ✅ Sheets更新（J列まで）
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `requests!A${rowIndex + 1}:J${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

    // ✅ Slack通知（スレッド＋メンション）
    try {
      const threadTs = row[9]; // ← J列: threadTs

      // ✅ Slack ID（列がある場合）
      let requesterSlackId = row[10]; // もし追加してたら（例）
      let ownerSlackId = row[11];     // もし追加してたら（例）

      // 列に Slack ID が無ければ slack_users シートから解決を試みる
      try {
        if (!requesterSlackId && row[3]) {
          const id = await getSlackIdByName(row[3]);
          if (id) requesterSlackId = id;
        }

        if (!ownerSlackId && row[1]) {
          const book = await getBookById(row[1]);
          if (book?.owner) {
            const id = await getSlackIdByName(book.owner);
            if (id) ownerSlackId = id;
          }
        }
      } catch (e) {
        console.error("Slack ID lookup failed:", e);
      }

      if (process.env.SLACK_BOT_TOKEN && threadTs) {
        let statusLabel = "";

        if (status === "approved") {
          statusLabel = "貸出が承認されました";
        }

        if (status === "rejected") {
          statusLabel = "貸出が却下されました";
        }

        if (status === "returned") {
          statusLabel = "本が返却されました";
        }

        // ✅ メンション文字列
        const mentionText = [
          requesterSlackId ? `<@${requesterSlackId}>` : "",
          ownerSlackId ? `<@${ownerSlackId}>` : "",
        ]
          .filter(Boolean)
          .join(" ");

        await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          },
          body: JSON.stringify({
            channel: process.env.SLACK_CHANNEL_ID,
            thread_ts: threadTs,
            text: [
              mentionText, // 無ければ空
              statusLabel,
              "",
              `本：${row[2]}`,
              `申請者：${row[3]}`,
            ].join("\n"),
          }),
        });
      }
    } catch (error) {
      console.error("Slack通知エラー:", error);
    }

    return NextResponse.json({
      ok: true,
      status,
    });
  } catch (error) {
    console.error("PATCH API エラー:", error);

    return NextResponse.json(
      {
        error: "更新に失敗しました",
      },
      { status: 500 }
    );
  }
}