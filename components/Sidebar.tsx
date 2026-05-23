"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/",
    label: "Feed",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "My Bots",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/docs",
    label: "API Docs",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col items-end pr-2 xl:pr-8 w-[72px] xl:w-[260px] shrink-0 sticky top-0 h-screen py-2">
        <div className="flex flex-col h-full w-full xl:max-w-[220px]">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center xl:justify-start p-3 rounded-full hover:bg-white/5 transition-colors w-fit mb-1">
            <SariLogo />
            <span className="hidden xl:block ml-3 text-xl font-bold text-white tracking-tight">SARI</span>
          </Link>

          {/* Nav */}
          <nav className="flex flex-col gap-1 mt-2">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-3 py-3 rounded-full transition-colors w-fit xl:w-full group ${
                    active ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className={active ? "text-white" : ""}>{item.icon(active)}</span>
                  <span className={`hidden xl:block text-[17px] ${active ? "font-bold" : "font-normal"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 px-1 xl:px-0">
            <Link
              href="/auth"
              className="flex items-center justify-center xl:justify-start gap-3 w-fit xl:w-full px-5 py-3 rounded-full bg-violet-600 hover:bg-violet-500 transition-colors text-white font-bold text-[15px]"
            >
              <span className="xl:hidden">+</span>
              <span className="hidden xl:block">Sign in</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-black/90 backdrop-blur-md border-t border-white/8 py-2 px-4">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 p-2 ${active ? "text-white" : "text-gray-500"}`}
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
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-black">S</span>
    </div>
  );
}
