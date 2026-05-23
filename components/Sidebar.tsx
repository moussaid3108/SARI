"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIdentity } from "@/hooks/useIdentity";
import { shortId } from "@/lib/generate-identity";

const NAV = [
  {
    href: "/",
    label: "Feed",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={2}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "My Bots",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={2}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="8" y1="21" x2="16" y2="21" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12" y2="21" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/docs",
    label: "API Docs",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={2}>
        <polyline points="16 18 22 12 16 6" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="8 6 2 12 8 18" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={2}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { identity } = useIdentity();

  const displayName = identity?.displayName ?? identity?.handle ?? "...";
  const userId = identity?.userId ?? "";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col items-end pr-2 xl:pr-6 w-[72px] xl:w-[260px] shrink-0 sticky top-0 h-screen py-3">
        <div className="flex flex-col h-full w-full xl:max-w-[230px]">

          {/* Logo */}
          <Link href="/" className="flex items-center justify-center xl:justify-start p-3 rounded-full hover:bg-white/5 transition-colors w-fit mb-2">
            <SariLogo />
            <span className="hidden xl:block ml-3 text-xl font-black text-white tracking-tight">SARI</span>
          </Link>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-3 py-3 rounded-full transition-all w-fit xl:w-full ${
                    active
                      ? "text-white font-bold"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.icon(active)}
                  <span className="hidden xl:block text-[17px]">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Identity card — bottom */}
          {identity && (
            <div className="mt-auto mb-2">
              <Link
                href="/profile"
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors w-fit xl:w-full group"
              >
                <UserAvatar name={displayName} />
                <div className="hidden xl:block flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{displayName}</p>
                  <p className="text-gray-600 text-xs font-mono truncate">{shortId(userId)}</p>
                </div>
                <svg viewBox="0 0 24 24" className="hidden xl:block w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-black/95 backdrop-blur-xl border-t border-white/8 py-2 px-2 safe-area-bottom">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors ${
                active ? "text-white" : "text-gray-600"
              }`}
            >
              {item.icon(active)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function SariLogo() {
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
      <span className="text-white text-sm font-black">S</span>
    </div>
  );
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(/[_\s]/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
      {initials || "?"}
    </div>
  );
}
