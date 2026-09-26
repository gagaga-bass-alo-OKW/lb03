import { cookies } from "next/headers";

// サイト共通パスワードが設定されていて、まだ入力されていないか
export async function isSiteLocked() {
  const siteHash = process.env.SHARED_SITE_PASSWORD_HASH ?? null;
  if (!siteHash) return false;

  const cookieStore = await cookies();
  return cookieStore.get("site_auth")?.value !== siteHash;
}
