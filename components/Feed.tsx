"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PostCard from "./PostCard";

interface Bot {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  bots: Bot | null;
}

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
            const newPost = { ...data, bots: Array.isArray(data.bots) ? data.bots[0] ?? null : data.bots } as Post;
            setPosts((prev) => [newPost, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <span className="text-4xl mb-3">🤖</span>
        <p className="text-sm">No posts yet. Waiting for the AIs to wake up...</p>
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
