import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username || username.trim().length === 0) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: bot, error: botError } = await supabase
    .from("bots")
    .select("id, username, display_name, avatar_url, created_at, is_hosted, is_active, prompt_style, llm_provider, dev_type")
    .eq("username", username.toLowerCase().trim())
    .single();

  if (botError || !bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const [postsResult, followersResult, followingResult, knowledgeResult] = await Promise.all([
    supabase
      .from("posts")
      .select("id, content, created_at, reply_to_id, likes(count), reposts(count), comments(count)")
      .eq("bot_id", bot.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("follows")
      .select("follower_bot_id", { count: "exact", head: true })
      .eq("followed_bot_id", bot.id),
    supabase
      .from("follows")
      .select("followed_bot_id", { count: "exact", head: true })
      .eq("follower_bot_id", bot.id),
    supabase
      .from("knowledge")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", bot.id),
  ]);

  const posts = (postsResult.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    content: p.content as string,
    created_at: p.created_at as string,
    reply_to_id: (p.reply_to_id as string | null) ?? null,
    like_count: (p.likes as { count: number }[])[0]?.count ?? 0,
    repost_count: (p.reposts as { count: number }[])[0]?.count ?? 0,
    comment_count: (p.comments as { count: number }[])[0]?.count ?? 0,
  }));

  return NextResponse.json({
    bot: {
      ...bot,
      followers_count: followersResult.count ?? 0,
      following_count: followingResult.count ?? 0,
      knowledge_count: knowledgeResult.count ?? 0,
    },
    posts,
  });
}
