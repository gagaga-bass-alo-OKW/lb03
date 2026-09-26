import Link from "next/link";
import { getBooks, type Book } from "@/lib/books";
import { getRequests, type BookRequest } from "@/lib/requests";
import { getSlackIdByName } from "@/lib/slackUsers";
import { daysOverdue, isOverdue, parseDueDate } from "@/lib/dueDate";
import { isSiteLocked } from "@/lib/siteAuth";
import SitePasswordForm from "@/app/components/SitePasswordForm";

type Props = {
  searchParams: Promise<{ name?: string }>;
};

// 表記ゆれ（全角半角・前後の空白・大文字小文字）を吸収して名前を比べる
const normalize = (s: string) =>
  s.normalize("NFKC").replace(/[​-‏﻿]/g, "").trim().toLowerCase();

export default async function MyPage({ searchParams }: Props) {
  if (await isSiteLocked()) {
    return (
      <main className="min-h-screen bg-[#F7F5F0] px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <SitePasswordForm />
        </div>
      </main>
    );
  }

  const { name = "" } = await searchParams;
  const myName = name.trim();

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-[#5B6C60] hover:underline">
          ← 一覧に戻る
        </Link>

        <h1 className="mt-4 mb-6 text-3xl font-semibold text-[#2F3E34]">
          マイページ
        </h1>

        {/* 名前を入れると ?name= 付きのURLになる（ブックマークしておけば次から入力不要） */}
        <form action="/me" className="mb-8 flex gap-2">
          <input
            type="text"
            name="name"
            defaultValue={myName}
            required
            placeholder="Slackの表示名（例：田中）"
            className="flex-1 rounded-lg border bg-white px-3 py-2"
          />
          <button
            type="submit"
            className="rounded-full bg-[#4F7D62] px-5 py-2 text-sm text-white hover:bg-[#3E644F]"
          >
            表示
          </button>
        </form>

        {myName ? (
          <MyPageContent name={myName} />
        ) : (
          <p className="text-sm text-[#8A948C]">
            本を登録したときの持ち主名、または貸出申請で入れた名前を入力してください。
            表示後のページをブックマークしておくと、次からすぐに開けます。
          </p>
        )}
      </div>
    </main>
  );
}

async function MyPageContent({ name }: { name: string }) {
  const [books, requests, mySlackId] = await Promise.all([
    getBooks(),
    getRequests(),
    getSlackIdByName(name).catch(() => null),
  ]);

  const me = normalize(name);
  const bookById = new Map(books.map((b) => [b.id, b]));

  const myBooks = books.filter((b) => normalize(b.owner) === me);
  const myBookIds = new Set(myBooks.map((b) => b.id));

  // 申請者・持ち主は名前か、申請時に解決できた Slack ID のどちらかで一致すれば自分とみなす
  const isMine = (r: BookRequest) =>
    normalize(r.requester) === me ||
    (!!mySlackId && r.requesterSlackId === mySlackId);
  const isToMe = (r: BookRequest) =>
    myBookIds.has(r.bookId) || (!!mySlackId && r.ownerSlackId === mySlackId);

  const borrowing = requests.filter((r) => isMine(r) && r.status === "approved");
  const myPending = requests.filter((r) => isMine(r) && r.status === "pending");
  const lentOut = requests.filter((r) => isToMe(r) && r.status === "approved");
  const incoming = requests.filter((r) => isToMe(r) && r.status === "pending");

  const lentBookIds = new Set(lentOut.map((r) => r.bookId));

  const nothing =
    myBooks.length + borrowing.length + myPending.length + incoming.length === 0;

  if (nothing) {
    return (
      <p className="text-center text-[#8A948C]">
        「{name}」に関係する本や申請は見つかりませんでした
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <Section title="借りている本" count={borrowing.length}>
        {borrowing.map((r) => (
          <RequestRow key={r.id} request={r} book={bookById.get(r.bookId)}>
            持ち主：{bookById.get(r.bookId)?.owner || "未設定"}
          </RequestRow>
        ))}
      </Section>

      <Section title="申請中（承認待ち）" count={myPending.length}>
        {myPending.map((r) => (
          <RequestRow key={r.id} request={r} book={bookById.get(r.bookId)}>
            持ち主：{bookById.get(r.bookId)?.owner || "未設定"}
          </RequestRow>
        ))}
      </Section>

      <Section
        title="自分の本に届いた申請"
        count={incoming.length}
        note="承認・却下は Slack に届いたリンクから行えます"
      >
        {incoming.map((r) => (
          <RequestRow key={r.id} request={r} book={bookById.get(r.bookId)}>
            申請者：{r.requester}
            {r.comment && `／${r.comment}`}
          </RequestRow>
        ))}
      </Section>

      <Section title="貸し出し中の自分の本" count={lentOut.length}>
        {lentOut.map((r) => (
          <RequestRow key={r.id} request={r} book={bookById.get(r.bookId)}>
            借りている人：{r.requester}
          </RequestRow>
        ))}
      </Section>

      <Section title="自分の本" count={myBooks.length}>
        {myBooks.map((b) => (
          <BookRow key={b.id} book={b} isLent={lentBookIds.has(b.id)} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  note,
  children,
}: {
  title: string;
  count: number;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-1 text-xl font-semibold text-[#2F3E34]">
        {title}（{count}）
      </h2>
      {note && <p className="mb-3 text-xs text-[#8A948C]">{note}</p>}
      {count === 0 ? (
        <p className="mt-3 text-sm text-[#8A948C]">ありません</p>
      ) : (
        <div className="mt-3 space-y-3">{children}</div>
      )}
    </section>
  );
}

function RequestRow({
  request,
  book,
  children,
}: {
  request: BookRequest;
  book?: Book;
  children: React.ReactNode;
}) {
  const due = parseDueDate(request.period);

  return (
    <Link
      href={`/books/${request.bookId}`}
      className="block rounded-xl border border-[#E0DED7] bg-white p-4 shadow-sm hover:shadow-md"
    >
      <p className="font-semibold text-[#2F3E34]">
        {book?.title || request.bookTitle}
        {isOverdue(request) && (
          <span className="ml-2 rounded-full bg-[#F8E3E0] px-2 py-0.5 text-xs font-normal text-[#B5483B]">
            延滞中（{daysOverdue(request.period)}日）
          </span>
        )}
      </p>
      <p className="mt-1 text-sm text-[#5B6C60]">{children}</p>
      <p className="mt-1 text-xs text-[#8A948C]">
        {due ? `返却予定日：${due}` : `希望期間：${request.period || "未指定"}`}
      </p>
    </Link>
  );
}

function BookRow({ book, isLent }: { book: Book; isLent: boolean }) {
  return (
    <Link
      href={`/books/${book.id}`}
      className="block rounded-xl border border-[#E0DED7] bg-white p-4 shadow-sm hover:shadow-md"
    >
      <p className="font-semibold text-[#2F3E34]">
        {book.title}
        {isLent && (
          <span className="ml-2 rounded-full bg-[#E8F1EC] px-2 py-0.5 text-xs font-normal text-[#4F7D62]">
            貸出中
          </span>
        )}
      </p>
      <p className="mt-1 text-sm text-[#5B6C60]">
        {book.author || "著者不明"}
        {book.category && `／${book.category}`}
      </p>
    </Link>
  );
}
