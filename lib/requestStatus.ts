import { getBookById } from "@/lib/books";
import { getSlackIdByName } from "@/lib/slackUsers";
import { getWritableSheets } from "@/lib/sheets";

export const REQUEST_STATUSES = ["approved", "rejected", "returned"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export function isRequestStatus(s: unknown): s is RequestStatus {
  return REQUEST_STATUSES.includes(s as RequestStatus);
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  approved: "貸出が承認されました",
  rejected: "貸出が却下されました",
  returned: "本が返却されました",
};

// 申請のステータスを更新し、申請時の Slack スレッドに知らせる。
// 呼び出し側で権限（トークン or 持ち主としてログイン中）を確かめてから呼ぶこと。
// authorize は requests シートの行を受け取り、更新してよければ true を返す
export async function updateRequestStatus(
  id: string,
  status: RequestStatus,
  authorize: (row: string[]) => boolean | Promise<boolean>
): Promise<"ok" | "not_found" | "forbidden"> {
  const sheets = getWritableSheets();

  // A:L（J: threadTs / K: requesterSlackId / L: ownerSlackId まで）
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "requests!A:L",
  });

  const rows = response.data.values ?? [];
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return "not_found";

  const row = rows[rowIndex];
  if (!(await authorize(row))) return "forbidden";

  // G列（ステータス）だけを書き換える
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `requests!G${rowIndex + 1}`,
    valueInputOption: "RAW",
    requestBody: { values: [[status]] },
  });

  // ✅ Slack通知（スレッド＋メンション）。失敗しても更新自体は成功扱い
  try {
    const threadTs = row[9];
    let requesterSlackId = row[10];
    let ownerSlackId = row[11];

    // 列に Slack ID が無ければ slack_users シートから解決を試みる
    try {
      if (!requesterSlackId && row[3]) {
        const found = await getSlackIdByName(row[3]);
        if (found) requesterSlackId = found;
      }

      if (!ownerSlackId && row[1]) {
        const book = await getBookById(row[1]);
        if (book?.owner) {
          const found = await getSlackIdByName(book.owner);
          if (found) ownerSlackId = found;
        }
      }
    } catch (e) {
      console.error("Slack ID lookup failed:", e);
    }

    if (process.env.SLACK_BOT_TOKEN && threadTs) {
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
            STATUS_LABELS[status],
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

  return "ok";
}
