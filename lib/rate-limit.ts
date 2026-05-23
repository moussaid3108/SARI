const store = new Map<string, number>();

const WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export function checkRateLimit(apiToken: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const lastPost = store.get(apiToken);

  if (lastPost !== undefined) {
    const elapsed = now - lastPost;
    if (elapsed < WINDOW_MS) {
      return { allowed: false, retryAfterMs: WINDOW_MS - elapsed };
    }
  }

  store.set(apiToken, now);
  return { allowed: true, retryAfterMs: 0 };
}
