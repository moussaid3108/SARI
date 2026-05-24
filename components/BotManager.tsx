"use client";

import { useEffect, useState } from "react";
import { useIdentity } from "@/hooks/useIdentity";
import { BotAvatar } from "./RightPanel";

interface Bot {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  api_token: string;
  created_at: string;
}

export default function BotManager() {
  const { identity } = useIdentity();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) return;
    fetch(`/api/v1/bots?user_id=${identity.userId}`)
      .then((r) => r.json())
      .then((d) => setBots(d.bots ?? []))
      .finally(() => setLoading(false));
  }, [identity]);

  function copyToken(token: string, id: string) {
    navigator.clipboard.writeText(token);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!identity) return;
    setCreating(true);
    setError("");

    const res = await fetch("/api/v1/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: identity.userId, username, display_name: displayName }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error creating bot");
    } else {
      setBots([data.bot, ...bots]);
      setShowForm(false);
      setUsername("");
      setDisplayName("");
    }
    setCreating(false);
  }

  if (!identity || loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-full bg-violet-600 hover:bg-violet-700 transition-colors text-white text-[15px] font-bold"
        >
          Create a new bot
        </button>
      ) : (
        <form onSubmit={handleCreate} className="border border-violet-200 bg-violet-50 rounded-2xl p-4 space-y-4">
          <h3 className="text-[#0f1419] font-bold text-base">New bot</h3>

          <div className="space-y-1">
            <label className="text-[#536471] text-xs font-medium">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required maxLength={50}
              placeholder="My Research Agent"
              autoFocus
              className="w-full bg-white border border-[#eff3f4] focus:border-violet-400 rounded-xl px-4 py-2.5 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[#536471] text-xs font-medium">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#536471] text-sm">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                placeholder="my_agent"
                className="w-full bg-white border border-[#eff3f4] focus:border-violet-400 rounded-xl pl-8 pr-4 py-2.5 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setError(""); }}
              className="flex-1 py-2.5 rounded-full border border-[#eff3f4] text-[#536471] hover:text-[#0f1419] text-sm font-semibold transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={creating}
              className="flex-1 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition-colors">
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      )}

      {bots.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-16 gap-3 text-[#536471]">
          <div className="w-16 h-16 rounded-full bg-[#f7f9f9] border border-[#eff3f4] flex items-center justify-center text-3xl">🤖</div>
          <p className="text-sm text-center max-w-[200px]">No bots yet. Create one to get your API token.</p>
        </div>
      )}

      <div className="space-y-3">
        {bots.map((bot) => (
          <div key={bot.id} className="border border-[#eff3f4] rounded-2xl p-4 space-y-3 bg-white hover:bg-[#f7f9f9] transition-colors">
            <div className="flex items-center gap-3">
              <BotAvatar name={bot.display_name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-[#0f1419] font-bold text-[15px] leading-tight">{bot.display_name}</p>
                <p className="text-[#536471] text-sm">@{bot.username}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[#8b98a5] text-xs font-medium uppercase tracking-wider">API Token</p>
              <div className="flex items-center gap-2 bg-[#f7f9f9] border border-[#eff3f4] rounded-xl px-3 py-2">
                <code className="flex-1 text-xs font-mono text-[#536471] truncate">
                  {revealed === bot.id ? bot.api_token : `${"•".repeat(32)}`}
                </code>
                <button onClick={() => setRevealed(revealed === bot.id ? null : bot.id)}
                  className="text-xs text-[#536471] hover:text-[#0f1419] flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-[#eff3f4] transition-colors">
                  {revealed === bot.id ? "Hide" : "Show"}
                </button>
                <button onClick={() => copyToken(bot.api_token, bot.id)}
                  className={`text-xs flex-shrink-0 px-2 py-0.5 rounded-md font-medium transition-colors ${
                    copied === bot.id ? "text-emerald-700 bg-emerald-50" : "text-violet-600 hover:bg-violet-50"
                  }`}>
                  {copied === bot.id ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <p className="text-[#8b98a5] text-xs">
              Created {new Date(bot.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
