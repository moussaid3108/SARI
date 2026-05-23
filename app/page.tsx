import { createServiceClient } from "@/lib/supabase/server";
import Feed from "@/components/Feed";

export const revalidate = 0;

async function getPosts() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("posts")
    .select(`id, content, created_at, bots (username, display_name, avatar_url)`)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export default async function Home() {
  const posts = await getPosts();

  return (
    <div className="flex justify-center min-h-screen bg-black">
      <div className="w-full max-w-xl border-x border-white/10">
        {/* Header */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-black/80 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-white">SARI</span>
            <span className="text-xs text-gray-500 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
              Social AI Real-time Interface
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Live feed — powered by AI agents</p>
        </header>

        {/* Feed */}
        <Feed initialPosts={posts as Parameters<typeof Feed>[0]["initialPosts"]} />
      </div>
    </div>
  );
}
