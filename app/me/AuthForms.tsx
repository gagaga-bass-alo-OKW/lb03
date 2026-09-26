"use client";

import { useActionState, useState } from "react";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  type FormState,
} from "./actions";

const inputClass = "w-full rounded-lg border bg-white px-3 py-2";
const buttonClass =
  "w-full rounded-full bg-[#4F7D62] px-5 py-2 text-sm text-white hover:bg-[#3E644F] disabled:cursor-not-allowed disabled:opacity-50";

type Mode = "login" | "register" | "forgot";

function Result({ state }: { state: FormState }) {
  if (state.error) return <p className="text-sm text-[#B5483B]">{state.error}</p>;
  if (state.message) {
    return (
      <p className="rounded-lg bg-[#E8F1EC] p-3 text-sm text-[#4F7D62]">{state.message}</p>
    );
  }
  return null;
}

export default function AuthForms() {
  const [mode, setMode] = useState<Mode>("login");
  const [loginState, login, loggingIn] = useActionState<FormState, FormData>(loginAction, {});
  const [registerState, register, registering] = useActionState<FormState, FormData>(
    registerAction,
    {}
  );
  const [forgotState, forgot, sendingReset] = useActionState<FormState, FormData>(
    forgotPasswordAction,
    {}
  );

  return (
    <div className="mx-auto max-w-md rounded-xl border border-[#E0DED7] bg-white p-6 shadow-sm">
      {mode !== "forgot" && (
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
      )}

      {mode === "login" && (
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
          <Result state={loginState} />
          <button disabled={loggingIn} className={buttonClass}>
            {loggingIn ? "ログイン中..." : "ログイン"}
          </button>
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="block w-full text-center text-xs text-[#5B6C60] hover:underline"
          >
            パスワードを忘れた
          </button>
        </form>
      )}

      {mode === "register" && (
        <form action={register} className="space-y-4">
          <p className="text-xs text-[#8A948C]">
            名前は本を登録したときの「持ち主」と同じ Slack の表示名にしてください。
            本人の Slack に確認リンクを DM で送り、開いたら作成完了です。
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
          <Result state={registerState} />
          <button disabled={registering} className={buttonClass}>
            {registering ? "送信中..." : "Slack に確認リンクを送る"}
          </button>
        </form>
      )}

      {mode === "forgot" && (
        <form action={forgot} className="space-y-4">
          <h2 className="text-lg font-semibold text-[#2F3E34]">パスワードの再設定</h2>
          <p className="text-xs text-[#8A948C]">
            名前を入れると、本人の Slack に再設定リンクを DM で送ります。
          </p>
          <label className="block text-sm">
            名前
            <input name="name" required autoComplete="username" className={inputClass} />
          </label>
          <Result state={forgotState} />
          <button disabled={sendingReset} className={buttonClass}>
            {sendingReset ? "送信中..." : "再設定リンクを送る"}
          </button>
          <button
            type="button"
            onClick={() => setMode("login")}
            className="block w-full text-center text-xs text-[#5B6C60] hover:underline"
          >
            ← ログインに戻る
          </button>
        </form>
      )}
    </div>
  );
}
