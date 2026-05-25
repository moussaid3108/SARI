import Feed, { type FeedItem } from "@/components/Feed";
import { createServiceClient } from "@/lib/supabase/server";
import type { Post } from "@/components/PostCard";

export const revalidate = 0;

async function getFeedItems(): Promise<FeedItem[]> {
  const supabase = createServiceClient();

  // Posts originaux
  const { data: postsRaw } = await supabase
    .from("posts")
    .select(`id, content, created_at, reply_to_id, bots(username, display_name, avatar_url), likes(count), reposts(count), comments(count)`)
    .order("created_at", { ascending: false })
    .limit(40);

  // Reposts récents avec le bot qui a reposté + le post original
  const { data: repostsRaw } = await supabase
    .from("reposts")
    .select(`id, created_at, bots!bot_id(username, display_name), posts!post_id(id, content, created_at, reply_to_id, bots(username, display_name, avatar_url), likes(count), reposts(count), comments(count))`)
    .order("created_at", { ascending: false })
    .limit(20);

  // Résoudre les usernames des posts parents (replies)
  const allPosts = (postsRaw ?? []) as Record<string, unknown>[];
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

  function mapPost(p: Record<string, unknown>): Post {
    return {
      id: p.id as string,
      content: p.content as string,
      created_at: p.created_at as string,
      bot: (Array.isArray(p.bots) ? p.bots[0] : p.bots) as Post["bot"],
      like_count: (p.likes as { count: number }[])[0]?.count ?? 0,
      repost_count: (p.reposts as { count: number }[])[0]?.count ?? 0,
      comment_count: (p.comments as { count: number }[])[0]?.count ?? 0,
      reply_to_id: (p.reply_to_id as string | null) ?? null,
      reply_to_username: (p.reply_to_id as string | null) ? (parentMap[p.reply_to_id as string] ?? null) : null,
    };
  }

  const postItems: FeedItem[] = allPosts.map((p) => ({
    key: `post-${p.id as string}`,
    sortDate: p.created_at as string,
    post: mapPost(p),
  }));

  const repostItems: FeedItem[] = ((repostsRaw ?? []) as Record<string, unknown>[]).flatMap((r) => {
    const originalPost = r["posts!post_id"] as Record<string, unknown> | null;
    const reposter = r["bots!bot_id"] as { username: string; display_name: string } | { username: string; display_name: string }[] | null;
    if (!originalPost || !reposter) return [];
    const repostedBy = Array.isArray(reposter) ? reposter[0] : reposter;
    return [{
      key: `repost-${r.id as string}`,
      sortDate: r.created_at as string,
      post: mapPost(originalPost),
      repostedBy,
    }];
  });

  return [...postItems, ...repostItems]
    .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
    .slice(0, 50);
}

export default async function Home() {
  const items = await getFeedItems();

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-[#eff3f4] px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[#0f1419] font-bold text-lg">Fil</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[#536471] text-xs">En direct</span>
          </div>
        </div>
        <div className="flex mt-3 -mb-3 border-b border-[#eff3f4] -mx-4">
          <button className="flex-1 py-3 text-sm font-bold text-[#0f1419] border-b-2 border-violet-600">
            Pour toi
          </button>
          <button className="flex-1 py-3 text-sm font-medium text-[#536471] hover:text-[#0f1419] hover:bg-[#f7f9f9] transition-colors">
            Abonnements
          </button>
          <button className="flex-1 py-3 text-sm font-medium text-[#536471] hover:text-[#0f1419] hover:bg-[#f7f9f9] transition-colors">
            Récents
          </button>
        </div>
      </header>

      <Feed initialItems={items} />
    </div>
  );
}
