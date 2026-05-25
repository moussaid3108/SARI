"use client";

import { useState } from "react";

export interface Post {
  id: string;
  content: string;
  created_at: string;
  bot: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  like_count: number;
  repost_count: number;
  comment_count: number;
  reply_to_id?: string | null;
  reply_to_username?: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  bots: { username: string; display_name: string } | { username: string; display_name: string }[] | null;
}

interface ParentPost {
  id: string;
  content: string;
  created_at: string;
  bots: { username: string; display_name: string } | { username: string; display_name: string }[] | null;
}

const BOT_COLORS = [
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-violet-500",
];

function getBotColor(name: string) {
  return BOT_COLORS[name.charCodeAt(0) % BOT_COLORS.length];
}

export default function PostCard({ post }: { post: Post }) {
  const { bot } = post;
  const initials = bot.display_name.split(/[\s_]/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const color = getBotColor(bot.display_name);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const [parentPost, setParentPost] = useState<ParentPost | null>(null);
  const [showParent, setShowParent] = useState(false);
  const [loadingParent, setLoadingParent] = useState(false);

  async function toggleParent() {
    if (!post.reply_to_id) return;
    if (!showParent && !parentPost) {
      setLoadingParent(true);
      const res = await fetch(`/api/v1/posts/${post.reply_to_id}`);
      const data = await res.json();
      if (data.post) setParentPost(data.post);
      setLoadingParent(false);
    }
    setShowParent((v) => !v);
  }

  async function toggleComments() {
    if (!showComments && !loaded) {
      setLoading(true);
      const res = await fetch(`/api/v1/posts/${post.id}/comments`);
      const data = await res.json();
      setComments(data.comments ?? []);
      setLoaded(true);
      setLoading(false);
    }
    setShowComments((v) => !v);
  }

  return (
    <article className="border-b border-[#eff3f4]">
      <div className={`flex gap-3 px-4 py-4 hover:bg-[#f7f9f9] transition-colors ${post.reply_to_id ? "pt-2" : ""}`}>
        <div className="flex flex-col items-center flex-shrink-0">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-[11px] font-bold text-white mt-0.5`}>
            {initials}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {post.reply_to_username && (
            <button
              onClick={toggleParent}
              className="flex items-center gap-1 text-[#536471] text-xs hover:text-violet-500 transition-colors w-fit"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="9 14 4 9 9 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 20v-7a4 4 0 00-4-4H4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>En réponse à <span className="text-violet-500 font-medium">@{post.reply_to_username}</span></span>
              {loadingParent && <div className="w-3 h-3 rounded-full border border-violet-400 border-t-transparent animate-spin ml-1" />}
            </button>
          )}

          {/* Post parent affiché inline */}
          {showParent && parentPost && (() => {
            const pb = Array.isArray(parentPost.bots) ? parentPost.bots[0] : parentPost.bots;
            return (
              <div className="border border-[#eff3f4] rounded-xl px-3 py-2.5 bg-[#f7f9f9] space-y-1 -mt-0.5">
                <div className="flex items-baseline gap-1.5 flex-wrap leading-none">
                  <span className="font-semibold text-[13px] text-[#0f1419]">{pb?.display_name ?? "?"}</span>
                  <span className="text-[#8b98a5] text-[12px]">@{pb?.username ?? "?"}</span>
                  <span className="text-[#8b98a5] text-[11px]">· {timeAgo(parentPost.created_at)}</span>
                </div>
                <p className="text-[13px] text-[#536471] leading-snug line-clamp-4">{parentPost.content}</p>
              </div>
            );
          })()}

          <div className="flex items-baseline gap-1.5 flex-wrap leading-none">
            <span className="font-bold text-[15px] text-[#0f1419]">{bot.display_name}</span>
            <span className="text-[#536471] text-[14px]">@{bot.username}</span>
            <span className="text-[#8b98a5] text-[13px]">·</span>
            <span className="text-[#536471] text-[13px]">{timeAgo(post.created_at)}</span>
          </div>

          <p className="text-[15px] text-[#0f1419] leading-[1.55] break-words">{post.content}</p>

          <div className="flex items-center gap-4 pt-0.5 -ml-1">
            {/* Commentaires — cliquable */}
            <button
              onClick={toggleComments}
              className={`flex items-center gap-1.5 transition-colors ${
                showComments ? "text-sky-500" : "text-sky-400 hover:text-sky-500"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-[16px] h-[16px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[13px] font-medium tabular-nums">
                {post.comment_count > 0 ? post.comment_count : ""}
              </span>
            </button>

            <Stat
              count={post.repost_count}
              color="text-emerald-500"
              icon={
                <svg viewBox="0 0 24 24" className="w-[16px] h-[16px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <Stat
              count={post.like_count}
              color="text-rose-400"
              icon={
                <svg viewBox="0 0 24 24" className="w-[16px] h-[16px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
        </div>
      </div>

      {/* Section commentaires — lecture seule */}
      {showComments && (
        <div className="ml-[52px] mr-4 pb-4 space-y-3 border-t border-[#eff3f4] pt-3">
          {loading && (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 rounded-full border-2 border-sky-300 border-t-transparent animate-spin" />
            </div>
          )}

          {loaded && comments.length === 0 && (
            <p className="text-[#8b98a5] text-xs py-1">Aucun commentaire pour l'instant.</p>
          )}

          {comments.map((c) => {
            const cb = Array.isArray(c.bots) ? c.bots[0] : c.bots;
            const cbName = cb?.display_name ?? "?";
            return (
              <div key={c.id} className="flex gap-2.5">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getBotColor(cbName)} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5`}>
                  {cbName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 bg-[#f7f9f9] rounded-2xl px-3 py-2">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-semibold text-[13px] text-[#0f1419]">{cbName}</span>
                    <span className="text-[#536471] text-[12px]">@{cb?.username ?? "?"}</span>
                    <span className="text-[#8b98a5] text-[11px]">· {timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-[13px] text-[#0f1419] leading-snug mt-0.5">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function Stat({ count, icon, color }: { count: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      {icon}
      <span className="text-[13px] font-medium tabular-nums">
        {count > 0 ? count : ""}
      </span>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
