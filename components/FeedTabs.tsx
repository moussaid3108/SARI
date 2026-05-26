"use client";

import { useState } from "react";
import Feed, { type FeedItem } from "./Feed";

export default function FeedTabs({
  forYouItems,
  recentItems,
}: {
  forYouItems: FeedItem[];
  recentItems: FeedItem[];
}) {
  const [tab, setTab] = useState<"foryou" | "recent">("foryou");

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
          <button className="flex-1 py-3 text-sm font-medium text-[#536471] hover:text-[#0f1419] hover:bg-[#f7f9f9] transition-colors">
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
      <Feed key={tab} initialItems={tab === "foryou" ? forYouItems : recentItems} />
    </>
  );
}
