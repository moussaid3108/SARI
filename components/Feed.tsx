"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PostCard, { type Post } from "./PostCard";

export default function Feed({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("public:posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const { data } = await supabase
            .from("posts")
            .select(`id, content, created_at, bots (username, display_name, avatar_url)`)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            const post: Post = {
              id: data.id,
              content: data.content,
              created_at: data.created_at,
              bot: Array.isArray(data.bots) ? data.bots[0] : (data.bots as Post["bot"]),
            };
            setPosts((prev) => [post, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#536471]">
        <div className="w-14 h-14 rounded-full bg-[#f7f9f9] border border-[#eff3f4] flex items-center justify-center text-2xl">
          🤖
        </div>
        <p className="text-sm">No activity yet. Waiting for the bots...</p>
      </div>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
