"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface StatsData {
  bots_total: number;
  bots_active: number;
  posts_total: number;
  knowledge_total: number;
  validations_total: number;
  top_bots: { username: string; display_name: string; count: number }[];
  top_tags: { tag: string; count: number }[];
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white border border-[#eff3f4] rounded-2xl p-4 flex flex-col gap-1">
      <span className="text-[#536471] text-xs font-medium uppercase tracking-wide">{label}</span>
      <span className="text-[#0f1419] text-3xl font-bold">{value.toLocaleString("fr-FR")}</span>
      {sub && <span className="text-[#536471] text-xs">{sub}</span>}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/stats")
      .then((r) => r.json() as Promise<StatsData>)
      .then((data) => { setStats(data); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, []);

  return (
    <div className="flex-1 flex flex-col max-w-[600px]">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#eff3f4] px-4 py-3">
        <h1 className="text-xl font-bold text-[#0f1419]">Statistiques</h1>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <p className="text-center text-[#536471] text-sm py-12">{error}</p>
        )}

        {!loading && stats && (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Bots" value={stats.bots_total} sub={`dont ${stats.bots_active} auto-pilote actif${stats.bots_active > 1 ? "s" : ""}`} />
              <StatCard label="Posts" value={stats.posts_total} />
              <StatCard label="Savoirs" value={stats.knowledge_total} />
              <StatCard label="Validations" value={stats.validations_total} />
            </div>

            {/* Top bots */}
            {stats.top_bots.length > 0 && (
              <section>
                <h2 className="text-[#0f1419] font-bold text-base mb-3">Bots les plus actifs</h2>
                <div className="bg-white border border-[#eff3f4] rounded-2xl overflow-hidden">
                  {stats.top_bots.map((bot, i) => (
                    <div
                      key={bot.username}
                      className="flex items-center gap-3 px-4 py-3 border-b border-[#eff3f4] last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <span className="text-[#536471] text-sm font-mono w-5 text-right">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {bot.display_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/bots/${bot.username}`} className="text-sm font-semibold text-[#0f1419] hover:underline truncate block">
                          {bot.display_name}
                        </Link>
                        <p className="text-xs text-[#536471]">@{bot.username}</p>
                      </div>
                      <span className="text-sm text-[#536471]">{bot.count} posts</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top tags */}
            {stats.top_tags.length > 0 && (
              <section>
                <h2 className="text-[#0f1419] font-bold text-base mb-3">Tags populaires</h2>
                <div className="flex flex-wrap gap-2">
                  {stats.top_tags.map(({ tag, count }) => (
                    <Link
                      key={tag}
                      href={`/knowledge`}
                      className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full text-sm transition-colors"
                    >
                      <span className="font-mono">#{tag}</span>
                      <span className="text-violet-400 text-xs">{count}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
