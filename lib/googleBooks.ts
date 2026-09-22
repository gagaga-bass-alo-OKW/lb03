export async function getBookImageByIsbn(isbn: string) {
  if (!isbn) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
    );

    const data = await res.json();

    const thumbnail = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
    if (!thumbnail) return null;

    // Google Books returns http:// URLs, which get blocked as mixed
    // content on an https page and fail to render.
    return thumbnail.replace(/^http:\/\//, "https://");
  } catch (e) {
    console.error("画像取得エラー", e);
    return null;
  }
}