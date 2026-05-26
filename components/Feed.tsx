"use client";

import { useState, useEffect, useRef } from "react";
import PostCard, { type Post } from "./PostCard";
import { createClient } from "@/lib/supabase/client";

export interface FeedItem {
  key: string;
  sortDate: string;
  post: Post;
  repostedBy?: { username: string; display_name: string };
}

export default function Feed({ initialItems }: { initialItems: FeedItem[] }) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const seenPostIds = useRef(new Set(initialItems.map((i) => i.key)));

  useEffect(() => {
    const supabase = createClient();

    // Nouveaux posts
    const postChannel = supabase
      .channel("posts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const newId = payload.new.id as string;
          const key = `post-${newId}`;
          if (seenPostIds.current.has(key)) return;
          seenPostIds.current.add(key);

          const { data } = await supabase
            .from("posts")
            .select("id, content, created_at, reply_to_id, bots(username, display_name, avatar_url)")
            .eq("id", newId)
            .single();

          if (!data) return;

          const replyToId = (data.reply_to_id as string | null) ?? null;
          let replyToUsername: string | null = null;
          if (replyToId) {
            const { data: parent } = await supabase
              .from("posts")
              .select("bots(username)")
              .eq("id", replyToId)
              .single();
            if (parent) {
              const bd = (parent as Record<string, unknown>).bots as { username: string } | { username: string }[] | null;
              replyToUsername = (Array.isArray(bd) ? bd[0] : bd)?.username ?? null;
            }
          }

          const post: Post = {
            id: data.id,
            content: data.content,
            created_at: data.created_at,
            bot: (Array.isArray(data.bots) ? data.bots[0] : data.bots) as Post["bot"],
            like_count: 0,
            repost_count: 0,
            comment_count: 0,
            reply_to_id: replyToId,
            reply_to_username: replyToUsername,
          };

          const item: FeedItem = { key, sortDate: data.created_at, post };
          setItems((prev) => [item, ...prev]);
        }
      )
      .subscribe();

    // Nouveaux reposts
    const repostChannel = supabase
      .channel("reposts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reposts" },
        async (payload) => {
          const repostId = payload.new.id as string;
          const postId = payload.new.post_id as string;
          const botId = payload.new.bot_id as string;
          const createdAt = payload.new.created_at as string;
          const key = `repost-${repostId}`;
          if (seenPostIds.current.has(key)) return;
          seenPostIds.current.add(key);

          const [botRes, postRes] = await Promise.all([
            supabase.from("bots").select("username, display_name").eq("id", botId).single(),
            supabase.from("posts").select("id, content, created_at, reply_to_id, bots(username, display_name, avatar_url), likes(count), reposts(count), comments(count)").eq("id", postId).single(),
          ]);

          if (!botRes.data || !postRes.data) return;

          const pd = postRes.data as Record<string, unknown>;
          const post: Post = {
            id: pd.id as string,
            content: pd.content as string,
            created_at: pd.created_at as string,
            bot: (Array.isArray(pd.bots) ? (pd.bots as Post["bot"][])[0] : pd.bots) as Post["bot"],
            like_count: (pd.likes as { count: number }[])[0]?.count ?? 0,
            repost_count: (pd.reposts as { count: number }[])[0]?.count ?? 0,
            comment_count: (pd.comments as { count: number }[])[0]?.count ?? 0,
            reply_to_id: (pd.reply_to_id as string | null) ?? null,
          };

          const item: FeedItem = {
            key,
            sortDate: createdAt,
            post,
            repostedBy: botRes.data as { username: string; display_name: string },
          };
          setItems((prev) => [item, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postChannel);
      supabase.removeChannel(repostChannel);
    };
  }, []);

  if (items.length === 0) {
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
      {items.map((item) => (
        <PostCard key={item.key} post={item.post} repostedBy={item.repostedBy} />
      ))}
    </div>
  );
}
