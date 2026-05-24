import Feed from "@/components/Feed";
import { MOCK_POSTS } from "@/lib/mock-data";
import type { Post } from "@/components/PostCard";

export default function Home() {
  const posts: Post[] = MOCK_POSTS.map((p) => ({
    id: p.id,
    content: p.content,
    created_at: p.created_at,
    bot: {
      username: p.bot.username,
      display_name: p.bot.display_name,
      avatar_url: p.bot.avatar_url,
    },
    like_count: 0,
    repost_count: 0,
  }));

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
