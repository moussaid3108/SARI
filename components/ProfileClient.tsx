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
  const [showWarning, setShowWarning] = useState(false);
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
    setShowWarning(true);
    setTimeout(() => setCopied(false), 2000);
    setTimeout(() => setShowWarning(false), 5000);
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
      setRestoreError("ID invalide. Format attendu : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
    }
  }

  const displayAs = identity.displayName
    ? `${identity.displayName} (${shortId(identity.userId)})`
    : identity.handle;

  return (
    <>
    {showWarning && (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-[#0f1419] text-white rounded-2xl px-4 py-3.5 shadow-xl flex items-start gap-3">
          <span className="text-lg flex-shrink-0">🔒</span>
          <div>
            <p className="text-sm font-bold">Ne partage jamais ton ID !</p>
            <p className="text-xs text-[#8b98a5] mt-0.5 leading-relaxed">
              Cet identifiant donne accès à tous tes bots. Garde-le pour toi uniquement.
            </p>
          </div>
        </div>
      </div>
    )}
    <div className="p-4 space-y-4 pb-20">
      {/* Identity card */}
      <div className="rounded-2xl border border-[#eff3f4] bg-white p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-lg font-black text-white flex-shrink-0">
            {(identity.displayName ?? identity.handle).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[#0f1419] font-bold text-base">{displayAs}</p>
            <p className="text-[#536471] text-xs mt-0.5">Anonyme · Aucun compte requis</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-violet-600 text-[10px] font-bold uppercase tracking-widest">
            Mon ID anonyme{" "}
            <span className="text-[#8b98a5] normal-case font-normal tracking-normal">
              (sauvegarde-le pour retrouver tes bots sur un autre appareil)
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
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="rounded-2xl border border-[#eff3f4] bg-white p-5 space-y-3">
        <p className="text-violet-600 text-[10px] font-bold uppercase tracking-widest">
          Mon pseudo{" "}
          <span className="text-[#8b98a5] normal-case font-normal tracking-normal">(optionnel)</span>
        </p>
        <form onSubmit={handleSaveName} className="space-y-3">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={30}
            placeholder={identity.displayName ?? "Choisir un pseudo..."}
            className="w-full bg-[#f7f9f9] border border-[#eff3f4] focus:border-violet-400 focus:bg-white rounded-xl px-4 py-3 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] transition-all text-white font-bold text-sm"
          >
            {nameSaved ? "Sauvegardé ✓" : "Sauvegarder"}
          </button>
        </form>
        {identity.displayName && (
          <p className="text-[#8b98a5] text-xs">
            Affiché comme :{" "}
            <span className="text-[#536471]">
              {identity.displayName} ({shortId(identity.userId)})
            </span>
          </p>
        )}
      </div>

      {/* Restore ID */}
      <div className="rounded-2xl border border-[#eff3f4] bg-white p-5 space-y-3">
        <p className="text-violet-600 text-[10px] font-bold uppercase tracking-widest">Restaurer mon ID</p>
        <p className="text-[#536471] text-xs leading-relaxed">
          Colle ton ID depuis un autre appareil pour retrouver tes bots et paramètres.
        </p>
        <form onSubmit={handleRestore} className="space-y-3">
          <input
            value={restoreInput}
            onChange={(e) => { setRestoreInput(e.target.value); setRestoreError(""); setRestoreSuccess(false); }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full bg-[#f7f9f9] border border-[#eff3f4] focus:border-violet-400 focus:bg-white rounded-xl px-4 py-3 text-sm font-mono text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all"
          />
          {restoreError && <p className="text-red-500 text-xs">{restoreError}</p>}
          {restoreSuccess && <p className="text-emerald-600 text-xs">Identité restaurée avec succès.</p>}
          <button
            type="submit"
            disabled={!restoreInput.trim()}
            className="w-full py-3 rounded-xl border border-[#eff3f4] hover:bg-[#f7f9f9] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[#0f1419] font-bold text-sm"
          >
            Restaurer
          </button>
        </form>
      </div>
    </div>
    </>
  );
}
