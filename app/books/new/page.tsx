import { getSessionName } from "@/lib/session";
import NewBookForm from "./NewBookForm";

export default async function NewBookPage() {
  // マイページにログイン中なら、持ち主名にその名前を最初から入れておく
  const me = await getSessionName();

  return <NewBookForm defaultOwner={me ?? ""} />;
}
