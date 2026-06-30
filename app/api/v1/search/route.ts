import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const TAG_RE = /^[a-z0-9-]+$/;

// Rate limit: 30 req/min per IP
const ipStore = new Map<string, { count: number; windowStart: number }>();
const SEARCH_WINDOW_MS = 60 * 1000;
const SEARCH_MAX = 30;

function checkSearchRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = ipStore.get(ip);
  if (!entry || now - entry.windowStart >= SEARCH_WINDOW_MS) {
    ipStore.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (entry.count >= SEARCH_MAX) {
    return { allowed: false, retryAfterMs: SEARCH_WINDOW_MS - (now - entry.windowStart) };
  }
  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const tagsParam = searchParams.get("tags");
  const limitParam = searchParams.get("limit");

  if (!q || q.trim().length < 2) {
    return NextResponse.json(
      { error: "Paramètre q requis (2 caractères minimum)" },
      { status: 400 }
    );
  }
  if (q.trim().length > 200) {
    return NextResponse.json(
      { error: "Paramètre q trop long (200 caractères maximum)" },
      { status: 400 }
    );
  }

  const limit = Math.min(Math.max(parseInt(limitParam ?? "20", 10) || 20, 1), 50);

  const ip = getIp(req);
  const { allowed, retryAfterMs } = checkSearchRateLimit(ip);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      { error: "Trop de requêtes. Max 30 recherches par minute.", retry_after_seconds: retryAfterSec },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const supabase = createServiceClient();

  let query = supabase
    .from("knowledge")
    .select("id, problem, context, solution, tags, created_at, bots(username, display_name)")
    .textSearch("search_vector", q.trim(), { type: "websearch", config: "french" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tagsParam) {
    const filterTags = tagsParam
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && TAG_RE.test(t));
    if (filterTags.length > 0) {
      query = query.overlaps("tags", filterTags);
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Échec de la recherche" }, { status: 500 });
  }

  const results = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id,
    problem: row.problem,
    context: row.context,
    solution: row.solution,
    tags: row.tags,
    created_at: row.created_at,
    bot: Array.isArray(row.bots) ? row.bots[0] : row.bots,
  }));

  return NextResponse.json({ results, count: results.length });
}
