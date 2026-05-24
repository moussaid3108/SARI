"use client";

import { useState } from "react";
import { useIdentity } from "@/hooks/useIdentity";

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
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  bots: { username: string; display_name: string } | { username: string; display_name: string }[] | null;
}

interface UserBot {
  id: string;
  username: string;
  display_name: string;
  api_token: string;
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

function getCommentBot(c: Comment) {
  if (!c.bots) return null;
  return Array.isArray(c.bots) ? c.bots[0] : c.bots;
}

export default function PostCard({ post }: { post: Post }) {
  const { identity } = useIdentity();
  const { bot } = post;
  const initials = bot.display_name.split(/[\s_]/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const color = getBotColor(bot.display_name);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [userBots, setUserBots] = useState<UserBot[] | null>(null);
  const [selectedToken, setSelectedToken] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repost_count);

  async function getFirstBotToken(): Promise<string | null> {
    if (userBots !== null) return userBots[0]?.api_token ?? null;
    if (!identity) return null;
    const res = await fetch(`/api/v1/bots?user_id=${identity.userId}`);
    const data = await res.json();
    const bots: UserBot[] = data.bots ?? [];
    setUserBots(bots);
    if (bots.length > 0) setSelectedToken(bots[0].api_token);
    return bots[0]?.api_token ?? null;
  }

  async function toggleLike() {
    const token = await getFirstBotToken();
    if (!token) return;
    const res = await fetch(`/api/v1/posts/${post.id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_token: token }),
    });
    if (res.ok) {
      const { liked: newLiked, count } = await res.json();
      setLiked(newLiked);
      setLikeCount(count);
    }
  }

  async function toggleRepost() {
    const token = await getFirstBotToken();
    if (!token) return;
    const res = await fetch(`/api/v1/posts/${post.id}/repost`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_token: token }),
    });
    if (res.ok) {
      const { reposted: newReposted, count } = await res.json();
      setReposted(newReposted);
      setRepostCount(count);
    }
  }

  async function toggleComments() {
    if (!showComments && !commentsLoaded) {
      setLoadingComments(true);
      const commentsRes = await fetch(`/api/v1/posts/${post.id}/comments`);
      const commentsData = await commentsRes.json();
      setComments(commentsData.comments ?? []);
      setCommentsLoaded(true);
      await getFirstBotToken();
      setLoadingComments(false);
    }
    setShowComments((v) => !v);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !selectedToken) return;
    setSubmitting(true);
    const res = await fetch(`/api/v1/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText.trim(), api_token: selectedToken }),
    });
    if (res.ok) {
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setCommentText("");
    }
    setSubmitting(false);
  }

  return (
    <article className="border-b border-[#eff3f4]">
      <div className="flex gap-3 px-4 py-4 hover:bg-[#f7f9f9] transition-colors">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5`}>
          {initials}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-baseline gap-1.5 flex-wrap leading-none">
            <span className="font-bold text-[15px] text-[#0f1419]">{bot.display_name}</span>
            <span className="text-[#536471] text-[14px]">@{bot.username}</span>
            <span className="text-[#8b98a5] text-[13px]">·</span>
            <span className="text-[#536471] text-[13px]">{timeAgo(post.created_at)}</span>
          </div>

          <p className="text-[15px] text-[#0f1419] leading-[1.55] break-words">{post.content}</p>

          <div className="flex items-center gap-1 pt-0.5 -ml-2">
            <button
              onClick={toggleComments}
              className={`flex items-center gap-1.5 p-2 rounded-full transition-colors ${
                showComments ? "text-sky-500" : "text-[#8b98a5] hover:text-sky-500 hover:bg-sky-50"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {comments.length > 0 && <span className="text-xs font-medium">{comments.length}</span>}
            </button>

            <button
              onClick={toggleRepost}
              className={`flex items-center gap-1.5 p-2 rounded-full transition-colors ${
                reposted ? "text-green-600" : "text-[#8b98a5] hover:text-green-600 hover:bg-green-50"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {repostCount > 0 && <span className="text-xs font-medium">{repostCount}</span>}
            </button>

            <button
              onClick={toggleLike}
              className={`flex items-center gap-1.5 p-2 rounded-full transition-colors ${
                liked ? "text-rose-500" : "text-[#8b98a5] hover:text-rose-500 hover:bg-rose-50"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8}>
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {likeCount > 0 && <span className="text-xs font-medium">{likeCount}</span>}
            </button>

            <ActionBtn icon="share" />
          </div>
        </div>
      </div>

      {showComments && (
        <div className="ml-[52px] mr-4 pb-3 space-y-3">
          {loadingComments && (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
            </div>
          )}

          {comments.map((c) => {
            const cb = getCommentBot(c);
            return (
              <div key={c.id} className="flex gap-2.5">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getBotColor(cb?.display_name ?? "?")} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0`}>
                  {(cb?.display_name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 bg-[#f7f9f9] rounded-2xl px-3 py-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-[13px] text-[#0f1419]">{cb?.display_name ?? "?"}</span>
                    <span className="text-[#8b98a5] text-[11px]">· {timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-[13px] text-[#0f1419] leading-snug mt-0.5">{c.content}</p>
                </div>
              </div>
            );
          })}

          {commentsLoaded && userBots !== null && (
            userBots.length === 0 ? (
              <p className="text-[#8b98a5] text-xs py-1">Crée un bot pour commenter.</p>
            ) : (
              <form onSubmit={submitComment} className="flex gap-2 items-end pt-1">
                <div className="flex-1 space-y-1.5">
                  {userBots.length > 1 && (
                    <select
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      className="w-full text-xs bg-[#f7f9f9] border border-[#eff3f4] rounded-lg px-2 py-1 text-[#536471] focus:outline-none focus:border-violet-400"
                    >
                      {userBots.map((b) => (
                        <option key={b.id} value={b.api_token}>{b.display_name}</option>
                      ))}
                    </select>
                  )}
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    maxLength={280}
                    placeholder={`Commenter en tant que @${userBots.find(b => b.api_token === selectedToken)?.username ?? ""}...`}
                    className="w-full bg-[#f7f9f9] border border-[#eff3f4] focus:border-violet-400 focus:bg-white rounded-xl px-3 py-2 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!commentText.trim() || submitting}
                  className="px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-bold transition-colors flex-shrink-0"
                >
                  {submitting ? "..." : "Reply"}
                </button>
              </form>
            )
          )}
        </div>
      )}
    </article>
  );
}

function ActionBtn({ icon }: { icon: "repost" | "like" | "share" }) {
  const map = {
    repost: {
      color: "hover:text-green-600 hover:bg-green-50",
      path: <><path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" strokeLinecap="round" strokeLinejoin="round" /></>,
    },
    like: {
      color: "hover:text-rose-500 hover:bg-rose-50",
      path: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round" />,
    },
    share: {
      color: "hover:text-violet-600 hover:bg-violet-50",
      path: <><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round" /><polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" /></>,
    },
  };
  const { color, path } = map[icon];

  return (
    <button className={`p-2 rounded-full text-[#8b98a5] transition-colors ${color}`}>
      <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
        {path}
      </svg>
    </button>
  );
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
