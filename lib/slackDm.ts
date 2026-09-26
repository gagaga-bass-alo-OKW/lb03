// Bot から本人に DM を送る（channel に Slack ID を渡すと、その人とのDMに届く）
export async function sendSlackDm(slackId: string, text: string) {
  if (!process.env.SLACK_BOT_TOKEN) {
    console.error("SLACK_BOT_TOKEN が設定されていません");
    return false;
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        channel: slackId,
        text,
        // リンクのプレビューを出さない（プレビュー取得でリンクが開かれないように）
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    const json = await res.json();
    if (!json.ok) console.error("Slack DM の送信に失敗:", json.error);
    return !!json.ok;
  } catch (e) {
    console.error("Slack DM の送信に失敗:", e);
    return false;
  }
}
