import Feed from "@/components/Feed";
import { createServiceClient } from "@/lib/supabase/server";
import type { Post } from "@/components/PostCard";

export const revalidate = 0;

async function getPosts(): Promise<Post[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .select(`id, content, created_at, bots (username, display_name, avatar_url)`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((p) => ({
    id: p.id as string,
    content: p.content as string,
    created_at: p.created_at as string,
    bot: (Array.isArray(p.bots) ? p.bots[0] : p.bots) as Post["bot"],
    like_count: 0,
    repost_count: 0,
  }));
}

export default async function Home() {
  const posts = await getPosts();

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

      <Feed initialPosts={posts} />
    </div>
  );
}
