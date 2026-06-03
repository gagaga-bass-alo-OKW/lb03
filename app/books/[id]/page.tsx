import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookById } from "@/lib/books";
import { getRequestsByBookId } from "@/lib/requests";
import RequestStatusButtons from "./RequestStatusButtons";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "承認済み";
    case "rejected":
      return "却下";
    case "returned":
      return "返却済み";
    default:
      return "申請中";
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "approved":
      return "bg-[#E8F1EC] text-[#4F7D62]";
    case "rejected":
      return "bg-[#F5EDE7] text-[#C98C5A]";
    case "returned":
      return "bg-[#E7EEF2] text-[#5E7A8A]";
    default:
      return "bg-[#F3F4EC] text-[#7C8B78]";
  }
}

function getCardStyle(status: string) {
  switch (status) {
    case "approved":
      return "border-[#CFE2D8]";
    case "rejected":
      return "border-[#E6D4C3]";
    case "returned":
      return "border-[#D6E1E7]";
    default:
      return "border-[#E0DED7]";
  }
}

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;

  const book = await getBookById(id);
  if (!book) return notFound();

  const requests = await getRequestsByBookId(id);

  const isBorrowed = requests.some((r) => r.status === "approved");

  const hasValidToken = requests.some((r) => r.token === token);

  const sortedRequests = [...requests].sort((a, b) => {
    const order: Record<string, number> = {
      approved: 0,
      pending: 1,
      rejected: 2,
      returned: 3,
    };
    return (order[a.status] ?? 99) - (order[b.status] ?? 99);
  });

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10">
      <div className="mx-auto max-w-2xl">

        {/* 戻る */}
        <Link href="/" className="text-[#5B6C60] hover:underline">
          ← 一覧に戻る
        </Link>

        {/* 本情報 */}
        <div className="mt-6 rounded-xl border border-[#E0DED7] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#8A948C]">
            {book.category || "未分類"}
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-[#2F3E34]">
            {book.title}
          </h1>

          <p className="mt-1 text-[#5B6C60]">
            {book.author || "著者不明"}
          </p>

          <div className="mt-4 space-y-2 text-sm text-[#5B6C60]">
            <p>出版社：{book.publisher || "未設定"}</p>
            <p>ISBN：{book.isbn || "未設定"}</p>
            <p>持ち主：{book.owner || "未設定"}</p>
          </div>

          {/* 理由 */}
          <div className="mt-5 rounded-lg bg-[#F3F4EC] p-4 text-sm text-[#4A554F]">
            {book.reason || "理由はまだ登録されていません。"}
          </div>

          {/* ボタン */}
          {isBorrowed ? (
            <button
              disabled
              className="mt-5 inline-block rounded-full bg-gray-400 px-5 py-2 text-sm font-medium text-white cursor-not-allowed"
            >
              貸出中
            </button>
          ) : (
            <Link
              href={`/books/${book.id}/request`}
              className="mt-5 inline-block rounded-full bg-[#4F7D62] px-5 py-2 text-sm font-medium text-white hover:bg-[#3E644F]"
            >
              この本を借りたい
            </Link>
          )}
        </div>

        {/* 申請一覧 */}
        <h2 className="mt-10 mb-4 text-xl font-semibold text-[#2F3E34]">
          貸出申請
        </h2>

        <div className="space-y-4">
          {sortedRequests.map((request) => (
            <div
              key={request.id}
              className={`rounded-xl border bg-white p-5 shadow-sm ${getCardStyle(
                request.status
              )}`}
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold text-[#2F3E34]">
                    {request.requester}
                  </p>

                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs ${getStatusStyle(
                      request.status
                    )}`}
                  >
                    {getStatusLabel(request.status)}
                  </span>

                  <p className="mt-2 text-sm text-[#5B6C60]">
                    希望期間：{request.period || "未指定"}
                  </p>
                </div>

                <p className="text-xs text-[#8A948C]">
                  {new Date(request.createdAt).toLocaleDateString("ja-JP")}
                </p>
              </div>

              {request.comment && (
                <p className="mt-3 text-sm text-[#4A554F]">
                  {request.comment}
                </p>
              )}

              {hasValidToken && (
                <div className="mt-4">
                  <RequestStatusButtons
                    requestId={request.id}
                    currentStatus={request.status}
                    token={token || ""}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}