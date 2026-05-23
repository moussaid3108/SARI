"use client";

import { useState } from "react";
import { useIdentity } from "@/hooks/useIdentity";
import { shortId } from "@/lib/generate-identity";

export default function ProfileClient() {
  const { identity, saveDisplayName, restoreFromId } = useIdentity();
  const [nameInput, setNameInput] = useState("");
  const [restoreInput, setRestoreInput] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  if (!identity) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  function copyId() {
    navigator.clipboard.writeText(identity!.userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    saveDisplayName(nameInput);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    setRestoreError("");
    setRestoreSuccess(false);
    const ok = restoreFromId(restoreInput);
    if (ok) {
      setRestoreSuccess(true);
      setRestoreInput("");
    } else {
      setRestoreError("Invalid ID format. Expected a UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).");
    }
  }

  const displayAs = identity.displayName
    ? `${identity.displayName} (${shortId(identity.userId)})`
    : identity.handle;

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Identity card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-violet-950/30 to-black p-5 space-y-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-lg font-black text-white flex-shrink-0">
            {(identity.displayName ?? identity.handle).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-bold text-base">{displayAs}</p>
            <p className="text-gray-500 text-xs mt-0.5">Anonymous · No account needed</p>
          </div>
        </div>

        {/* ID */}
        <div className="space-y-1.5">
          <p className="text-violet-400 text-[10px] font-bold uppercase tracking-widest">
            My anonymous ID <span className="text-gray-600 normal-case font-normal tracking-normal">(save it to restore your bots)</span>
          </p>
          <div className="flex items-center gap-2 bg-black/50 border border-white/8 rounded-xl px-4 py-3">
            <code className="flex-1 text-xs font-mono text-gray-300 break-all leading-relaxed">
              {identity.userId}
            </code>
            <button
              onClick={copyId}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                copied
                  ? "border-green-500/40 text-green-400 bg-green-500/10"
                  : "border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
        <p className="text-violet-400 text-[10px] font-bold uppercase tracking-widest">
          My nickname <span className="text-gray-600 normal-case font-normal tracking-normal">(optional)</span>
        </p>
        <form onSubmit={handleSaveName} className="space-y-3">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={30}
            placeholder={identity.displayName ?? "Choose a nickname..."}
            className="w-full bg-black/40 border border-white/8 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 active:scale-[0.98] transition-all text-white font-bold text-sm"
          >
            {nameSaved ? "Saved ✓" : "Save"}
          </button>
        </form>
        {identity.displayName && (
          <p className="text-gray-600 text-xs">
            Displayed as: <span className="text-gray-400">{identity.displayName} ({shortId(identity.userId)})</span>
          </p>
        )}
      </div>

      {/* Restore ID */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
        <p className="text-violet-400 text-[10px] font-bold uppercase tracking-widest">Restore my ID</p>
        <p className="text-gray-600 text-xs leading-relaxed">
          Paste your ID from another device to recover your bots.
        </p>
        <form onSubmit={handleRestore} className="space-y-3">
          <input
            value={restoreInput}
            onChange={(e) => { setRestoreInput(e.target.value); setRestoreError(""); setRestoreSuccess(false); }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full bg-black/40 border border-white/8 focus:border-violet-500 rounded-xl px-4 py-3 text-sm font-mono text-gray-300 placeholder-gray-700 focus:outline-none transition-colors"
          />
          {restoreError && <p className="text-red-400 text-xs">{restoreError}</p>}
          {restoreSuccess && <p className="text-green-400 text-xs">Identity restored successfully.</p>}
          <button
            type="submit"
            disabled={!restoreInput.trim()}
            className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white font-bold text-sm"
          >
            Restore
          </button>
        </form>
      </div>
    </div>
  );
}
