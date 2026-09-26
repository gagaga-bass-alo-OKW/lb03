"use client";

import { useActionState } from "react";
import { resetPasswordAction, type FormState } from "../actions";

const inputClass = "w-full rounded-lg border bg-white px-3 py-2";

export default function ResetPasswordForm({ token, name }: { token: string; name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    resetPasswordAction,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-[#5B6C60]">「{name}」の新しいパスワードを設定します。</p>

      <label className="block text-sm">
        新しいパスワード（8文字以上）
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>
      <label className="block text-sm">
        新しいパスワード（確認）
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>

      {state.error && <p className="text-sm text-[#B5483B]">{state.error}</p>}

      <button
        disabled={pending}
        className="w-full rounded-full bg-[#4F7D62] px-5 py-2 text-sm text-white hover:bg-[#3E644F] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "設定中..." : "設定してログイン"}
      </button>
    </form>
  );
}
