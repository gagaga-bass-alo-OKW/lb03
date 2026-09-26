import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { getSheetId, getWritableSheets } from "@/lib/sheets";
import { isSameName } from "@/lib/names";

// マイページのアカウントは accounts タブに保存する
// A: 名前 / B: パスワードハッシュ（salt:hash） / C: 作成日時 / D: Slack ID
// E: 確認済み（TRUE） / F: トークンのハッシュ / G: トークン有効期限 / H: トークンの用途
// パスワードとトークンはどちらもハッシュだけを保存し、シートを見ても元の値は分からない
const SHEET = "accounts";
const HEADER = [
  "name",
  "passwordHash",
  "createdAt",
  "slackId",
  "verified",
  "tokenHash",
  "tokenExpiresAt",
  "tokenPurpose",
];

const TOKEN_TTL_MS = 30 * 60 * 1000; // DM のリンクは30分有効
const RESEND_INTERVAL_MS = 60 * 1000; // 同じ人への DM は1分に1回まで

export type TokenPurpose = "verify" | "reset";

type Account = {
  rowNumber: number;
  name: string;
  passwordHash: string;
  createdAt: string;
  slackId: string;
  verified: boolean;
  tokenHash: string;
  tokenExpiresAt: string;
  tokenPurpose: string;
};

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>;

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

// トークンは推測できない乱数で、シートには SHA-256 だけを残す
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// accounts タブが無ければ見出し付きで作る
async function ensureSheet() {
  if ((await getSheetId(SHEET)) !== null) return;

  const sheets = getWritableSheets();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: SHEET } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${SHEET}!A1:H1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADER] },
  });
}

async function getAccounts(): Promise<Account[]> {
  // まだ誰も登録していなければタブ自体が無い（読むだけならタブは作らない）
  if ((await getSheetId(SHEET)) === null) return [];

  const res = await getWritableSheets().spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${SHEET}!A:H`,
  });

  return (res.data.values ?? []).slice(1).map((r, i) => ({
    rowNumber: i + 2,
    name: String(r[0] ?? ""),
    passwordHash: String(r[1] ?? ""),
    createdAt: String(r[2] ?? ""),
    slackId: String(r[3] ?? ""),
    verified: String(r[4] ?? "").toUpperCase() === "TRUE",
    tokenHash: String(r[5] ?? ""),
    tokenExpiresAt: String(r[6] ?? ""),
    tokenPurpose: String(r[7] ?? ""),
  }));
}

async function findAccount(name: string) {
  return (await getAccounts()).find((a) => isSameName(a.name, name)) ?? null;
}

async function saveAccount(a: Omit<Account, "rowNumber"> & { rowNumber?: number }) {
  const values = [
    [
      a.name,
      a.passwordHash,
      a.createdAt,
      a.slackId,
      a.verified ? "TRUE" : "",
      a.tokenHash,
      a.tokenExpiresAt,
      a.tokenPurpose,
    ],
  ];
  await ensureSheet();
  const sheets = getWritableSheets();

  if (a.rowNumber) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${SHEET}!A${a.rowNumber}:H${a.rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${SHEET}!A:H`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }
}

// 直前に発行したトークンがまだ新しければ true（DM の連投を防ぐ）
function sentRecently(a: Account) {
  const expires = Date.parse(a.tokenExpiresAt);
  return !!a.tokenHash && expires - TOKEN_TTL_MS + RESEND_INTERVAL_MS > Date.now();
}

function newToken(purpose: TokenPurpose) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    fields: {
      tokenHash: hashToken(token),
      tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      tokenPurpose: purpose,
    },
  };
}

const noToken = { tokenHash: "", tokenExpiresAt: "", tokenPurpose: "" };

type TokenResult =
  | { ok: true; token: string; slackId: string; name: string }
  | { ok: false; error: string };

// 確認待ちのアカウントを作り（作り直し）、DM で送る確認用トークンを返す
export async function createPendingAccount(
  name: string,
  password: string,
  slackId: string
): Promise<TokenResult> {
  const existing = await findAccount(name);

  if (existing?.verified) {
    return { ok: false, error: "この名前のマイページはすでに作成されています" };
  }
  if (existing && sentRecently(existing)) {
    return { ok: false, error: "確認リンクを送ったばかりです。1分ほど待ってからやり直してください" };
  }

  // 確認前のアカウントは何度でも作り直せる（最後に送ったリンクだけが有効）
  const { token, fields } = newToken("verify");
  await saveAccount({
    rowNumber: existing?.rowNumber,
    name,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
    slackId,
    verified: false,
    ...fields,
  });

  return { ok: true, token, slackId, name };
}

// 確認済みアカウントに、パスワード再設定用のトークンを発行する
export async function issueResetToken(name: string): Promise<TokenResult> {
  const account = await findAccount(name);

  if (!account?.verified || !account.slackId) {
    return { ok: false, error: "この名前のマイページは見つかりません" };
  }
  if (sentRecently(account)) {
    return { ok: false, error: "リンクを送ったばかりです。1分ほど待ってからやり直してください" };
  }

  const { token, fields } = newToken("reset");
  await saveAccount({ ...account, ...fields });

  return { ok: true, token, slackId: account.slackId, name: account.name };
}

// 有効期限内で用途が合うトークンを持つアカウントを探す
export async function findAccountByToken(token: string, purpose: TokenPurpose) {
  if (!token) return null;
  const hash = hashToken(token);

  const account = (await getAccounts()).find(
    (a) =>
      a.tokenHash === hash &&
      a.tokenPurpose === purpose &&
      Date.parse(a.tokenExpiresAt) > Date.now()
  );
  return account ?? null;
}

// 確認リンクのトークンでアカウントを有効にする。成功したら名前を返す
export async function verifyAccount(token: string) {
  const account = await findAccountByToken(token, "verify");
  if (!account) return null;

  await saveAccount({ ...account, verified: true, ...noToken });
  return account.name;
}

// 再設定リンクのトークンでパスワードを変える。成功したら名前を返す
export async function resetPassword(token: string, password: string) {
  const account = await findAccountByToken(token, "reset");
  if (!account) return null;

  await saveAccount({
    ...account,
    passwordHash: await hashPassword(password),
    ...noToken,
  });
  return account.name;
}

// 名前とパスワードが合っていて、確認済みなら登録時の名前を返す
export async function authenticate(
  name: string,
  password: string
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const account = await findAccount(name);

  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    return { ok: false, error: "名前またはパスワードが違います" };
  }
  if (!account.verified) {
    return {
      ok: false,
      error: "まだ確認が済んでいません。Slack の DM に届いたリンクを開いてください",
    };
  }
  return { ok: true, name: account.name };
}
