import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookById } from "@/lib/books";
import { getRequestsByBookId } from "@/lib/requests";
import RequestForm from "./RequestForm";

type RequestPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RequestPage({ params }: RequestPageProps) {
  const { id } = await params;
  const book = await getBookById(id);

  if (!book) {
    notFound();
  }
  const requests = await getRequestsByBookId(id);

  const isBorrowed = requests.some((r) => r.status === "approved");

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/books/${book.id}`}
          className="text-blue-600 hover:underline"
        >
          ← 本の詳細に戻る
        </Link>

        <div className="mt-6 rounded-xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold text-gray-900">
            この本を借りたい
          </h1>

          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">申請する本</p>

            <p className="mt-1 text-lg font-bold text-gray-900">
              {book.title}
            </p>

            <p className="mt-1 text-sm text-gray-600">
              {book.author || "著者不明"}
            </p>
          </div>

          {isBorrowed ? (
            <div className="mt-6 rounded-lg border border-gray-200 bg-yellow-50 p-6 text-center">
              <p className="text-lg font-semibold text-gray-800">この本は現在貸出中です</p>
              <p className="mt-2 text-sm text-gray-600">貸出が返却されるまで申請できません。</p>
              <div className="mt-4">
                <Link
                  href={`/books/${book.id}`}
                  className="inline-block rounded-lg bg-[#4F7D62] px-4 py-2 text-sm font-medium text-white hover:bg-[#3E644F]"
                >
                  本の詳細に戻る
                </Link>
              </div>
            </div>
          ) : (
            <RequestForm bookId={book.id} bookTitle={book.title} />
          )}
        </div>
      </div>
    </main>
  );
}