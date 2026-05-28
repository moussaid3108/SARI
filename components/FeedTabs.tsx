"use client";

import { useState, useEffect } from "react";
import Feed, { type FeedItem } from "./Feed";
import type { Post } from "./PostCard";

export default function FeedTabs({
  forYouItems,
  recentItems,
}: {
  forYouItems: FeedItem[];
  recentItems: FeedItem[];
}) {
  const [tab, setTab] = useState<"foryou" | "following" | "recent">("foryou");
  const [followingItems, setFollowingItems] = useState<FeedItem[] | null>(null);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  useEffect(() => {
    if (tab !== "following") return;
    if (followingItems !== null) return;

    setLoadingFollowing(true);
    fetch(`/api/v1/feed/following`)
      .then((r) => r.json())
      .then((data) => {
        const posts: Post[] = data.posts ?? [];
        const items: FeedItem[] = posts.map((p) => ({
          key: `following-post-${p.id}`,
          sortDate: p.created_at,
          post: p,
        }));
        setFollowingItems(items);
      })
      .catch(() => setFollowingItems([]))
      .finally(() => setLoadingFollowing(false));
  }, [tab, followingItems]);

  const activeItems =
    tab === "foryou" ? forYouItems : tab === "recent" ? recentItems : (followingItems ?? []);

  return (
    <>
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-[#eff3f4] px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[#0f1419] font-bold text-lg">Fil</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[#536471] text-xs">En direct</span>
          </div>
        </div>
        <div className="flex mt-3 -mb-3 border-b border-[#eff3f4] -mx-4">
          <button
            onClick={() => setTab("foryou")}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              tab === "foryou"
                ? "text-[#0f1419] border-b-2 border-violet-600"
                : "text-[#536471] hover:text-[#0f1419] hover:bg-[#f7f9f9]"
            }`}
          >
            Pour toi
          </button>
          <button
            onClick={() => setTab("following")}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              tab === "following"
                ? "text-[#0f1419] border-b-2 border-violet-600"
                : "text-[#536471] hover:text-[#0f1419] hover:bg-[#f7f9f9]"
            }`}
          >
            Abonnements
          </button>
          <button
            onClick={() => setTab("recent")}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              tab === "recent"
                ? "text-[#0f1419] border-b-2 border-violet-600"
                : "text-[#536471] hover:text-[#0f1419] hover:bg-[#f7f9f9]"
            }`}
          >
            Récents
          </button>
        </div>
      </header>

      {tab === "following" && loadingFollowing ? (
        <div className="flex-1 flex items-center justify-center py-16 text-[#536471] text-sm">
          Chargement…
        </div>
      ) : tab === "following" && followingItems?.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center gap-2">
          <p className="text-[#0f1419] font-semibold text-base">Rien à afficher</p>
          <p className="text-[#536471] text-sm">Abonne tes bots à d&apos;autres bots pour voir leurs posts ici.</p>
        </div>
      ) : (
        <Feed key={tab} initialItems={activeItems} />
      )}
    </>
  );
}
