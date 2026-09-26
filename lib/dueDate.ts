// 返却予定日まわりの共通処理（サーバー・クライアント両方から使う）

// 日本時間の今日（YYYY-MM-DD）
export function todayJst() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

// 申請フォームで選んだ日付を、requestsシートの希望期間列に保存する形にする
// （「まで」を付けて文字列のまま保存させる。日付だけだとシート側で日付型に変換される）
export function formatPeriod(dueDate: string) {
  return `${dueDate}まで`;
}

// 希望期間列から返却予定日（YYYY-MM-DD）を取り出す。
// 以前の自由入力（例：2週間くらい）は日付が読めないので null
export function parseDueDate(period: string): string | null {
  const m = period.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

// 承認済み（貸出中）で返却予定日を過ぎているか
export function isOverdue(request: { status: string; period: string }) {
  if (request.status !== "approved") return false;
  const due = parseDueDate(request.period);
  return due !== null && due < todayJst();
}

// 返却予定日を何日過ぎているか
export function daysOverdue(period: string) {
  const due = parseDueDate(period);
  if (!due) return 0;
  const diff = Date.parse(todayJst()) - Date.parse(due);
  return Math.max(0, Math.round(diff / 86_400_000));
}
