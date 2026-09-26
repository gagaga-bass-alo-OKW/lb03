import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookById } from "@/lib/books";
import { isSameName } from "@/lib/names";
import { getSessionName } from "@/lib/session";
import EditBookForm from "./EditBookForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditBookPage({ params }: Props) {
  const { id } = await params;

  const book = await getBookById(id);
  if (!book) return notFound();

  const me = await getSessionName();
  const canEdit = !!me && isSameName(book.owner, me);

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Link href="/me" className="text-[#5B6C60] hover:underline">
          ← マイページに戻る
        </Link>

        <h1 className="mt-4 mb-6 text-3xl font-semibold text-[#2F3E34]">本の編集</h1>

        {canEdit ? (
          <EditBookForm book={book} />
        ) : (
          <p className="text-[#8A948C]">
            {me
              ? "自分の本だけ編集できます。"
              : "編集するにはマイページからログインしてください。"}
          </p>
        )}
      </div>
    </main>
  );
}
