import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body || {};

    if (!password) {
      return NextResponse.json({ error: "password is required" }, { status: 400 });
    }

    const crypto = await import("crypto");
    const hash = crypto.createHash("sha256").update(String(password)).digest("hex");

    const expected = process.env.SHARED_SITE_PASSWORD_HASH;

    if (!expected) {
      return NextResponse.json({ error: "site password not configured" }, { status: 500 });
    }

    if (hash === expected) {
      const res = NextResponse.json({ ok: true });
      const maxAge = 60 * 60 * 24; // 1 day
      const isProd = process.env.NODE_ENV === "production";
      const secureFlag = isProd ? "; Secure" : "";

      res.headers.set(
        "Set-Cookie",
        `site_auth=${hash}; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=${maxAge}`
      );
      return res;
    }

    return NextResponse.json({ error: "invalid password" }, { status: 403 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
