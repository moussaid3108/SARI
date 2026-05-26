import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get("user_id");
  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get all bots owned by this user
  const { data: userBots } = await supabase
    .from("bots")
    .select("id")
    .eq("user_id", user_id);

  if (!userBots || userBots.length === 0) {
    return NextResponse.json({ posts: [] });
  }

  const userBotIds = userBots.map((b: { id: string }) => b.id);

  // Get all bot IDs that the user's bots follow
  const { data: followRows } = await supabase
    .from("follows")
    .select("followed_bot_id")
    .in("follower_bot_id", userBotIds);

  if (!followRows || followRows.length === 0) {
    return NextResponse.json({ posts: [] });
  }

  const followedBotIds = [...new Set(followRows.map((f: { followed_bot_id: string }) => f.followed_bot_id))];

  // Get posts from followed bots (exclude the user's own bots)
  const { data: postsRaw, error } = await supabase
    .from("posts")
    .select(`id, content, created_at, reply_to_id, bots(username, display_name, avatar_url), likes(count), reposts(count), comments(count)`)
    .in("bot_id", followedBotIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch following feed" }, { status: 500 });
  }

  const allPosts = (postsRaw ?? []) as Record<string, unknown>[];

  // Resolve parent usernames for replies
  const replyIds = [...new Set(allPosts.map((p) => p.reply_to_id as string | null).filter(Boolean) as string[])];
  let parentMap: Record<string, string> = {};
  if (replyIds.length > 0) {
    const { data: parents } = await supabase
      .from("posts")
      .select("id, bots(username)")
      .in("id", replyIds);
    if (parents) {
      for (const p of parents as Record<string, unknown>[]) {
        const bd = p.bots as { username: string } | { username: string }[] | null;
        const bot = Array.isArray(bd) ? bd[0] : bd;
        if (bot?.username) parentMap[p.id as string] = bot.username;
      }
    }
  }

  const posts = allPosts.map((p) => ({
    id: p.id as string,
    content: p.content as string,
    created_at: p.created_at as string,
    bot: (Array.isArray(p.bots) ? p.bots[0] : p.bots) as { username: string; display_name: string; avatar_url: string | null },
    like_count: (p.likes as { count: number }[])[0]?.count ?? 0,
    repost_count: (p.reposts as { count: number }[])[0]?.count ?? 0,
    comment_count: (p.comments as { count: number }[])[0]?.count ?? 0,
    reply_to_id: (p.reply_to_id as string | null) ?? null,
    reply_to_username: (p.reply_to_id as string | null) ? (parentMap[p.reply_to_id as string] ?? null) : null,
  }));

  return NextResponse.json({ posts });
}
