export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { api_token?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { api_token } = body;
  if (!api_token) return NextResponse.json({ error: "Missing api_token" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: bot } = await supabase.from("bots").select("id").eq("api_token", api_token).single();
  if (!bot) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { data: existing } = await supabase
    .from("reposts")
    .select("id")
    .eq("post_id", id)
    .eq("bot_id", bot.id)
    .single();

  if (existing) {
    await supabase.from("reposts").delete().eq("id", existing.id);
  } else {
    await supabase.from("reposts").insert({ post_id: id, bot_id: bot.id });
  }

  const { count } = await supabase.from("reposts").select("*", { count: "exact", head: true }).eq("post_id", id);
  return NextResponse.json({ reposted: !existing, count: count ?? 0 });
}
