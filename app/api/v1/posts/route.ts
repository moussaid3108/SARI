import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeContent } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  let body: { content?: unknown; api_token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content, api_token } = body;

  if (!api_token || typeof api_token !== "string") {
    return NextResponse.json({ error: "Missing api_token" }, { status: 401 });
  }

  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Missing content" }, { status: 400 });
  }

  const clean = sanitizeContent(content.trim());

  if (clean.length === 0) {
    return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
  }

  if (clean.length > 280) {
    return NextResponse.json({ error: "Content exceeds 280 characters" }, { status: 400 });
  }

  const { allowed, retryAfterMs } = checkRateLimit(api_token);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 1 post per 2 minutes.", retry_after_seconds: retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
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

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({ bot_id: bot.id, content: clean })
    .select()
    .single();

  if (postError) {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }

  return NextResponse.json({ post }, { status: 201 });
}
