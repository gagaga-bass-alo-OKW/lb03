"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  authenticate,
  createPendingAccount,
  issueResetToken,
  resetPassword,
  verifyAccount,
} from "@/lib/accounts";
import { deleteBook, getBookById, updateBook } from "@/lib/books";
import { CATEGORIES } from "@/lib/categories";
import { isSameName } from "@/lib/names";
import { getRequests } from "@/lib/requests";
import { isRequestStatus, updateRequestStatus } from "@/lib/requestStatus";
import { endSession, getSessionName, startSession } from "@/lib/session";
import { sendSlackDm } from "@/lib/slackDm";
import { getSlackIdByName } from "@/lib/slackUsers";

export type FormState = { error?: string; message?: string };

const MIN_PASSWORD_LENGTH = 8;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

// ─── アカウント ───────────────────────────────

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function checkNewPassword(formData: FormData): string | null {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください`;
  }
  if (password !== confirm) return "確認用のパスワードが一致しません";
  return null;
}

// マイページ作成：本人の Slack に確認リンクを送り、開いてもらうまでは確認待ち
export async function registerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = text(formData, "name");
  if (!name) return { error: "名前を入力してください" };

  const passwordError = checkNewPassword(formData);
  if (passwordError) return { error: passwordError };

  // 共有アカウントは本人に届かないので対象外（パスワード無しでは解決されない）
  const slackId = await getSlackIdByName(name).catch(() => null);
  if (!slackId) {
    return {
      error:
        "この名前の Slack ユーザーが見つかりません。Slack の表示名（または氏名）を入れてください",
    };
  }

  const result = await createPendingAccount(
    name,
    String(formData.get("password")),
    slackId
  );
  if (!result.ok) return { error: result.error };

  const sent = await sendSlackDm(
    slackId,
    [
      "📚 マイページの作成を受け付けました",
      "下のリンクを開いて「確認してログイン」を押すと、作成が完了します（30分以内）。",
      `${appUrl()}/me/verify?token=${result.token}`,
      "",
      "心当たりがない場合は、このメッセージは無視してください。",
    ].join("\n")
  );
  if (!sent) return { error: "Slack への送信に失敗しました。時間をおいてやり直してください" };

  return { message: "Slack の DM に確認リンクを送りました。30分以内に開いてください" };
}

export async function verifyAction(formData: FormData) {
  const name = await verifyAccount(text(formData, "token"));
  if (!name) redirect("/me/verify?error=1");

  await startSession(name);
  redirect("/me");
}

// パスワードを忘れたとき：本人の Slack に再設定リンクを送る
export async function forgotPasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = text(formData, "name");
  if (!name) return { error: "名前を入力してください" };

  const result = await issueResetToken(name);
  if (!result.ok) return { error: result.error };

  const sent = await sendSlackDm(
    result.slackId,
    [
      "🔑 マイページのパスワード再設定",
      "下のリンクから新しいパスワードを設定してください（30分以内）。",
      `${appUrl()}/me/reset?token=${result.token}`,
      "",
      "心当たりがない場合は、このメッセージは無視してください。パスワードは変わりません。",
    ].join("\n")
  );
  if (!sent) return { error: "Slack への送信に失敗しました。時間をおいてやり直してください" };

  return { message: "Slack の DM に再設定リンクを送りました。30分以内に開いてください" };
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const passwordError = checkNewPassword(formData);
  if (passwordError) return { error: passwordError };

  const name = await resetPassword(
    text(formData, "token"),
    String(formData.get("password"))
  );
  if (!name) {
    return { error: "リンクの有効期限が切れています。もう一度「パスワードを忘れた」からやり直してください" };
  }

  await startSession(name);
  redirect("/me");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const result = await authenticate(
    text(formData, "name"),
    String(formData.get("password") ?? "")
  );
  if (!result.ok) return { error: result.error };

  await startSession(result.name);
  redirect("/me");
}

export async function logoutAction() {
  await endSession();
  redirect("/me");
}

// ─── 本の管理（持ち主だけ） ───────────────────────

// ログイン中で、かつその本の持ち主なら本を返す
async function requireOwnBook(bookId: string) {
  const me = await getSessionName();
  if (!me) return { error: "ログインしてください" } as const;

  const book = await getBookById(bookId);
  if (!book) return { error: "本が見つかりません" } as const;
  if (!isSameName(book.owner, me)) {
    return { error: "自分の本だけ操作できます" } as const;
  }
  return { book } as const;
}

export async function updateBookAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const bookId = text(formData, "bookId");
  const owned = await requireOwnBook(bookId);
  if ("error" in owned) return { error: owned.error };

  const title = text(formData, "title");
  const category = text(formData, "category");
  if (!title) return { error: "タイトルは必須です" };
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return { error: "カテゴリーを選んでください" };
  }

  await updateBook(bookId, {
    title,
    author: text(formData, "author"),
    publisher: text(formData, "publisher"),
    category,
    reason: text(formData, "reason"),
    description: text(formData, "description"),
  });

  redirect(`/books/${bookId}`);
}

export async function deleteBookAction(formData: FormData) {
  const bookId = text(formData, "bookId");
  const owned = await requireOwnBook(bookId);
  if ("error" in owned) throw new Error(owned.error);

  // 貸出中の本は、返却済みにしてから削除する
  const requests = await getRequests();
  if (requests.some((r) => r.bookId === bookId && r.status === "approved")) {
    throw new Error("貸出中の本は削除できません");
  }

  await deleteBook(bookId);
  refresh();
}

// ─── 申請の承認・却下・返却（本の持ち主だけ） ─────────────

export async function setRequestStatusAction(formData: FormData) {
  const me = await getSessionName();
  if (!me) throw new Error("ログインしてください");

  const status = formData.get("status");
  if (!isRequestStatus(status)) throw new Error("status が不正です");

  const result = await updateRequestStatus(
    text(formData, "requestId"),
    status,
    async (row) => {
      const book = await getBookById(row[1] ?? "");
      return !!book && isSameName(book.owner, me);
    }
  );
  if (result !== "ok") throw new Error("この申請は操作できません");

  refresh();
}
