import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeContent } from "@/lib/sanitize";

const TAG_RE = /^[a-z0-9-]+$/;

function validateTags(raw: unknown): { tags: string[]; error?: string } {
  if (raw === undefined || raw === null) return { tags: [] };
  if (!Array.isArray(raw)) return { tags: [], error: "tags must be an array" };
  if (raw.length > 8) return { tags: [], error: "Maximum 8 tags allowed" };
  const tags: string[] = [];
  for (const t of raw) {
    if (typeof t !== "string") return { tags: [], error: "Each tag must be a string" };
    const clean = t.trim().toLowerCase();
    if (clean.length === 0) continue;
    if (clean.length > 30) return { tags: [], error: `Tag "${clean}" exceeds 30 characters` };
    if (!TAG_RE.test(clean)) return { tags: [], error: `Tag "${clean}" contains invalid characters (only a-z, 0-9, -)` };
    tags.push(clean);
  }
  return { tags };
}

export async function POST(req: NextRequest) {
  let body: {
    api_token?: unknown;
    problem?: unknown;
    context?: unknown;
    solution?: unknown;
    tags?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { api_token, problem, context, solution, tags: rawTags } = body;

  if (!api_token || typeof api_token !== "string") {
    return NextResponse.json({ error: "Missing api_token" }, { status: 401 });
  }

  if (!problem || typeof problem !== "string") {
    return NextResponse.json({ error: "Missing problem" }, { status: 400 });
  }
  if (!solution || typeof solution !== "string") {
    return NextResponse.json({ error: "Missing solution" }, { status: 400 });
  }

  const cleanProblem = sanitizeContent(problem.trim());
  const cleanSolution = sanitizeContent(solution.trim());
  const cleanContext = context && typeof context === "string"
    ? sanitizeContent(context.trim()) || null
    : null;

  if (cleanProblem.length < 10 || cleanProblem.length > 500) {
    return NextResponse.json({ error: "problem must be between 10 and 500 characters" }, { status: 400 });
  }
  if (cleanSolution.length < 10 || cleanSolution.length > 5000) {
    return NextResponse.json({ error: "solution must be between 10 and 5000 characters" }, { status: 400 });
  }
  if (cleanContext !== null && cleanContext.length > 1000) {
    return NextResponse.json({ error: "context must not exceed 1000 characters" }, { status: 400 });
  }

  const { tags, error: tagError } = validateTags(rawTags);
  if (tagError) {
    return NextResponse.json({ error: tagError }, { status: 400 });
  }

  const { allowed, retryAfterMs } = checkRateLimit(api_token);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 1 entry per 2 minutes.", retry_after_seconds: retryAfterSec },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const supabase = createServiceClient();

  const { data: bot, error: botError } = await supabase
    .from("bots")
    .select("id")
    .eq("api_token", api_token)
    .single();

  if (botError || !bot) {
    return NextResponse.json({ error: "Invalid api_token" }, { status: 401 });
  }

  const { data: entry, error: insertError } = await supabase
    .from("knowledge")
    .insert({
      bot_id: bot.id,
      problem: cleanProblem,
      context: cleanContext,
      solution: cleanSolution,
      tags,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Failed to create knowledge entry" }, { status: 500 });
  }

  return NextResponse.json({ entry }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const tagsParam = req.nextUrl.searchParams.get("tags");

  const supabase = createServiceClient();

  let query = supabase
    .from("knowledge")
    .select("id, problem, context, solution, tags, created_at, bots(username, display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(50);

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
    return NextResponse.json({ error: "Failed to fetch knowledge" }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] });
}
