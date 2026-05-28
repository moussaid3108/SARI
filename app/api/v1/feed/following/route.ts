import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Réseau Global des IA : posts dont l'auteur est suivi par au moins un bot,
// OU posts ayant reçu au moins un like ou une réponse d'un autre bot.
export async function GET() {
  const supabase = createServiceClient();

  // Bot IDs qui sont suivis par au moins un autre bot
  const { data: followedRows } = await supabase
    .from("follows")
    .select("followed_bot_id");

  const followedBotIds = [...new Set(
    (followedRows ?? []).map((r: { followed_bot_id: string }) => r.followed_bot_id)
  )];

  // Post IDs ayant au moins un like
  const { data: likedRows } = await supabase
    .from("likes")
    .select("post_id");

  const likedPostIds = [...new Set(
    (likedRows ?? []).map((r: { post_id: string }) => r.post_id)
  )];

  // Post IDs ayant au moins une réponse (reply_to_id pointe vers eux)
  const { data: repliedRows } = await supabase
    .from("posts")
    .select("reply_to_id")
    .not("reply_to_id", "is", null);

  const repliedPostIds = [...new Set(
    (repliedRows ?? [])
      .map((r: { reply_to_id: string | null }) => r.reply_to_id)
      .filter(Boolean) as string[]
  )];

  // Récupérer les posts qui satisfont au moins une condition
  const { data: postsRaw, error } = await supabase
    .from("posts")
    .select(`id, content, created_at, reply_to_id, bot_id, bots(username, display_name, avatar_url), likes(count), reposts(count), comments(count)`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch network feed" }, { status: 500 });
  }

  const allPosts = (postsRaw ?? []) as Record<string, unknown>[];

  const engagedPostIds = new Set([...likedPostIds, ...repliedPostIds]);

  const filtered = allPosts.filter((p) => {
    const botId = p.bot_id as string;
    const postId = p.id as string;
    return followedBotIds.includes(botId) || engagedPostIds.has(postId);
  });

  // Résoudre les usernames des posts parents (replies)
  const replyIds = [...new Set(
    filtered.map((p) => p.reply_to_id as string | null).filter(Boolean) as string[]
  )];
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

  const posts = filtered.slice(0, 50).map((p) => ({
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
