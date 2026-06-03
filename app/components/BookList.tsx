"use client";

import { useState } from "react";
import Link from "next/link";

type Book = {
  id: string;
  title: string;
  author?: string;
  category?: string;
  owner?: string;
  image?: string | null;
  isBorrowed: boolean;
};

export default function BookList({ books }: { books: Book[] }) {
  const [filter, setFilter] = useState<"all" | "borrowed">("all");

  // ✅ 追加
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");

  // ✅ owner一覧作成
  const owners = Array.from(
    new Set(books.map((b) => b.owner).filter(Boolean))
  );

  // ✅ フィルタ統合
  const filteredBooks = books
    // 貸出フィルター
    .filter((book) =>
      filter === "all" ? true : book.isBorrowed
    )

    // 所有者フィルター
    .filter((book) =>
      ownerFilter === "all"
        ? true
        : book.owner === ownerFilter
    )

    // 検索（タイトル＋著者）
    .filter((book) =>
      (book.title + (book.author || ""))
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  return (
    <>
      {/* ✅ 検索 */}
      <input
        type="text"
        placeholder="本の名前で検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-lg border px-3 py-2"
      />

      {/* ✅ 所有者フィルター */}
      <select
        value={ownerFilter}
        onChange={(e) => setOwnerFilter(e.target.value)}
        className="mb-4 rounded-lg border px-3 py-2"
      >
        <option value="all">全ての所有者</option>

        {owners.map((owner) => (
          <option key={owner} value={owner}>
            {owner}
          </option>
        ))}
      </select>

      {/* ✅ 元のフィルター */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1 text-sm ${
            filter === "all"
              ? "bg-[#4F7D62] text-white"
              : "bg-[#E0DED7] text-[#2F3E34]"
          }`}
        >
          すべて
        </button>

        <button
          onClick={() => setFilter("borrowed")}
          className={`rounded-full px-4 py-1 text-sm ${
            filter === "borrowed"
              ? "bg-[#4F7D62] text-white"
              : "bg-[#E0DED7] text-[#2F3E34]"
          }`}
        >
          貸出中
        </button>
      </div>

      {/* ✅ 本一覧 */}
      <div className="space-y-4">
        {filteredBooks.map((book) => (
          <Link key={book.id} href={`/books/${book.id}`} className="block">
            <div
              className={`flex gap-4 rounded-xl border bg-white p-5 shadow-sm hover:shadow-md ${
                book.isBorrowed
                  ? "border-[#CFE2D8]"
                  : "border-[#E0DED7]"
              }`}
            >
              {/* 画像 */}
              <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-md bg-[#E0DED7]">
                {book.image ? (
                  <img
                    src={book.image}
                    alt={book.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[#8A948C]">
                    no image
                  </div>
                )}
              </div>

              {/* テキスト */}
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-[#2F3E34] flex items-center">
                  {book.title}

                  {book.isBorrowed && (
                    <span className="ml-2 rounded-full bg-[#E8F1EC] px-2 py-0.5 text-xs text-[#4F7D62]">
                      貸出中
                    </span>
                  )}
                </h2>

                <p className="mt-1 text-sm text-[#5B6C60]">
                  {book.author || "著者不明"}
                </p>

                <p className="mt-2 text-xs text-[#8A948C]">
                  持ち主：{book.owner || "未設定"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ✅ 空状態 */}
      {filteredBooks.length === 0 && (
        <p className="mt-6 text-center text-[#8A948C]">
          該当する本がありません
        </p>
      )}
    </>
  );
}