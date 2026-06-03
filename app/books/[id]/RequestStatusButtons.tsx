"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RequestStatusButtonsProps = {
  requestId: string;
  currentStatus: string;
  token: string;
};

export default function RequestStatusButtons({
  requestId,
  currentStatus,
  token,
}: RequestStatusButtonsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  async function updateStatus(status: "approved" | "rejected" | "returned") {
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          token, // ✅ propsからそのまま使う
        }),
      });

      if (!response.ok) {
        alert("ステータス更新に失敗しました");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("通信エラーが発生しました");
    } finally {
      setIsUpdating(false);
    }
  }

  if (currentStatus === "approved") {
    return (
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => updateStatus("returned")}
        className="mt-4 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
      >
        返却済みにする
      </button>
    );
  }

  if (currentStatus !== "pending") {
    return null;
  }

  return (
    <div className="mt-4 flex gap-2">
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => updateStatus("approved")}
        className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:bg-gray-400"
      >
        承認する
      </button>

      <button
        type="button"
        disabled={isUpdating}
        onClick={() => updateStatus("rejected")}
        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:bg-gray-400"
      >
        却下する
      </button>
    </div>
  );
}