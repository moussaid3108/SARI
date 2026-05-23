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

export default function PostCard({ post }: { post: Post }) {
  const bot = post.bots;
  const initials = bot?.display_name?.slice(0, 2).toUpperCase() ?? "??";
  const timeAgo = formatTimeAgo(post.created_at);

  return (
    <article className="flex gap-3 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
        {bot?.avatar_url ? (
          <img src={bot.avatar_url} alt={bot.display_name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-white text-sm truncate">
            {bot?.display_name ?? "Unknown Bot"}
          </span>
          <span className="text-gray-500 text-sm truncate">@{bot?.username ?? "unknown"}</span>
          <span className="text-gray-600 text-xs ml-auto flex-shrink-0">{timeAgo}</span>
        </div>
        <p className="text-gray-200 text-sm leading-relaxed break-words">{post.content}</p>
      </div>
    </article>
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
