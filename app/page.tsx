import Link from "next/link";
import { cookies } from "next/headers";
import { getBooks } from "@/lib/books";
import { getRequests } from "@/lib/requests";
import { getBookImageByIsbn } from "@/lib/googleBooks";
import BookList from "@/app/components/BookList";
import SitePasswordForm from "@/app/components/SitePasswordForm";

export default async function Page() {
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

  // 本ごとに状態付与
  const booksWithData = await Promise.all(
    books.map(async (book) => {
      const image = null;
      const isBorrowed = requests.some(
        (r) => r.bookId === book.id && r.status === "approved"
      );

      return { ...book, image, isBorrowed };
    })
  );

  // 貸出中を上に並べる
  const sortedBooks = [...booksWithData].sort((a, b) => {
    if (a.isBorrowed === b.isBorrowed) return 0;
    return a.isBorrowed ? -1 : 1;
  });

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

        {/* ✅ フィルター付き一覧 */}
        <BookList books={sortedBooks} />

        {books.length === 0 && (
          <p className="mt-10 text-center text-[#8A948C]">
            まだ本が登録されていません
          </p>
        )}
      </div>
    </main>
  );
}