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
      setRestoreError("Invalid ID. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
    }
  }

  const displayAs = identity.displayName
    ? `${identity.displayName} (${shortId(identity.userId)})`
    : identity.handle;

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Identity card */}
      <div className="rounded-2xl border border-[#eff3f4] bg-white p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-lg font-black text-white flex-shrink-0">
            {(identity.displayName ?? identity.handle).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[#0f1419] font-bold text-base">{displayAs}</p>
            <p className="text-[#536471] text-xs mt-0.5">Anonymous · No account needed</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-violet-600 text-[10px] font-bold uppercase tracking-widest">
            My anonymous ID{" "}
            <span className="text-[#8b98a5] normal-case font-normal tracking-normal">
              (save it to restore your bots on another device)
            </span>
          </p>
          <div className="flex items-center gap-2 bg-[#f7f9f9] border border-[#eff3f4] rounded-xl px-4 py-3">
            <code className="flex-1 text-xs font-mono text-[#536471] break-all leading-relaxed">
              {identity.userId}
            </code>
            <button
              onClick={copyId}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                copied
                  ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                  : "border-violet-200 text-violet-600 hover:bg-violet-50"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="rounded-2xl border border-[#eff3f4] bg-white p-5 space-y-3">
        <p className="text-violet-600 text-[10px] font-bold uppercase tracking-widest">
          My nickname{" "}
          <span className="text-[#8b98a5] normal-case font-normal tracking-normal">(optional)</span>
        </p>
        <form onSubmit={handleSaveName} className="space-y-3">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={30}
            placeholder={identity.displayName ?? "Choose a nickname..."}
            className="w-full bg-[#f7f9f9] border border-[#eff3f4] focus:border-violet-400 focus:bg-white rounded-xl px-4 py-3 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] transition-all text-white font-bold text-sm"
          >
            {nameSaved ? "Saved ✓" : "Save"}
          </button>
        </form>
        {identity.displayName && (
          <p className="text-[#8b98a5] text-xs">
            Displayed as:{" "}
            <span className="text-[#536471]">
              {identity.displayName} ({shortId(identity.userId)})
            </span>
          </p>
        )}
      </div>

      {/* Restore ID */}
      <div className="rounded-2xl border border-[#eff3f4] bg-white p-5 space-y-3">
        <p className="text-violet-600 text-[10px] font-bold uppercase tracking-widest">Restore my ID</p>
        <p className="text-[#536471] text-xs leading-relaxed">
          Paste your ID from another device to recover your bots and settings.
        </p>
        <form onSubmit={handleRestore} className="space-y-3">
          <input
            value={restoreInput}
            onChange={(e) => { setRestoreInput(e.target.value); setRestoreError(""); setRestoreSuccess(false); }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full bg-[#f7f9f9] border border-[#eff3f4] focus:border-violet-400 focus:bg-white rounded-xl px-4 py-3 text-sm font-mono text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all"
          />
          {restoreError && <p className="text-red-500 text-xs">{restoreError}</p>}
          {restoreSuccess && <p className="text-emerald-600 text-xs">Identity restored successfully.</p>}
          <button
            type="submit"
            disabled={!restoreInput.trim()}
            className="w-full py-3 rounded-xl border border-[#eff3f4] hover:bg-[#f7f9f9] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[#0f1419] font-bold text-sm"
          >
            Restore
          </button>
        </form>
      </div>
    </div>
  );
}
