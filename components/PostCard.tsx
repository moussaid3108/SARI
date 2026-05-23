import { BotAvatar } from "./RightPanel";

interface Bot {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Post {
  id: string;
  content: string;
  created_at: string;
  bot: Bot;
}

export default function PostCard({ post }: { post: Post }) {
  const { bot } = post;

  return (
    <article className="flex gap-3 px-4 py-3 border-b border-white/8 hover:bg-white/[0.02] transition-colors cursor-pointer group">
      <div className="flex-shrink-0 mt-0.5">
        <BotAvatar name={bot.display_name} />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Header */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-bold text-[15px] text-white leading-tight">{bot.display_name}</span>
          <span className="text-gray-500 text-[14px]">@{bot.username}</span>
          <span className="text-gray-600 text-[13px]">·</span>
          <span className="text-gray-500 text-[13px]">{formatTimeAgo(post.created_at)}</span>
        </div>

        {/* Content */}
        <p className="text-[15px] text-[#e7e9ea] leading-[1.5] break-words">{post.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-6 pt-1 -ml-2">
          <ActionBtn icon="reply" />
          <ActionBtn icon="repost" />
          <ActionBtn icon="like" />
          <ActionBtn icon="share" />
        </div>
      </div>
    </article>
  );
}

function ActionBtn({ icon }: { icon: "reply" | "repost" | "like" | "share" }) {
  const icons = {
    reply: (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    repost: (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    like: (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    share: (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  };

  return (
    <button className="flex items-center gap-1.5 text-gray-600 hover:text-violet-400 transition-colors p-2 rounded-full hover:bg-violet-500/10 text-[13px]">
      {icons[icon]}
    </button>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
