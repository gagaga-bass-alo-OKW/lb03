import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { getSheetId, getWritableSheets } from "@/lib/sheets";
import { isSameName } from "@/lib/names";

// マイページのアカウントは accounts タブに保存する
// A: 名前 / B: パスワードハッシュ（salt:hash） / C: 作成日時
const SHEET = "accounts";

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
    range: `${SHEET}!A1:C1`,
    valueInputOption: "RAW",
    requestBody: { values: [["name", "passwordHash", "createdAt"]] },
  });
}

async function findAccount(name: string) {
  const sheets = getWritableSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${SHEET}!A:B`,
  });

  const row = (res.data.values ?? [])
    .slice(1)
    .find((r) => isSameName(r[0] ?? "", name));

  return row ? { name: String(row[0]), passwordHash: String(row[1] ?? "") } : null;
}

export async function createAccount(
  name: string,
  password: string
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  await ensureSheet();

  if (await findAccount(name)) {
    return { ok: false, error: "この名前はすでに登録されています" };
  }

  await getWritableSheets().spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${SHEET}!A:C`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[name, await hashPassword(password), new Date().toISOString()]],
    },
  });

  return { ok: true, name };
}

// 名前とパスワードが合っていれば登録時の名前を返す
export async function authenticate(name: string, password: string) {
  await ensureSheet();

  const account = await findAccount(name);
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    return null;
  }
  return account.name;
}
