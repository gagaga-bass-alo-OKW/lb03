"use client";

import { useFormStatus } from "react-dom";

// フォーム送信中は押せなくし、必要なら送信前に確認を出すボタン
export default function SubmitButton({
  children,
  pendingText = "処理中...",
  confirmMessage,
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  confirmMessage?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(e) => {
        if (confirmMessage && !confirm(confirmMessage)) e.preventDefault();
      }}
      className={`disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
