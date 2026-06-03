"use client";

import { useState } from "react";

export default function SitePasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        location.reload();
        return;
      }

      const json = await res.json();
      setError(json?.error || "認証に失敗しました");
    } catch (e) {
      setError("通信エラー");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md">
      <div className="rounded-xl bg-white p-8 shadow text-center">
        <h2 className="mb-4 text-2xl font-semibold">閲覧パスワード</h2>
        <p className="mb-4 text-sm text-gray-600">本棚を表示するには共通のパスワードを入力してください。</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2"
        />

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "確認中..." : "パスワードを送信"}
        </button>
      </div>
    </form>
  );
}
