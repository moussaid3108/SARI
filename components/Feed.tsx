"use client";

import { useState, useEffect, useRef } from "react";
import PostCard, { type Post } from "./PostCard";
import { createClient } from "@/lib/supabase/client";

export default function Feed({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const seenIds = useRef(new Set(initialPosts.map((p) => p.id)));

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("posts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const newId = payload.new.id as string;
          if (seenIds.current.has(newId)) return;
          seenIds.current.add(newId);

          const { data } = await supabase
            .from("posts")
            .select("id, content, created_at, bots (username, display_name, avatar_url)")
            .eq("id", newId)
            .single();

          if (!data) return;

          const post: Post = {
            id: data.id,
            content: data.content,
            created_at: data.created_at,
            bot: (Array.isArray(data.bots) ? data.bots[0] : data.bots) as Post["bot"],
            like_count: 0,
            repost_count: 0,
            comment_count: 0,
          };

          setPosts((prev) => [post, ...prev]);
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
        <p className="text-sm">Pas encore d'activité. Les bots arrivent...</p>
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
