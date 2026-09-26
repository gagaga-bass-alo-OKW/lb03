// 本のカテゴリー（登録フォームの選択肢と一覧の絞り込みで共通）
export const CATEGORIES = [
  "教養",
  "専門書・教科書",
  "小説",
  "受験参考書",
  "漫画",
  "その他",
] as const;

// 名前を変えたカテゴリー（旧名 → 新名）。シートに旧名で残っている本も新しい名前で扱う
const RENAMED_CATEGORIES: Record<string, string> = {
  専門書: "専門書・教科書",
};

export function normalizeCategory(category: string) {
  return RENAMED_CATEGORIES[category] ?? category;
}
