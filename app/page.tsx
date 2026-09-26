import Link from "next/link";
import { getBooks } from "@/lib/books";
import { getRequests } from "@/lib/requests";
import { getBookImageByIsbn } from "@/lib/googleBooks";
import BookList from "@/app/components/BookList";
import SitePasswordForm from "@/app/components/SitePasswordForm";
import { CATEGORIES } from "@/lib/categories";
import { isOverdue } from "@/lib/dueDate";
import { isSiteLocked } from "@/lib/siteAuth";

const PAGE_SIZE = 10;

const SORTS = [
  { key: "borrowed", label: "貸出中を先頭" },
  { key: "new", label: "新着順" },
  { key: "title", label: "タイトル順" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

type Props = {
  searchParams: Promise<{ page?: string; category?: string; sort?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const { page: pageParam, category, sort } = await searchParams;
  const selectedCategory = category ?? "";
  const selectedSort: SortKey =
    SORTS.find((s) => s.key === sort)?.key ?? "borrowed";
  const currentPage = Math.max(1, Number(pageParam) || 1);

  // If a site password is configured and the cookie doesn't match, show password form
  if (await isSiteLocked()) {
    return (
      <main className="min-h-screen bg-[#F7F5F0] px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <SitePasswordForm />
        </div>
      </main>
    );
  }
  const books = await getBooks();
  const requests = await getRequests();

  // 本ごとに貸出状態を付与
  const booksWithStatus = books.map((book) => ({
    ...book,
    isBorrowed: requests.some(
      (r) => r.bookId === book.id && r.status === "approved"
    ),
    isOverdue: requests.some((r) => r.bookId === book.id && isOverdue(r)),
  }));

  const sortedBooks = [...booksWithStatus].sort((a, b) => {
    switch (selectedSort) {
      case "new":
        return b.createdAt.localeCompare(a.createdAt);
      case "title":
        return a.title.localeCompare(b.title, "ja");
      default:
        // 貸出中を上に並べる
        if (a.isBorrowed === b.isBorrowed) return 0;
        return a.isBorrowed ? -1 : 1;
    }
  });

  // カテゴリーの選択肢（登録済みデータにしかないカテゴリーも出す）
  const categories = [
    ...CATEGORIES,
    ...new Set(
      books
        .map((b) => b.category)
        .filter(
          (c) => c && !(CATEGORIES as readonly string[]).includes(c)
        )
    ),
  ];
  const countByCategory = (c: string) =>
    books.filter((b) => b.category === c).length;

  // カテゴリーで絞り込み（ページ分割より前に行う）
  const filteredBooks = selectedCategory
    ? sortedBooks.filter((b) => b.category === selectedCategory)
    : sortedBooks;

  // 今のカテゴリー・並び順を保ったままURLを作る
  const listHref = ({
    category = selectedCategory,
    sort = selectedSort,
    page = 1,
  }: { category?: string; sort?: SortKey; page?: number }) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (sort !== "borrowed") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/?${query}` : "/";
  };

  // ページ分割してから、表示するページの分だけ画像を取得する
  // （全件まとめて画像取得すると本が増えるほど表示が遅くなるため）
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedBooks = filteredBooks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const pagedBooksWithImages = await Promise.all(
    pagedBooks.map(async (book) => ({
      ...book,
      image: await getBookImageByIsbn(book.isbn),
    }))
  );

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10">
      <div className="mx-auto max-w-3xl">

        <h1 className="mb-2 text-3xl font-semibold text-[#2F3E34]">
          本の一覧
        </h1>

        <p className="mb-6 text-sm text-[#8A948C]">
          コミュニティで本を共有しよう
        </p>

        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/books/new"
            className="inline-block rounded-full bg-[#4F7D62] px-5 py-2 text-sm text-white hover:bg-[#3E644F]"
          >
            ＋ 本を追加する
          </Link>

          <Link
            href="/me"
            className="inline-block rounded-full border border-[#4F7D62] px-5 py-2 text-sm text-[#4F7D62] hover:bg-[#E8F1EC]"
          >
            マイページ
          </Link>
        </div>

        {/* カテゴリー別 */}
        <nav className="mb-6 flex flex-wrap gap-2">
          <Link
            href={listHref({ category: "" })}
            className={`rounded-full px-4 py-1 text-sm ${
              !selectedCategory
                ? "bg-[#4F7D62] text-white"
                : "bg-[#E0DED7] text-[#2F3E34] hover:bg-[#D3D0C7]"
            }`}
          >
            すべて（{books.length}）
          </Link>

          {categories.map((c) => (
            <Link
              key={c}
              href={listHref({ category: c })}
              className={`rounded-full px-4 py-1 text-sm ${
                selectedCategory === c
                  ? "bg-[#4F7D62] text-white"
                  : "bg-[#E0DED7] text-[#2F3E34] hover:bg-[#D3D0C7]"
              }`}
            >
              {c}（{countByCategory(c)}）
            </Link>
          ))}
        </nav>

        {/* 並び順 */}
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-[#8A948C]">並び順：</span>
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={listHref({ sort: s.key })}
              className={
                selectedSort === s.key
                  ? "font-semibold text-[#4F7D62] underline underline-offset-4"
                  : "text-[#5B6C60] hover:underline"
              }
            >
              {s.label}
            </Link>
          ))}
        </div>

        {/* ✅ フィルター付き一覧 */}
        <BookList books={pagedBooksWithImages} />

        {books.length === 0 ? (
          <p className="mt-10 text-center text-[#8A948C]">
            まだ本が登録されていません
          </p>
        ) : (
          filteredBooks.length === 0 && (
            <p className="mt-10 text-center text-[#8A948C]">
              このカテゴリーの本はまだありません
            </p>
          )
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Link
              href={listHref({ page: Math.max(1, safePage - 1) })}
              aria-disabled={safePage === 1}
              className={`rounded-full px-4 py-1 text-sm ${
                safePage === 1
                  ? "pointer-events-none bg-[#E0DED7] text-[#B8BCB2]"
                  : "bg-[#E0DED7] text-[#2F3E34] hover:bg-[#D3D0C7]"
              }`}
            >
              ← 前へ
            </Link>

            <span className="text-sm text-[#5B6C60]">
              {safePage} / {totalPages}
            </span>

            <Link
              href={listHref({ page: Math.min(totalPages, safePage + 1) })}
              aria-disabled={safePage === totalPages}
              className={`rounded-full px-4 py-1 text-sm ${
                safePage === totalPages
                  ? "pointer-events-none bg-[#E0DED7] text-[#B8BCB2]"
                  : "bg-[#E0DED7] text-[#2F3E34] hover:bg-[#D3D0C7]"
              }`}
            >
              次へ →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}