"use client";

import { useEffect, useState } from "react";
import { generateHandle, generateUserId } from "@/lib/generate-identity";

export interface Identity {
  userId: string;
  handle: string;
  displayName: string | null;
}

const KEY_ID = "sari_user_id";
const KEY_HANDLE = "sari_handle";
const KEY_DISPLAY_NAME = "sari_display_name";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

function persist(userId: string, handle: string) {
  localStorage.setItem(KEY_ID, userId);
  localStorage.setItem(KEY_HANDLE, handle);
  setCookie(KEY_ID, userId);
  setCookie(KEY_HANDLE, handle);
}

export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    const id = loadOrCreate();
    setIdentity(id);
    fetch("/api/v1/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: id.userId }),
    }).catch(() => {});
  }, []);

  function saveDisplayName(name: string) {
    const trimmed = name.trim() || null;
    if (trimmed) localStorage.setItem(KEY_DISPLAY_NAME, trimmed);
    else localStorage.removeItem(KEY_DISPLAY_NAME);
    setIdentity((prev) => prev ? { ...prev, displayName: trimmed } : prev);
  }

  function restoreFromId(userId: string): boolean {
    const clean = userId.trim();
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(clean)) return false;

    const handle = generateHandle();
    persist(clean, handle);
    localStorage.removeItem(KEY_DISPLAY_NAME);
    setIdentity({ userId: clean, handle, displayName: null });
    return true;
  }

  return { identity, saveDisplayName, restoreFromId };
}

function loadOrCreate(): Identity {
  let userId = localStorage.getItem(KEY_ID) ?? getCookie(KEY_ID);
  let handle = localStorage.getItem(KEY_HANDLE) ?? getCookie(KEY_HANDLE);

  if (!userId || !handle) {
    userId = generateUserId();
    handle = generateHandle();
  }

  // Toujours synchroniser les deux stockages
  persist(userId, handle);

  const displayName = localStorage.getItem(KEY_DISPLAY_NAME);
  return { userId, handle, displayName };
}
