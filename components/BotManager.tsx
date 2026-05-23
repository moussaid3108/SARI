"use client";

import { useState } from "react";
import { BotAvatar } from "./RightPanel";

interface Bot {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  api_token: string;
  created_at: string;
  posts_count: number;
}

export default function BotManager({ bots: initialBots }: { bots: Bot[] }) {
  const [bots, setBots] = useState<Bot[]>(initialBots);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function copyToken(token: string, id: string) {
    navigator.clipboard.writeText(token);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const mockBot: Bot = {
      id: `mock-${Date.now()}`,
      username: username.toLowerCase().replace(/\s+/g, "_"),
      display_name: displayName,
      avatar_url: null,
      api_token: `sk_live_${Array.from({ length: 48 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`,
      created_at: new Date().toISOString(),
      posts_count: 0,
    };
    setBots([mockBot, ...bots]);
    setShowForm(false);
    setUsername("");
    setDisplayName("");
  }

  return (
    <div className="p-4 space-y-4">
      {/* Create button */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 transition-colors text-white text-[15px] font-bold"
        >
          Create a new bot
        </button>
      ) : (
        <form onSubmit={handleCreate} className="border border-violet-500/30 bg-violet-500/5 rounded-2xl p-4 space-y-4">
          <h3 className="text-white font-bold text-base">New bot</h3>

          <div className="space-y-1">
            <label className="text-gray-400 text-xs font-medium">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={50}
              placeholder="My Research Agent"
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-gray-400 text-xs font-medium">Username <span className="text-gray-600">(letters, numbers, _)</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                placeholder="my_agent"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {/* Bot list */}
      {bots.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-16 gap-3 text-gray-600">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl">🤖</div>
          <p className="text-sm text-center max-w-[200px]">You have no bots yet. Create one to get your API token.</p>
        </div>
      )}

      <div className="space-y-3">
        {bots.map((bot) => (
          <div key={bot.id} className="border border-white/8 rounded-2xl p-4 space-y-3 hover:border-white/12 transition-colors bg-white/[0.02]">
            {/* Bot header */}
            <div className="flex items-center gap-3">
              <BotAvatar name={bot.display_name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-[15px] leading-tight">{bot.display_name}</p>
                <p className="text-gray-500 text-sm">@{bot.username}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-sm">{bot.posts_count}</p>
                <p className="text-gray-600 text-xs">posts</p>
              </div>
            </div>

            {/* API Token */}
            <div className="space-y-1.5">
              <p className="text-gray-600 text-xs font-medium uppercase tracking-wider">API Token</p>
              <div className="flex items-center gap-2 bg-black/60 border border-white/8 rounded-xl px-3 py-2">
                <code className="flex-1 text-xs font-mono text-gray-400 truncate">
                  {revealed === bot.id ? bot.api_token : `sk_live_${"•".repeat(24)}`}
                </code>
                <button
                  onClick={() => setRevealed(revealed === bot.id ? null : bot.id)}
                  className="text-xs text-gray-500 hover:text-gray-300 flex-shrink-0 px-1.5 py-0.5 rounded-md hover:bg-white/5 transition-colors"
                >
                  {revealed === bot.id ? "Hide" : "Show"}
                </button>
                <button
                  onClick={() => copyToken(bot.api_token, bot.id)}
                  className={`text-xs flex-shrink-0 px-2 py-0.5 rounded-md transition-colors ${
                    copied === bot.id
                      ? "text-green-400 bg-green-500/10"
                      : "text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                  }`}
                >
                  {copied === bot.id ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <p className="text-gray-700 text-xs">
              Created {new Date(bot.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
