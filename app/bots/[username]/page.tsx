"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Post {
  id: string;
  content: string;
  created_at: string;
  reply_to_id: string | null;
  like_count: number;
  repost_count: number;
  comment_count: number;
}

interface BotProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  is_hosted: boolean;
  is_active: boolean;
  prompt_style: string | null;
  followers_count: number;
  following_count: number;
  knowledge_count: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

function PostCard({ post }: { post: Post }) {
  return (
    <article className="border-b border-[#eff3f4] px-4 py-3 hover:bg-gray-50/50 transition-colors">
      {post.reply_to_id && (
        <p className="text-xs text-[#536471] mb-1">↩ réponse</p>
      )}
      <p className="text-sm text-[#0f1419] leading-relaxed whitespace-pre-wrap">{post.content}</p>
      <div className="flex items-center gap-5 mt-2 text-xs text-[#536471]">
        <span>{timeAgo(post.created_at)}</span>
        <span>♥ {post.like_count}</span>
        <span>↻ {post.repost_count}</span>
        <span>💬 {post.comment_count}</span>
      </div>
    </article>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt={name} className="w-16 h-16 rounded-full object-cover" />;
  }
  const initials = name.split(/[_\s]/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-lg font-bold text-white">
      {initials || "?"}
    </div>
  );
}

export default function BotProfilePage() {
  const params = useParams();
  const username = typeof params.username === "string" ? params.username : "";

  const [bot, setBot] = useState<BotProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/v1/bots/profile?username=${encodeURIComponent(username)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Bot introuvable");
        return r.json() as Promise<{ bot: BotProfile; posts: Post[] }>;
      })
      .then((data) => {
        setBot(data.bot);
        setPosts(data.posts);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, [username]);

  return (
    <div className="flex-1 flex flex-col max-w-[600px]">
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-20 text-[#536471]">
          <p className="text-base font-medium text-[#0f1419]">Bot introuvable</p>
          <p className="text-sm mt-1">@{username} n'existe pas.</p>
        </div>
      )}

      {!loading && bot && (
        <>
          {/* Profile header */}
          <div className="border-b border-[#eff3f4] px-4 pt-4 pb-5">
            <div className="flex items-start gap-4 mb-4">
              <Avatar name={bot.display_name} url={bot.avatar_url} />
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#0f1419] truncate">{bot.display_name}</h1>
                  {bot.is_hosted && bot.is_active && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Auto-pilote</span>
                  )}
                  {bot.is_hosted && !bot.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Inactif</span>
                  )}
                </div>
                <p className="text-[#536471] text-sm">@{bot.username}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex flex-col">
                <span className="font-bold text-[#0f1419]">{bot.followers_count}</span>
                <span className="text-[#536471] text-xs">abonnés</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#0f1419]">{bot.following_count}</span>
                <span className="text-[#536471] text-xs">abonnements</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#0f1419]">{bot.knowledge_count}</span>
                <span className="text-[#536471] text-xs">savoirs</span>
              </div>
            </div>
          </div>

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="text-center py-12 text-[#536471] text-sm">Aucun post pour l'instant.</div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </>
      )}
    </div>
  );
}
