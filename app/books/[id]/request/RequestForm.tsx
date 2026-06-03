"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RequestFormProps = {
  bookId: string;
  bookTitle: string;
};

export default function RequestForm({ bookId, bookTitle }: RequestFormProps) {
  const router = useRouter();

  const [requester, setRequester] = useState("");
  const [requesterSlackId, setRequesterSlackId] = useState("");
  const [requesterPassword, setRequesterPassword] = useState("");
  const [period, setPeriod] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId,
          bookTitle,
          requester,
          requesterSlackId,
          requesterPassword,
          period,
          comment,
        }),
      });

      if (!response.ok) {
        alert("申請の保存に失敗しました");
        return;
      }

      router.push(`/books/${bookId}/request/success`);
router.refresh();
    } catch (error) {
      console.error(error);
      alert("通信エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          借りたい人
        </label>
        <input
          type="text"
          value={requester}
          onChange={(event) => setRequester(event.target.value)}
          required
          placeholder="例：Kanato"
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Slack ID（任意）
        </label>
        <input
          type="text"
          value={requesterSlackId}
          onChange={(event) => setRequesterSlackId(event.target.value)}
          placeholder="例：U123ABCDEF"
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Slack パスワード（共有アカウント用・任意）
        </label>
        <input
          type="password"
          value={requesterPassword}
          onChange={(event) => setRequesterPassword(event.target.value)}
          placeholder="共有アカウントのパスワード"
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          希望期間
        </label>
        <input
          type="text"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          placeholder="例：2週間くらい"
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          コメント
        </label>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          placeholder="例：読み終わったらすぐ返します！"
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isSubmitting ? "送信中..." : "申請する"}
      </button>
    </form>
  );
}