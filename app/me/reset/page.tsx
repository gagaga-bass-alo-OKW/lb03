import Link from "next/link";
import { findAccountByToken } from "@/lib/accounts";
import ResetPasswordForm from "./ResetPasswordForm";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

// Slack の DM の再設定リンクから開くページ
export default async function ResetPage({ searchParams }: Props) {
  const { token = "" } = await searchParams;
  const account = await findAccountByToken(token, "reset");

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10">
      <div className="mx-auto max-w-md rounded-xl border border-[#E0DED7] bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-center text-2xl font-semibold text-[#2F3E34]">
          パスワードの再設定
        </h1>

        {account ? (
          <ResetPasswordForm token={token} name={account.name} />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-[#5B6C60]">
              このリンクは使えません。有効期限（30分）が切れたか、すでに使われています。
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
