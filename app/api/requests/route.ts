import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getBookById } from "@/lib/books";
import { getSlackIdByName } from "@/lib/slackUsers";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let body: {
      bookId?: string;
      bookTitle?: string;
      requester?: string;
      period?: string;
      comment?: string;
      requesterSlackId?: string;
      requesterPassword?: string;
      ownerSlackId?: string;
    };

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();

      body = {
        bookId: String(formData.get("bookId") ?? ""),
        bookTitle: String(formData.get("bookTitle") ?? ""),
        requester: String(formData.get("requester") ?? ""),
        period: String(formData.get("period") ?? ""),
        comment: String(formData.get("comment") ?? ""),
      };
    }

    const {
  bookId,
  bookTitle,
  requester,
  period,
  comment,
  requesterSlackId,
  requesterPassword,
  ownerSlackId,
} = body;

// 必須チェック
if (!bookId) {
  return Response.json(
    { error: "bookId is required" },
    { status: 400 }
  );
}

// book から owner を取得して slackId を補完
let resolvedRequesterSlackId = requesterSlackId ?? null;
let resolvedOwnerSlackId = ownerSlackId ?? null;
let book;

try {
  book = await getBookById(bookId!);

  if (!resolvedOwnerSlackId && book?.owner) {
    const id = await getSlackIdByName(book.owner);
    if (id) {
      resolvedOwnerSlackId = id;
    }
  }
      if (!resolvedRequesterSlackId && requester) {
        const id = await getSlackIdByName(requester, requesterPassword);
        if (id) resolvedRequesterSlackId = id;
      }

      // If still not resolved, allow using a single shared account via global password
      if (!resolvedRequesterSlackId && requesterPassword && process.env.SHARED_ACCOUNT_PASSWORD_HASH && process.env.SHARED_ACCOUNT_SLACK_ID) {
        try {
          const cryptoMod = await import("crypto");
          const hash = cryptoMod.createHash("sha256").update(String(requesterPassword)).digest("hex");
          if (hash === process.env.SHARED_ACCOUNT_PASSWORD_HASH) {
            resolvedRequesterSlackId = process.env.SHARED_ACCOUNT_SLACK_ID;
          }
        } catch (e) {
          console.error("Shared password check failed:", e);
        }
      }
    } catch (e) {
      // lookup が失敗しても続行
      console.error("Slack ID lookup failed:", e);
    }

    if (!bookId || !bookTitle || !requester) {
      return NextResponse.json(
        {
          error: "必須項目が不足しています",
        },
        { status: 400 }
      );
    }

    // Debug: Slack ID 解決の結果をログ
    console.log(`[DEBUG] Slack ID resolution:
  Requester: ${requester} -> ${resolvedRequesterSlackId || "NOT_RESOLVED"}
  Owner: ${book?.owner || "unknown"} -> ${resolvedOwnerSlackId || "NOT_RESOLVED"}`);

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    // サーバー側チェック: 既に承認済みの申請があれば申請不可とする
    try {
      const existingRes = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: "requests!A:I",
      });

      const existingRows = existingRes.data.values ?? [];

      const alreadyBorrowed = existingRows.some((r) => (r[1] ?? "") === bookId && (r[6] ?? "") === "approved");

      if (alreadyBorrowed) {
        return NextResponse.json({ error: "この本は現在貸出中です" }, { status: 400 });
      }
    } catch (e) {
      console.error("貸出チェックの取得に失敗:", e);
      // チェック失敗でも申請自体は続行する
    }

    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // ✅ Sheets追加 (A:L を使って threadTs / requesterSlackId / ownerSlackId を格納できるようにする)
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "requests!A:L",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            id,
            bookId,
            bookTitle,
            requester,
            period ?? "",
            comment ?? "",
            "pending",
            token,
            createdAt,
            "", // J: threadTs (後で更新)
            resolvedRequesterSlackId ?? "", // K: requesterSlackId
            resolvedOwnerSlackId ?? "", // L: ownerSlackId
          ],
        ],
      },
    });

    // ✅ Slack通知
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const bookUrl = `${appUrl}/books/${bookId}?token=${token}`;

      // 優先: Bot token を使って chat.postMessage を行い、thread_ts を取得して Sheets に保存
      if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID) {
        // メンションは本文内に含める（冒頭には出さない）
        const requesterMention = resolvedRequesterSlackId ? `<@${resolvedRequesterSlackId}>` : requester;
        const ownerMention = resolvedOwnerSlackId ? `<@${resolvedOwnerSlackId}>` : book?.owner || "未設定";

        const postRes = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          },
          body: JSON.stringify({
            channel: process.env.SLACK_CHANNEL_ID,
            text: [
              "📚 貸出申請がありました",
              "",
              `本：${bookTitle}`,
              `申請者：${requesterMention}`,
              `所有者：${ownerMention}`,
              `希望期間：${period || "未指定"}`,
              `コメント：${comment || "なし"}`,
              "",
              "👇 確認はこちら",
              bookUrl,
            ]
              .filter(Boolean)
              .join("\n"),
          }),
        });

        const postJson = await postRes.json();

        console.log(`[DEBUG] Slack API postMessage response:`, postJson);

        if (postJson && postJson.ok && postJson.ts) {
          const threadTs = postJson.ts;

          // 追加した行を見つけて threadTs / slackId を更新
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            range: "requests!A:L",
          });

          const rows = response.data.values ?? [];

          const rowIndex = rows.findIndex((r) => r[0] === id);

          if (rowIndex !== -1) {
            const row = rows[rowIndex];

            // ensure row has enough columns
            row[9] = threadTs; // J
            row[10] = resolvedRequesterSlackId ?? ""; // K
            row[11] = resolvedOwnerSlackId ?? ""; // L

            await sheets.spreadsheets.values.update({
              spreadsheetId: process.env.GOOGLE_SHEETS_ID,
              range: `requests!A${rowIndex + 1}:L${rowIndex + 1}`,
              valueInputOption: "USER_ENTERED",
              requestBody: {
                values: [row],
              },
            });
          }
        } else {
          console.error(`[ERROR] Slack API failed: ${postJson?.error || "unknown error"}`);
        }

        // done with bot path
      } else {
        // フォールバック: 古い webhook 実装
        const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

        if (slackWebhookUrl) {
          await fetch(slackWebhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: [
                "📚 貸出申請がありました",
                "",
                `本：${bookTitle}`,
                `申請者：${requester}`,
                `希望期間：${period || "未指定"}`,
                `コメント：${comment || "なし"}`,
                "",
                "👇 確認はこちら",
                bookUrl,
              ].join("\n"),
            }),
          });
        }
      }
    } catch (error) {
      console.error("Slack通知に失敗:", error);
    }

    return NextResponse.json({
      ok: true,
      request: {
        id,
        bookId,
        bookTitle,
        requester,
        period,
        comment,
        token,
        createdAt,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("貸出申請APIエラー:", errorMsg, error);

    return NextResponse.json(
      {
        error: "貸出申請の保存に失敗しました",
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}