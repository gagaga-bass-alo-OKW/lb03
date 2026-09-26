import Link from "next/link";
import { findAccountByToken } from "@/lib/accounts";
import SubmitButton from "../SubmitButton";
import { verifyAction } from "../actions";

type Props = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

// Slack の DM の確認リンクから開くページ。
// リンクを開いただけでは確定せず（プレビュー取得などで開かれても大丈夫なように）、ボタンで確定する
export default async function VerifyPage({ searchParams }: Props) {
  const { token = "", error } = await searchParams;
  const account = error ? null : await findAccountByToken(token, "verify");

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10">
      <div className="mx-auto max-w-md rounded-xl border border-[#E0DED7] bg-white p-6 text-center shadow-sm">
        <h1 className="mb-4 text-2xl font-semibold text-[#2F3E34]">マイページの確認</h1>

        {account ? (
          <form action={verifyAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm text-[#5B6C60]">
              「{account.name}」としてマイページを作成します。
            </p>
            <SubmitButton
              pendingText="確認中..."
              className="w-full rounded-full bg-[#4F7D62] px-5 py-2 text-sm text-white hover:bg-[#3E644F]"
            >
              確認してログイン
            </SubmitButton>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#5B6C60]">
              このリンクは使えません。有効期限（30分）が切れたか、すでに確認済みです。
            </p>
            <Link href="/me" className="text-sm text-[#4F7D62] hover:underline">
              マイページへ
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
