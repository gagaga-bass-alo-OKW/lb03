import Link from "next/link";
import { getBooks, type Book } from "@/lib/books";
import { getRequests, type BookRequest } from "@/lib/requests";
import { getSlackIdByName } from "@/lib/slackUsers";
import { daysOverdue, isOverdue, parseDueDate } from "@/lib/dueDate";
import { isSameName } from "@/lib/names";
import { getSessionName } from "@/lib/session";
import { isSiteLocked } from "@/lib/siteAuth";
import SitePasswordForm from "@/app/components/SitePasswordForm";
import AuthForms from "./AuthForms";
import SubmitButton from "./SubmitButton";
import { deleteBookAction, logoutAction, setRequestStatusAction } from "./actions";

export default async function MyPage() {
  if (await isSiteLocked()) {
    return (
      <main className="min-h-screen bg-[#F7F5F0] px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <SitePasswordForm />
        </div>
      </main>
    );
  }

  const name = await getSessionName();

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-[#5B6C60] hover:underline">
          ← 一覧に戻る
        </Link>

        <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-semibold text-[#2F3E34]">マイページ</h1>

          {name && (
            <form action={logoutAction} className="flex items-center gap-3 text-sm">
              <span className="text-[#5B6C60]">{name} さん</span>
              <SubmitButton
                pendingText="ログアウト中..."
                className="rounded-full bg-[#E0DED7] px-4 py-1 text-[#2F3E34] hover:bg-[#D3D0C7]"
              >
                ログアウト
              </SubmitButton>
            </form>
          )}
        </div>

        {name ? <MyPageContent name={name} /> : <AuthForms />}
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

  const bookById = new Map(books.map((b) => [b.id, b]));

  // 持ち主名がログイン中の名前と同じ本を「自分の本」とする（操作の権限も同じ基準）
  const myBooks = books.filter((b) => isSameName(b.owner, name));
  const myBookIds = new Set(myBooks.map((b) => b.id));

  // 自分の申請は、名前か申請時に解決できた Slack ID のどちらかで一致すれば自分とみなす
  const isMine = (r: BookRequest) =>
    isSameName(r.requester, name) ||
    (!!mySlackId && r.requesterSlackId === mySlackId);
  const isToMe = (r: BookRequest) => myBookIds.has(r.bookId);

  const borrowing = requests.filter((r) => isMine(r) && r.status === "approved");
  const myPending = requests.filter((r) => isMine(r) && r.status === "pending");
  const lentOut = requests.filter((r) => isToMe(r) && r.status === "approved");
  const incoming = requests.filter((r) => isToMe(r) && r.status === "pending");

  const lentBookIds = new Set(lentOut.map((r) => r.bookId));

  return (
    <div className="space-y-10">
      <Section title="自分の本に届いた申請" count={incoming.length}>
        {incoming.map((r) => (
          <RequestRow key={r.id} request={r} book={bookById.get(r.bookId)}>
            <p>
              申請者：{r.requester}
              {r.comment && `／${r.comment}`}
            </p>
            <StatusForm requestId={r.id}>
              <SubmitButton
                name="status"
                value="approved"
                className="rounded-lg bg-[#4F7D62] px-3 py-1.5 text-sm text-white hover:bg-[#3E644F]"
              >
                承認する
              </SubmitButton>
              <SubmitButton
                name="status"
                value="rejected"
                confirmMessage="この申請を却下しますか？"
                className="rounded-lg bg-[#E0DED7] px-3 py-1.5 text-sm text-[#2F3E34] hover:bg-[#D3D0C7]"
              >
                却下する
              </SubmitButton>
            </StatusForm>
          </RequestRow>
        ))}
      </Section>

      <Section title="貸し出し中の自分の本" count={lentOut.length}>
        {lentOut.map((r) => (
          <RequestRow key={r.id} request={r} book={bookById.get(r.bookId)}>
            <p>借りている人：{r.requester}</p>
            <StatusForm requestId={r.id}>
              <SubmitButton
                name="status"
                value="returned"
                confirmMessage="返却済みにしますか？"
                className="rounded-lg bg-[#5E7A8A] px-3 py-1.5 text-sm text-white hover:bg-[#4D6573]"
              >
                返却済みにする
              </SubmitButton>
            </StatusForm>
          </RequestRow>
        ))}
      </Section>

      <Section title="借りている本" count={borrowing.length}>
        {borrowing.map((r) => (
          <RequestRow key={r.id} request={r} book={bookById.get(r.bookId)}>
            <p>持ち主：{bookById.get(r.bookId)?.owner || "未設定"}</p>
          </RequestRow>
        ))}
      </Section>

      <Section title="申請中（承認待ち）" count={myPending.length}>
        {myPending.map((r) => (
          <RequestRow key={r.id} request={r} book={bookById.get(r.bookId)}>
            <p>持ち主：{bookById.get(r.bookId)?.owner || "未設定"}</p>
          </RequestRow>
        ))}
      </Section>

      <Section
        title="自分の本"
        count={myBooks.length}
        note={
          myBooks.length === 0
            ? `持ち主が「${name}」の本がありません。本を登録するときの持ち主名をこの名前にすると、ここで管理できます。`
            : undefined
        }
      >
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
        !note && <p className="mt-3 text-sm text-[#8A948C]">ありません</p>
      ) : (
        <div className="mt-3 space-y-3">{children}</div>
      )}
    </section>
  );
}

