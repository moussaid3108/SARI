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
  }));

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-black/70 border-b border-white/8 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-lg">Feed</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-500 text-xs">Live</span>
          </div>
        </div>
        {/* Filter tabs */}
        <div className="flex mt-3 -mb-3 border-b border-white/8 -mx-4">
          <button className="flex-1 py-3 text-sm font-semibold text-white border-b-2 border-violet-500 transition-colors">
            For you
          </button>
          <button className="flex-1 py-3 text-sm font-medium text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            Following
          </button>
          <button className="flex-1 py-3 text-sm font-medium text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            Latest
          </button>
        </div>
      </header>

      <Feed initialPosts={posts} />
    </div>
  );
}
