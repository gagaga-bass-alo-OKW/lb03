import { NextResponse } from "next/server";
import { getRequests } from "@/lib/requests";
import { getBookById } from "@/lib/books";
import { getSlackIdByName } from "@/lib/slackUsers";
import { daysOverdue, isOverdue, parseDueDate } from "@/lib/dueDate";

// Vercel Cron から毎朝呼ばれ、返却予定日を過ぎた貸出を Slack で知らせる（vercel.json 参照）
export async function GET(request: Request) {
  // Vercel Cron は CRON_SECRET を Authorization ヘッダーに付けて呼ぶ
  // （貼り付け時に紛れた前後の空白・改行はヘッダー側では落ちるので、比較前に除く）
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error("CRON_SECRET が設定されていません");
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }
  if (request.headers.get("authorization")?.trim() !== `Bearer ${cronSecret}`) {
    console.error("延滞チェック: Authorization ヘッダーが CRON_SECRET と一致しません");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
    return NextResponse.json({ ok: true, notified: 0, skipped: "slack not configured" });
  }

  const overdue = (await getRequests()).filter(isOverdue);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let notified = 0;

  for (const r of overdue) {
    try {
      // 申請時に Slack ID が解決できていなければ slack_users シートから探す
      let requesterSlackId = r.requesterSlackId;
      let ownerSlackId = r.ownerSlackId;
      const book = await getBookById(r.bookId);

      if (!requesterSlackId && r.requester) {
        requesterSlackId = (await getSlackIdByName(r.requester)) ?? "";
      }
      if (!ownerSlackId && book?.owner) {
        ownerSlackId = (await getSlackIdByName(book.owner)) ?? "";
      }

      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: process.env.SLACK_CHANNEL_ID,
          // 申請時のスレッドがあればそこに続ける
          ...(r.threadTs ? { thread_ts: r.threadTs } : {}),
          text: [
            [
              requesterSlackId ? `<@${requesterSlackId}>` : r.requester,
              ownerSlackId ? `<@${ownerSlackId}>` : "",
            ]
              .filter(Boolean)
              .join(" "),
            `⏰ 返却予定日を${daysOverdue(r.period)}日過ぎています`,
            "",
            `本：${r.bookTitle}`,
            `借りている人：${r.requester}`,
            `返却予定日：${parseDueDate(r.period)}`,
            "",
            "返却したら持ち主が「返却済み」にしてください",
            `${appUrl}/books/${r.bookId}?token=${r.token}`,
          ].join("\n"),
        }),
      });

      const json = await res.json();
      if (json.ok) {
        notified++;
      } else {
        console.error(`延滞通知の送信に失敗 (${r.id}):`, json.error);
      }
    } catch (e) {
      console.error(`延滞通知の送信に失敗 (${r.id}):`, e);
    }
  }

  return NextResponse.json({ ok: true, overdue: overdue.length, notified });
}