function StatusForm({
  requestId,
  children,
}: {
  requestId: string;
  children: React.ReactNode;
}) {
  return (
    <form action={setRequestStatusAction} className="mt-3 flex gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      {children}
    </form>
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
    <div className="rounded-xl border border-[#E0DED7] bg-white p-4 shadow-sm">
      <Link
        href={`/books/${request.bookId}`}
        className="font-semibold text-[#2F3E34] hover:underline"
      >
        {book?.title || request.bookTitle}
      </Link>
      {isOverdue(request) && (
        <span className="ml-2 rounded-full bg-[#F8E3E0] px-2 py-0.5 text-xs text-[#B5483B]">
          延滞中（{daysOverdue(request.period)}日）
        </span>
      )}
      <p className="mt-1 text-xs text-[#8A948C]">
        {due ? `返却予定日：${due}` : `希望期間：${request.period || "未指定"}`}
      </p>
      <div className="mt-1 text-sm text-[#5B6C60]">{children}</div>
    </div>
  );
}

function BookRow({ book, isLent }: { book: Book; isLent: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[#E0DED7] bg-white p-4 shadow-sm">
      <div>
        <Link
          href={`/books/${book.id}`}
          className="font-semibold text-[#2F3E34] hover:underline"
        >
          {book.title}
        </Link>
        {isLent && (
          <span className="ml-2 rounded-full bg-[#E8F1EC] px-2 py-0.5 text-xs text-[#4F7D62]">
            貸出中
          </span>
        )}
        <p className="mt-1 text-sm text-[#5B6C60]">
          {book.author || "著者不明"}
          {book.category && `／${book.category}`}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Link
          href={`/books/${book.id}/edit`}
          className="rounded-lg bg-[#E0DED7] px-3 py-1.5 text-sm text-[#2F3E34] hover:bg-[#D3D0C7]"
        >
          編集
        </Link>

        {/* 貸出中の本は返却済みにしてから削除する */}
        {!isLent && (
          <form action={deleteBookAction}>
            <input type="hidden" name="bookId" value={book.id} />
            <SubmitButton
              pendingText="削除中..."
              confirmMessage={`「${book.title}」を削除しますか？元に戻せません。`}
              className="rounded-lg bg-[#F8E3E0] px-3 py-1.5 text-sm text-[#B5483B] hover:bg-[#F1D2CD]"
            >
              削除
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
