"use client";

import { useActionState } from "react";
import type { Book } from "@/lib/books";
import { CATEGORIES } from "@/lib/categories";
import { updateBookAction, type FormState } from "@/app/me/actions";

const inputClass = "w-full rounded-lg border bg-white px-3 py-2";

export default function EditBookForm({ book }: { book: Book }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateBookAction,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="bookId" value={book.id} />

      <label className="block text-sm">
        タイトル
        <input name="title" required defaultValue={book.title} className={inputClass} />
      </label>

      <label className="block text-sm">
        著者
        <input name="author" defaultValue={book.author} className={inputClass} />
      </label>

      <label className="block text-sm">
        出版社（任意）
        <input name="publisher" defaultValue={book.publisher} className={inputClass} />
      </label>

      <label className="block text-sm">
        カテゴリー
        <select name="category" defaultValue={book.category} className={inputClass}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        所有理由（任意）
        <textarea name="reason" rows={3} defaultValue={book.reason} className={inputClass} />
      </label>

      <label className="block text-sm">
        説明
        <textarea
          name="description"
          rows={6}
          defaultValue={book.description}
          className={inputClass}
        />
      </label>

      {state.error && <p className="text-sm text-[#B5483B]">{state.error}</p>}

      <button
        disabled={pending}
        className="rounded-full bg-[#4F7D62] px-6 py-2 text-sm text-white hover:bg-[#3E644F] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
