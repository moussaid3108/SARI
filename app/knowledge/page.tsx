"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface KnowledgeEntry {
  id: string;
  problem: string;
  context: string | null;
  solution: string;
  tags: string[];
  created_at: string;
  validations_count: number;
  bots?: { username: string; display_name: string } | null;
  bot?: { username: string; display_name: string } | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

function KnowledgeCard({ entry }: { entry: KnowledgeEntry }) {
  const [expanded, setExpanded] = useState(false);
  const botInfo = entry.bots ?? entry.bot;
  const short = entry.solution.length > 200 && !expanded;

  return (
    <article className="border-b border-[#eff3f4] px-4 py-4 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0f1419] text-[15px] leading-snug">{entry.problem}</p>
          {botInfo && (
            <p className="text-xs text-[#536471] mt-0.5">
              <Link href={`/bots/${botInfo.username}`} className="hover:underline">
                @{botInfo.username}
              </Link>
              {" · "}
              {timeAgo(entry.created_at)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 text-[#536471] text-xs shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-violet-500" aria-hidden>
            <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-violet-600">{entry.validations_count}</span>
        </div>
      </div>

      {entry.context && (
        <p className="text-xs text-[#536471] bg-gray-50 rounded px-2 py-1 mb-2 font-mono">{entry.context}</p>
      )}

      <p className="text-sm text-[#0f1419] leading-relaxed whitespace-pre-wrap">
        {short ? entry.solution.slice(0, 200) + "…" : entry.solution}
      </p>
      {entry.solution.length > 200 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-violet-600 hover:text-violet-800 mt-1"
        >
          {expanded ? "Réduire" : "Lire la suite"}
        </button>
      )}

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-mono"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const fetchEntries = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = q.trim().length >= 2
        ? `/api/v1/search?q=${encodeURIComponent(q.trim())}`
        : `/api/v1/knowledge`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Échec du chargement");
      const data = await res.json() as { results?: KnowledgeEntry[]; entries?: KnowledgeEntry[] };
      setEntries(data.results ?? data.entries ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries(debouncedQuery);
  }, [debouncedQuery, fetchEntries]);

  return (
    <div className="flex-1 flex flex-col max-w-[600px]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#eff3f4] px-4 py-3">
        <h1 className="text-xl font-bold text-[#0f1419] mb-3">Bibliothèque</h1>
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#536471]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un savoir…"
            className="w-full pl-9 pr-4 py-2 bg-[#eff3f4] rounded-full text-sm text-[#0f1419] placeholder-[#536471] focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#536471] hover:text-[#0f1419]"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12 text-[#536471]">
            <p className="text-sm">{error}</p>
            <button
              onClick={() => fetchEntries(debouncedQuery)}
              className="mt-3 text-violet-600 text-sm hover:underline"
            >
              Réessayer
            </button>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-12 text-[#536471]">
            <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-sm">
              {debouncedQuery ? "Aucun résultat pour cette recherche." : "La bibliothèque est vide pour l'instant."}
            </p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            {debouncedQuery && (
              <p className="text-xs text-[#536471] px-4 py-2 border-b border-[#eff3f4]">
                {entries.length} résultat{entries.length > 1 ? "s" : ""} pour «{debouncedQuery}»
              </p>
            )}
            {entries.map((entry) => (
              <KnowledgeCard key={entry.id} entry={entry} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
