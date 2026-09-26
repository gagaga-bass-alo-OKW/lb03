"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import BarcodeScanner from "./BarcodeScanner";

export default function NewBookPage() {
  const router = useRouter();

  const [isbn, setIsbn] = useState("");
  const [bookInfo, setBookInfo] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [category, setCategory] = useState("教養");
  const [reason, setReason] = useState("");
  const [owner, setOwner] = useState("");
  const [description, setDescription] =useState("");

  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // ✅ ISBNからGoogle Books API取得
  const fetchBookInfo = async (isbn: string) => {
    if (isFetching) return;
    setIsFetching(true);
    try {
      console.log(
        "APIKEY =",
        process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
      );

      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`;

      console.log("URL =", url);

      const res = await fetch(url);

      // ✅ API失敗時
      if (!res.ok) {
        console.error("API ERROR:", res.status);
        alert("書籍取得失敗");
        return;
      }

      const data = await res.json();

      console.log("DATA =", data);

      // ✅ 本が見つからない
      if (!data.items || data.items.length === 0) {
        alert("本が見つかりません");
        return;
      }

      const volumeInfo = data.items[0].volumeInfo;

      // ✅ 表示用
      setBookInfo(data);

      // ✅ 自動入力
      setTitle(volumeInfo.title || "");
      setAuthor(volumeInfo.authors?.join(", ") || "");
      setPublisher(volumeInfo.publisher || "");
      console.log("DESCRIPTION =", volumeInfo.description);
      setDescription(volumeInfo.description || "");

    } catch (error) {
      console.error("FETCH ERROR =", error);
      alert("取得失敗");
    } finally {
      setIsFetching(false);
    }
  };

  // ✅ バーコード読み取り → ISBN入力 & 自動取得
  const handleDetected = useCallback((code: string) => {
    setIsScanning(false);
    setIsbn(code);
    fetchBookInfo(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="p-8">
      <Link href="/" className="text-[#5B6C60] hover:underline">
        ← 一覧に戻る
      </Link>

      <h1 className="mt-4 text-3xl font-bold mb-6">
        蔵書登録
      </h1>

      <div className="space-y-4 max-w-xl">

        {/* ISBN */}
        <div>
          <label className="block mb-1">
            ISBN（番号が二つ存在する場合は上の方）
          </label>

          <input
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            onKeyDown={(e) => {
              // バーコードリーダーは読み取り後にEnterを送る
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                fetchBookInfo(isbn);
              }
            }}
            className="border rounded px-3 py-2 w-full"
            placeholder="978xxxxxxxxxxxx"
          />
        </div>

        {/* 取得ボタン */}
        <div className="flex gap-2">
          <button
            onClick={() => fetchBookInfo(isbn)}
            disabled={isFetching}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFetching ? "取得中..." : "書籍情報を取得"}
          </button>

          <button
            type="button"
            onClick={() => setIsScanning((v) => !v)}
            disabled={isFetching}
            className="border border-blue-600 text-blue-600 px-4 py-2 rounded disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isScanning ? "読み取りを中止" : "バーコードで読み取る"}
          </button>
        </div>

        {isScanning && (
          <BarcodeScanner
            onDetected={handleDetected}
            onClose={() => setIsScanning(false)}
          />
        )}

        {/* 取得結果 */}
        {bookInfo && bookInfo.items?.[0] && (
          <div className="mt-6 border rounded p-4 space-y-2">
            <h2 className="text-xl font-bold">取得結果</h2>

            <p>
              タイトル：
              {bookInfo.items[0].volumeInfo.title}
            </p>

            <p>
              著者：
              {bookInfo.items[0].volumeInfo.authors?.join(", ")}
            </p>

            <p>
              出版社：
              {bookInfo.items[0].volumeInfo.publisher}
            </p>

            {bookInfo.items[0].volumeInfo.imageLinks?.thumbnail && (
              <img
                src={bookInfo.items[0].volumeInfo.imageLinks.thumbnail}
                alt="book cover"
              />
            )}
          </div>
        )}

        {/* 登録フォーム */}
        {bookInfo && (
          <div className="mt-8 border rounded p-4 space-y-4">
            <h2 className="text-xl font-bold">登録情報</h2>

            <div>
              <label className="block mb-1">タイトル</label>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>

            <div>
              <label className="block mb-1">著者</label>

              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>

            <div>
              <label className="block mb-1">
                出版社（任意）
              </label>

              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>

            <div>
              <label className="block mb-1">カテゴリー</label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              >
                <option>教養</option>
                <option>専門書</option>
                <option>小説</option>
                <option>受験参考書</option>
                <option>漫画</option>
                <option>その他</option>
              </select>
            </div>

            <div>
              <label className="block mb-1">
                所有者(必須・slackの表示名)・あるいは図書館の本の紹介
              </label>

              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                placeholder="例：田中"
              />
            </div>

            <div>
              <label className="block mb-1">
                所有理由(任意)
              </label>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="border rounded px-3 py-2 w-full"
              />
            </div>

            {/* 登録ボタン */}
            <button
              onClick={async () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  const response = await fetch("/api/books", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      isbn,
                      title,
                      author,
                      publisher,
                      category,
                      reason,
                      owner,
                      description,
                    }),
                  });

                  if (response.ok) {
                    router.push("/");
                    router.refresh();
                  } else {
                    alert("登録失敗");
                    setIsSubmitting(false);
                  }

                } catch (error) {
                  console.error(error);
                  alert("登録失敗");
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="bg-green-600 text-white px-4 py-2 rounded disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "登録中..." : "登録"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
