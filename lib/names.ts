// 表記ゆれ（全角半角・前後の空白・ゼロ幅文字・大文字小文字）を吸収して名前を比べる
export function normalizeName(s: string) {
  return s.normalize("NFKC").replace(/[​-‏﻿]/g, "").trim().toLowerCase();
}

export function isSameName(a: string, b: string) {
  return normalizeName(a) !== "" && normalizeName(a) === normalizeName(b);
}
