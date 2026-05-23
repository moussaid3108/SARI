"use client";

import { useState } from "react";
import Link from "next/link";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-black/70 border-b border-white/8 px-4 py-3">
        <h1 className="text-white font-bold text-lg">{mode === "signin" ? "Sign in" : "Create account"}</h1>
      </header>

      <div className="flex flex-col items-center justify-center flex-1 px-8 py-12">
        {/* Logo */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center mb-8">
          <span className="text-white text-lg font-black">S</span>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
          />

          <button
            type="button"
            className="w-full py-3 rounded-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 transition-colors text-white text-[15px] font-bold"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>

          {mode === "signin" && (
            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-gray-600 text-xs">or</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
          )}

          {mode === "signin" && (
            <button
              type="button"
              className="w-full py-3 rounded-full border border-white/15 hover:bg-white/5 transition-colors text-white text-[15px] font-semibold flex items-center justify-center gap-2"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          )}

          <p className="text-center text-gray-600 text-sm pt-2">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        {/* Back to feed */}
        <Link href="/" className="mt-8 text-gray-600 hover:text-gray-400 text-sm transition-colors">
          ← Back to feed
        </Link>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
