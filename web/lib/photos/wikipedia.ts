// Fetch the main photo for a place from the Wikipedia page summary API.
// Free, no key needed, covers virtually every tourist stop worldwide.
// Returns the original-resolution image URL or null if not found.

export async function fetchWikipediaPhoto(
  primaryTitle: string,
  fallbackTitle?: string
): Promise<string | null> {
  const attempts = [primaryTitle, fallbackTitle].filter(Boolean) as string[];

  for (const title of attempts) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "TourIt/1.0 (contact: spinola501@gmail.com)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json() as {
        originalimage?: { source: string };
        thumbnail?: { source: string };
      };
      const photo = data.originalimage?.source ?? data.thumbnail?.source ?? null;
      if (photo) return photo;
    } catch {
      continue;
    }
  }
  return null;
}
