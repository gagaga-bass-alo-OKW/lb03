import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookById } from "@/lib/books";

type RequestSuccessPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RequestSuccessPage({
  params,
}: RequestSuccessPageProps) {
  const { id } = await params;
  const book = await getBookById(id);

  if (!book) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl bg-white p-8 text-center shadow">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✓
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            貸出申請を受け付けました
          </h1>

          <p className="mt-4 text-gray-600">
            「{book.title}」への貸出申請を保存しました。
          </p>

          <p className="mt-2 text-gray-600">
            本の持ち主に確認して、受け渡し方法を相談しましょう。
          </p>

          <div className="mt-8 rounded-lg bg-gray-50 p-4 text-left">
            <p className="text-sm text-gray-500">申請した本</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {book.title}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {book.author || "著者不明"}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              持ち主：{book.owner || "未設定"}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/books/${book.id}`}
              className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
            >
              本の詳細に戻る
            </Link>

            <Link
              href="/"
              className="rounded-lg border border-gray-300 px-5 py-3 font-bold text-gray-700 hover:bg-gray-50"
            >
              一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}