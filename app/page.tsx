import Link from "next/link";
import { cookies } from "next/headers";
import { getBooks } from "@/lib/books";
import { getRequests } from "@/lib/requests";
import { getBookImageByIsbn } from "@/lib/googleBooks";
import BookList from "@/app/components/BookList";
import SitePasswordForm from "@/app/components/SitePasswordForm";
import { CATEGORIES } from "@/lib/categories";

const PAGE_SIZE = 10;

type Props = {
  searchParams: Promise<{ page?: string; category?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const { page: pageParam, category } = await searchParams;
  const selectedCategory = category ?? "";
  const currentPage = Math.max(1, Number(pageParam) || 1);

  const cookieStore = await cookies();
  const siteAuth = cookieStore.get("site_auth")?.value ?? null;
  const siteHash = process.env.SHARED_SITE_PASSWORD_HASH ?? null;

  // If a site password is configured and the cookie doesn't match, show password form
  if (siteHash && siteAuth !== siteHash) {
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
  }));

  // 貸出中を上に並べる
  const sortedBooks = [...booksWithStatus].sort((a, b) => {
    if (a.isBorrowed === b.isBorrowed) return 0;
    return a.isBorrowed ? -1 : 1;
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

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
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

        <Link
          href="/books/new"
          className="mb-6 inline-block rounded-full bg-[#4F7D62] px-5 py-2 text-sm text-white hover:bg-[#3E644F]"
        >
          ＋ 本を追加する
        </Link>

        {/* カテゴリー別 */}
        <nav className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/"
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
              href={`/?category=${encodeURIComponent(c)}`}
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
              href={pageHref(Math.max(1, safePage - 1))}
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
              href={pageHref(Math.min(totalPages, safePage + 1))}
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