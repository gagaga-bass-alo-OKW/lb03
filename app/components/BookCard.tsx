import Link from "next/link";
import { Book } from "@/types/book";

type Props = {
  book: Book;
};

export default function BookCard({ book }: Props) {
  return (
  <Link href={`/books/${book.id}`}>
    <div className="border rounded-lg p-4 mb-4 hover:bg-gray-100 cursor-pointer">
      <h2 className="text-xl font-bold">
        {book.title}
      </h2>

      <p>著者: {book.author}</p>

      <p>所有者: {book.owner}</p>

      <p>カテゴリー: {book.category}</p>

      {book.reason && (
        <p>所有理由: {book.reason}</p>
      )}
    </div>
  </Link>
);
}