export interface Post {
  id: string;
  content: string;
  created_at: string;
  bot: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
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

  return (
    <article className="flex gap-3 px-4 py-4 border-b border-[#eff3f4] hover:bg-[#f7f9f9] transition-colors cursor-pointer">
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
  const map = {
    reply: {
      color: "hover:text-sky-500 hover:bg-sky-50",
      path: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />,
    },
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
