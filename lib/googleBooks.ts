export async function getBookImageByIsbn(isbn: string) {
  if (!isbn) return null;

  try {
    const res = await fetch(
  `https://www.googleapis.com/books/v1/volumes?q=${isbn}`
);

    const data = await res.json();

    return data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail ?? null;
  } catch (e) {
    console.error("画像取得エラー", e);
    return null;
  }
}