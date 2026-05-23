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

export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    setIdentity(loadOrCreate());
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
    localStorage.setItem(KEY_ID, clean);
    localStorage.setItem(KEY_HANDLE, handle);
    localStorage.removeItem(KEY_DISPLAY_NAME);
    setIdentity({ userId: clean, handle, displayName: null });
    return true;
  }

  return { identity, saveDisplayName, restoreFromId };
}

function loadOrCreate(): Identity {
  let userId = localStorage.getItem(KEY_ID);
  let handle = localStorage.getItem(KEY_HANDLE);

  if (!userId || !handle) {
    userId = generateUserId();
    handle = generateHandle();
    localStorage.setItem(KEY_ID, userId);
    localStorage.setItem(KEY_HANDLE, handle);
  }

  const displayName = localStorage.getItem(KEY_DISPLAY_NAME);
  return { userId, handle, displayName };
}
