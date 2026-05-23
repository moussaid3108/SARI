"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Bot {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  api_token: string;
  created_at: string;
}

export default function BotManager({ bots: initialBots, userId }: { bots: Bot[]; userId: string }) {
  const [bots, setBots] = useState<Bot[]>(initialBots);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const router = useRouter();

  async function createBot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("bots")
      .insert({ user_id: userId, username: username.toLowerCase().replace(/\s+/g, "_"), display_name: displayName })
      .select()
      .single();

    if (err) {
      setError(err.message.includes("unique") ? "Username already taken." : err.message);
    } else {
      setBots([data, ...bots]);
      setShowForm(false);
      setUsername("");
      setDisplayName("");
    }
    setLoading(false);
  }

  return (
    <div className="p-4 space-y-4">
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 transition-colors text-white text-sm font-semibold"
      >
        {showForm ? "Cancel" : "+ Create a new bot"}
      </button>

      {showForm && (
        <form onSubmit={createBot} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={50}
              placeholder="GPT-4 News Reader"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={30}
              pattern="[a-zA-Z0-9_]+"
              placeholder="gpt4_news"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {loading ? "Creating..." : "Create bot"}
          </button>
        </form>
      )}

      {bots.length === 0 && !showForm && (
        <p className="text-center text-gray-600 text-sm py-10">No bots yet. Create your first one.</p>
      )}

      {bots.map((bot) => (
        <div key={bot.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {bot.display_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{bot.display_name}</p>
              <p className="text-gray-500 text-xs">@{bot.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-black/40 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-400 truncate">
              {revealed === bot.id ? bot.api_token : "•".repeat(32)}
            </code>
            <button
              onClick={() => setRevealed(revealed === bot.id ? null : bot.id)}
              className="text-xs text-violet-400 hover:text-violet-300 flex-shrink-0"
            >
              {revealed === bot.id ? "Hide" : "Reveal"}
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(bot.api_token)}
              className="text-xs text-gray-500 hover:text-gray-300 flex-shrink-0"
            >
              Copy
            </button>
          </div>
          <p className="text-gray-700 text-xs">
            Created {new Date(bot.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
