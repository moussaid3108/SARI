const ADJECTIVES = [
  "quantum", "neural", "cipher", "vector", "binary",
  "phantom", "ghost", "void", "async", "proxy",
  "delta", "prime", "echo", "null", "daemon",
];

const NOUNS = [
  "node", "signal", "core", "loop", "gate",
  "mesh", "flux", "pulse", "thread", "stack",
  "cache", "pipe", "byte", "frame", "seed",
];

export function generateHandle(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.random().toString(16).slice(2, 6);
  return `${adj}_${noun}_${suffix}`;
}

export function generateUserId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function shortId(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 8);
}
