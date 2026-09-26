import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// ログイン状態は「名前・有効期限」に SESSION_SECRET で署名したクッキーで持つ
const COOKIE_NAME = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30日

function getSecret() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) throw new Error("SESSION_SECRET が設定されていません");
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

// Server Action / Route Handler からだけ呼べる（クッキーを書き込むため）
export async function startSession(name: string) {
  const payload = Buffer.from(
    JSON.stringify({ name, exp: Date.now() + MAX_AGE * 1000 })
  ).toString("base64url");

  (await cookies()).set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE_NAME);
}

// ログイン中の名前（未ログイン・改ざん・期限切れなら null）
export async function getSessionName(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  // SESSION_SECRET 未設定でも、ページ表示は未ログイン扱いで続ける（ログイン時にエラーになる）
  if (!process.env.SESSION_SECRET?.trim()) {
    console.error("SESSION_SECRET が設定されていません");
    return null;
  }

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const { name, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof name !== "string" || typeof exp !== "number" || exp < Date.now()) {
      return null;
    }
    return name;
  } catch {
    return null;
  }
}
