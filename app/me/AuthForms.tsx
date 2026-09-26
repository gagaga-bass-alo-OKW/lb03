"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction, type FormState } from "./actions";

const inputClass = "w-full rounded-lg border bg-white px-3 py-2";
const buttonClass =
  "w-full rounded-full bg-[#4F7D62] px-5 py-2 text-sm text-white hover:bg-[#3E644F] disabled:cursor-not-allowed disabled:opacity-50";

export default function AuthForms() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, login, loggingIn] = useActionState<FormState, FormData>(loginAction, {});
  const [registerState, register, registering] = useActionState<FormState, FormData>(
    registerAction,
    {}
  );

  return (
    <div className="mx-auto max-w-md rounded-xl border border-[#E0DED7] bg-white p-6 shadow-sm">
      <div className="mb-6 flex gap-2">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full px-4 py-1 text-sm ${
              mode === m ? "bg-[#4F7D62] text-white" : "bg-[#E0DED7] text-[#2F3E34]"
            }`}
          >
            {m === "login" ? "ログイン" : "マイページを作成"}
          </button>
        ))}
      </div>

      {mode === "login" ? (
        <form action={login} className="space-y-4">
          <label className="block text-sm">
            名前
            <input name="name" required autoComplete="username" className={inputClass} />
          </label>
          <label className="block text-sm">
            パスワード
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </label>
          {loginState.error && <p className="text-sm text-[#B5483B]">{loginState.error}</p>}
          <button disabled={loggingIn} className={buttonClass}>
            {loggingIn ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      ) : (
        <form action={register} className="space-y-4">
          <p className="text-xs text-[#8A948C]">
            名前は本を登録したときの「持ち主」と同じ Slack の表示名にしてください。
            その名前の本と、届いた申請を管理できるようになります。
          </p>
          <label className="block text-sm">
            名前（Slackの表示名）
            <input name="name" required autoComplete="username" className={inputClass} />
          </label>
          <label className="block text-sm">
            パスワード（8文字以上）
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
            パスワード（確認）
            <input
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          {registerState.error && (
            <p className="text-sm text-[#B5483B]">{registerState.error}</p>
          )}
          <button disabled={registering} className={buttonClass}>
            {registering ? "作成中..." : "マイページを作成"}
          </button>
        </form>
      )}
    </div>
  );
}
