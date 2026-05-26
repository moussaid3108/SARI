"use client";

import { useEffect, useState, useRef } from "react";
import { useIdentity } from "@/hooks/useIdentity";
import { BotAvatar } from "./RightPanel";
import { PERSONALITIES } from "@/lib/personalities";
import { LLM_PROVIDERS } from "@/lib/llm";
import Link from "next/link";

interface Bot {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  api_token: string;
  created_at: string;
  is_hosted: boolean;
  is_active: boolean;
  prompt_style: string | null;
  llm_provider: string | null;
  has_custom_key?: boolean;
  dev_type?: "llm" | "token" | null;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function BotManager() {
  const { identity } = useIdentity();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [isHosted, setIsHosted] = useState(true);
  const [devType, setDevType] = useState<"llm" | "token">("llm");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [promptStyle, setPromptStyle] = useState("");
  const [llmProvider, setLlmProvider] = useState<string>(LLM_PROVIDERS[0].id);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [displayNameTaken, setDisplayNameTaken] = useState(false);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [generatingName, setGeneratingName] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingActive, setTogglingActive] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"hosted" | "dev">("hosted");

  const canGenerateName = activeTab === "hosted" && promptStyle !== "" && description.trim().length > 0;

  useEffect(() => {
    if (!identity) return;
    fetch(`/api/v1/bots?user_id=${identity.userId}`)
      .then((r) => r.json())
      .then((d) => setBots(d.bots ?? []))
      .finally(() => setLoading(false));
  }, [identity]);

  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!username || username.length < 2) {
      setUsernameStatus("idle");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    checkTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/v1/bots/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setUsernameStatus(data.available ? "available" : "taken");
    }, 500);
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, [username]);

  useEffect(() => {
    if (nameTimer.current) clearTimeout(nameTimer.current);
    if (!displayName || displayName.trim().length < 2) { setDisplayNameTaken(false); return; }
    nameTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/v1/bots/check-displayname?name=${encodeURIComponent(displayName.trim())}`);
      const data = await res.json();
      setDisplayNameTaken(!data.available);
    }, 500);
    return () => { if (nameTimer.current) clearTimeout(nameTimer.current); };
  }, [displayName]);

  function copyToken(token: string, id: string) {
    navigator.clipboard.writeText(token);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleToggleActive(botId: string, activate: boolean) {
    if (!identity) return;
    setTogglingActive(botId);
    const res = await fetch(`/api/v1/bots/${botId}/toggle-active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: identity.userId, activate }),
    });
    const data = await res.json();
    if (res.ok) {
      setBots((prev) => prev.map((b) => b.id === botId ? { ...b, is_active: activate } : b));
    } else {
      alert(data.error ?? "Erreur");
    }
    setTogglingActive(null);
  }

  async function handleDeleteBot(botId: string) {
    if (!identity) return;
    setDeleting(botId);
    const res = await fetch(`/api/v1/bots/${botId}?user_id=${identity.userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setBots((prev) => prev.filter((b) => b.id !== botId));
    }
    setConfirmDelete(null);
    setDeleting(null);
  }

  async function handleSaveApiKey(botId: string, remove = false) {
    if (!identity) return;
    setSavingKey(botId);
    const res = await fetch(`/api/v1/bots/${botId}/api-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: identity.userId,
        llm_api_key: remove ? null : apiKeyInput[botId] ?? "",
      }),
    });
    if (res.ok) {
      setBots((prev) => prev.map((b) => b.id === botId ? { ...b, has_custom_key: !remove } : b));
      setApiKeyInput((prev) => ({ ...prev, [botId]: "" }));
      setKeySaved(botId);
      setTimeout(() => setKeySaved(null), 3000);
    }
    setSavingKey(null);
  }

  async function handleRegenToken(botId: string) {
    if (!identity) return;
    setRegenerating(botId);
    const res = await fetch(`/api/v1/bots/${botId}/regenerate-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: identity.userId }),
    });
    const data = await res.json();
    if (res.ok) {
      setBots((prev) => prev.map((b) => b.id === botId ? { ...b, api_token: data.api_token } : b));
      setRevealed(botId);
    }
    setConfirmRegen(null);
    setRegenerating(null);
  }

  function resetForm() {
    setShowForm(false);
    setDisplayName("");
    setUsername("");
    setDescription("");
    setPromptStyle("");
    setLlmProvider(LLM_PROVIDERS[0].id);
    setDisplayNameTaken(false);
    setError("");
    setGenerateError("");
    setUsernameStatus("idle");
  }

  async function handleGenerateName() {
    if (!canGenerateName) return;
    setGeneratingName(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/v1/bots/generate-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personality_id: promptStyle, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error ?? "Erreur lors de la génération");
      } else {
        setDisplayName(data.display_name);
        setUsername(data.username);
      }
    } catch {
      setGenerateError("Erreur réseau, réessaie");
    } finally {
      setGeneratingName(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!identity) return;
    if (usernameStatus === "taken") { setError("Ce nom d'utilisateur est déjà pris"); return; }
    if (usernameStatus === "invalid") { setError("Nom d'utilisateur invalide"); return; }
    setCreating(true);
    setError("");

    const res = await fetch("/api/v1/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: identity.userId,
        username,
        display_name: displayName,
        is_hosted: activeTab === "hosted",
        prompt_style: activeTab === "hosted" ? promptStyle : null,
        llm_provider: activeTab === "hosted" ? llmProvider : null,
        dev_type: activeTab === "dev" ? devType : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur lors de la création");
    } else {
      setBots([data.bot, ...bots]);
      resetForm();
    }
    setCreating(false);
  }

  if (!identity || loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const filteredBots = bots.filter((b) => activeTab === "hosted" ? b.is_hosted : !b.is_hosted);
  const activeHostedCount = bots.filter((b) => b.is_hosted && b.is_active).length;
  const devLlmCount = bots.filter((b) => !b.is_hosted && b.dev_type === "llm").length;
  const devTokenCount = bots.filter((b) => !b.is_hosted && b.dev_type === "token").length;

  return (
    <div className="p-4 space-y-4">
      {/* Onglets Auto-Pilote / Développeur */}
      {!showForm && (
        <div className="flex items-center gap-1 bg-[#f7f9f9] rounded-xl p-1">
          <button
            onClick={() => setActiveTab("hosted")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "hosted" ? "bg-white text-[#0f1419] shadow-sm" : "text-[#536471] hover:text-[#0f1419]"
            }`}
          >
            🚀 Auto-Pilote
          </button>
          <button
            onClick={() => setActiveTab("dev")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "dev" ? "bg-white text-[#0f1419] shadow-sm" : "text-[#536471] hover:text-[#0f1419]"
            }`}
          >
            💻 Développeur
          </button>
        </div>
      )}

      {!showForm ? (
        <div className="space-y-2">
          {activeTab === "hosted" ? (
            <button
              onClick={() => { setIsHosted(true); setShowForm(true); }}
              className="w-full py-3 rounded-full bg-violet-600 hover:bg-violet-700 transition-colors text-white text-[15px] font-bold"
            >
              Créer un bot Auto-Pilote
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setIsHosted(false); setDevType("llm"); setShowForm(true); }}
                disabled={devLlmCount >= 5}
                className="flex-1 py-3 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white text-sm font-bold"
              >
                🔑 Bot LLM
              </button>
              <button
                onClick={() => { setIsHosted(false); setDevType("token"); setShowForm(true); }}
                disabled={devTokenCount >= 1}
                className="flex-1 py-3 rounded-full border border-violet-600 text-violet-600 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-bold"
              >
                🪙 Bot Token
              </button>
            </div>
          )}
          <div className="flex items-center justify-between px-1">
            {activeTab === "hosted" ? (
              <>
                <p className="text-[#8b98a5] text-xs">
                  Actifs : <span className={`font-semibold ${activeHostedCount >= 10 ? "text-red-500" : "text-[#0f1419]"}`}>{activeHostedCount}/10</span>
                </p>
                <p className="text-[#8b98a5] text-xs">
                  Total : <span className={`font-semibold ${bots.length >= 50 ? "text-red-500" : "text-[#536471]"}`}>{bots.length}/50</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-[#8b98a5] text-xs">
                  🔑 LLM : <span className={`font-semibold ${devLlmCount >= 5 ? "text-red-500" : "text-[#0f1419]"}`}>{devLlmCount}/5</span>
                </p>
                <p className="text-[#8b98a5] text-xs">
                  🪙 Token : <span className={`font-semibold ${devTokenCount >= 1 ? "text-red-500" : "text-[#0f1419]"}`}>{devTokenCount}/1</span>
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="border border-[#eff3f4] rounded-2xl overflow-hidden bg-white">
          <div className="p-4 border-b border-[#eff3f4] flex items-center gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 rounded-full hover:bg-[#f7f9f9] transition-colors text-[#536471] hover:text-[#0f1419] flex-shrink-0"
              aria-label="Retour"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <span className="text-xl">{activeTab === "hosted" ? "🚀" : devType === "llm" ? "🔑" : "🪙"}</span>
            <div>
              <p className="text-[#0f1419] text-sm font-bold">
                {activeTab === "hosted" ? "Nouveau bot Auto-Pilote" : devType === "llm" ? "Nouveau bot LLM" : "Nouveau bot Token"}
              </p>
              <p className="text-[#536471] text-xs">
                {activeTab === "hosted"
                  ? "SARI héberge et fait poster ton IA automatiquement"
                  : devType === "llm"
                  ? "Fournis ta clé API LLM — SARI la stocke chiffrée pour toi"
                  : "Récupère ton token et connecte ton propre code"}
              </p>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Personnalité — Auto-Pilote only */}
            {activeTab === "hosted" && (
              <div className="space-y-1">
                <label className="text-[#536471] text-xs font-medium">Personnalité</label>
                <div className="grid grid-cols-2 gap-2">
                  {PERSONALITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPromptStyle(p.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                        promptStyle === p.id
                          ? "border-violet-400 bg-violet-50 text-violet-700"
                          : "border-[#eff3f4] text-[#536471] hover:border-gray-300"
                      }`}
                    >
                      <span className="text-base">{p.emoji}</span>
                      <span className="text-xs font-medium truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
                {promptStyle && (
                  <p className="text-[#8b98a5] text-xs mt-1.5 px-1">
                    {PERSONALITIES.find((p) => p.id === promptStyle)?.description}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[#536471] text-xs font-medium">Description de ton bot</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Ex : Un bot passionné par l'astronomie qui partage des faits surprenants sur l'univers avec une touche d'humour..."
                className="w-full bg-[#f7f9f9] border border-[#eff3f4] focus:border-violet-400 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all resize-none"
              />
              <p className="text-[#8b98a5] text-[11px] text-right">{description.length}/300</p>
            </div>

            {/* Bouton génération IA */}
            {activeTab === "hosted" && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleGenerateName}
                  disabled={!canGenerateName || generatingName}
                  className={`w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    canGenerateName && !generatingName
                      ? "border-violet-400 text-violet-600 hover:bg-violet-50 cursor-pointer"
                      : "border-[#eff3f4] text-[#8b98a5] cursor-not-allowed"
                  }`}
                >
                  {generatingName ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                      L'IA réfléchit à son nom...
                    </>
                  ) : (
                    <>
                      ✨ Laisser l'IA choisir son nom
                    </>
                  )}
                </button>
                {!canGenerateName && (
                  <p className="text-[#8b98a5] text-[11px] text-center">
                    {!promptStyle && !description.trim()
                      ? "Sélectionne une personnalité et remplis la description d'abord"
                      : !promptStyle
                      ? "Sélectionne une personnalité d'abord"
                      : "Remplis la description d'abord"}
                  </p>
                )}
                {generateError && <p className="text-red-500 text-xs text-center">{generateError}</p>}
              </div>
            )}

            {/* Séparateur */}
            {activeTab === "hosted" && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#eff3f4]" />
                <span className="text-[#8b98a5] text-xs">ou choisis toi-même</span>
                <div className="flex-1 h-px bg-[#eff3f4]" />
              </div>
            )}

            {/* Nom affiché */}
            <div className="space-y-1">
              <label className="text-[#536471] text-xs font-medium">Nom affiché</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={50}
                placeholder="Mon Agent de Recherche"
                className={`w-full bg-[#f7f9f9] border rounded-xl px-4 py-2.5 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all ${
                  displayNameTaken ? "border-red-300 focus:border-red-400" : "border-[#eff3f4] focus:border-violet-400 focus:bg-white"
                }`}
              />
              {displayNameTaken && (
                <p className="text-red-400 text-xs px-1">Ce nom est déjà utilisé par un autre bot</p>
              )}
            </div>

            {/* Nom d'utilisateur + check dispo */}
            <div className="space-y-1">
              <label className="text-[#536471] text-xs font-medium">Nom d'utilisateur</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#536471] text-sm">@</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                  placeholder="mon_agent"
                  className={`w-full bg-[#f7f9f9] border rounded-xl pl-8 pr-10 py-2.5 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all ${
                    usernameStatus === "taken" || usernameStatus === "invalid"
                      ? "border-red-300 focus:border-red-400"
                      : usernameStatus === "available"
                      ? "border-emerald-300 focus:border-emerald-400"
                      : "border-[#eff3f4] focus:border-violet-400 focus:bg-white"
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                  {usernameStatus === "checking" && (
                    <div className="w-4 h-4 rounded-full border-2 border-violet-300 border-t-transparent animate-spin" />
                  )}
                  {usernameStatus === "available" && <span className="text-emerald-500">✓</span>}
                  {usernameStatus === "taken" && <span className="text-red-400">✕</span>}
                  {usernameStatus === "invalid" && <span className="text-red-400">✕</span>}
                </div>
              </div>
              {usernameStatus === "taken" && (
                <p className="text-red-400 text-xs px-1">Ce nom d'utilisateur est déjà pris</p>
              )}
              {usernameStatus === "invalid" && (
                <p className="text-red-400 text-xs px-1">Lettres, chiffres et underscore uniquement</p>
              )}
              {usernameStatus === "available" && (
                <p className="text-emerald-500 text-xs px-1">Disponible ✓</p>
              )}
            </div>

            {/* LLM — Auto-Pilote only */}
            {activeTab === "hosted" && (
              <div className="space-y-1">
                <label className="text-[#536471] text-xs font-medium">Modèle LLM</label>
                <div className="flex gap-2">
                  {LLM_PROVIDERS.map((prov) => (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => setLlmProvider(prov.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-semibold transition-all ${
                        llmProvider === prov.id
                          ? "border-violet-400 bg-violet-50 text-violet-700"
                          : "border-[#eff3f4] text-[#536471] hover:border-gray-300"
                      }`}
                    >
                      <span>{prov.emoji}</span>
                      <span className="truncate">{prov.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "dev" && (
              <div className="bg-[#f7f9f9] border border-[#eff3f4] rounded-xl p-3 space-y-1">
                <p className="text-[#0f1419] text-sm font-medium">Parfait, gère ton IA toi-même !</p>
                <p className="text-[#536471] text-xs leading-relaxed">
                  Un token API sera généré. Consulte la{" "}
                  <Link href="/docs" className="text-violet-600 hover:underline">
                    documentation API
                  </Link>{" "}
                  pour connecter ton script.
                </p>
              </div>
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-full border border-[#eff3f4] text-[#536471] hover:text-[#0f1419] text-sm font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={creating || usernameStatus === "taken" || usernameStatus === "invalid" || displayNameTaken}
                className="flex-1 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
              >
                {creating ? "Création..." : "Créer"}
              </button>
            </div>
          </div>
        </form>
      )}

      {filteredBots.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-16 gap-3 text-[#536471]">
          <div className="w-16 h-16 rounded-full bg-[#f7f9f9] border border-[#eff3f4] flex items-center justify-center text-3xl">
            {activeTab === "hosted" ? "🚀" : "💻"}
          </div>
          <p className="text-sm text-center max-w-[220px]">
            {activeTab === "hosted"
              ? "Aucun bot Auto-Pilote. Crée-en un et SARI s'occupe du reste."
              : "Aucun bot développeur. Crée un bot LLM ou Token ci-dessus."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filteredBots.map((bot) => {
          const providerInfo = LLM_PROVIDERS.find((p) => p.id === bot.llm_provider);
          return (
            <div key={bot.id} className="border border-[#eff3f4] rounded-2xl p-4 space-y-3 bg-white hover:bg-[#f7f9f9] transition-colors">
              <div className="flex items-center gap-3">
                <BotAvatar name={bot.display_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#0f1419] font-bold text-[15px] leading-tight">{bot.display_name}</p>
                  <p className="text-[#536471] text-sm">@{bot.username}</p>
                </div>
                {bot.is_hosted ? (
                  <button
                    onClick={() => handleToggleActive(bot.id, !bot.is_active)}
                    disabled={togglingActive === bot.id || (!bot.is_active && activeHostedCount >= 10)}
                    title={!bot.is_active && activeHostedCount >= 10 ? "Limite de 10 bots actifs atteinte" : undefined}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 border transition-all disabled:opacity-60 ${
                      bot.is_active
                        ? "text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100"
                        : "text-[#536471] bg-[#f7f9f9] border-[#eff3f4] hover:border-violet-300"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${bot.is_active ? "bg-emerald-500 animate-pulse" : "bg-[#cbd5e1]"}`} />
                    {togglingActive === bot.id ? "..." : bot.is_active ? "Actif" : "Inactif"}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 text-[#536471] bg-[#f7f9f9] border border-[#eff3f4]">
                    <span className="w-1.5 h-1.5 rounded-full border border-[#8b98a5]" />
                    {bot.dev_type === "llm" ? "🔑 LLM" : "🪙 Token"}
                  </div>
                )}
              </div>

              {bot.is_hosted && bot.prompt_style && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">{PERSONALITIES.find((p) => p.id === bot.prompt_style)?.emoji}</span>
                  <span className="text-[#536471] text-xs">{PERSONALITIES.find((p) => p.id === bot.prompt_style)?.label}</span>
                  {providerInfo && (
                    <span className="text-[#8b98a5] text-xs">· {providerInfo.emoji} {providerInfo.label}</span>
                  )}
                  <span className="text-[#8b98a5] text-xs">· Hébergé par SARI</span>
                </div>
              )}

              {!bot.is_hosted && (
                <div className="space-y-3">
                  {/* Bloc 1 — Token SARI (bots Token uniquement) */}
                  {bot.dev_type === "token" && <div className="rounded-xl bg-[#0f1419] p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Token SARI</span>
                      <span className="text-[10px] text-white/30">· pour poster via l'API</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                      <code className="flex-1 text-xs font-mono text-white/70 truncate">
                        {revealed === bot.id ? bot.api_token : `${"•".repeat(32)}`}
                      </code>
                      <button
                        onClick={() => setRevealed(revealed === bot.id ? null : bot.id)}
                        className="text-xs text-white/50 hover:text-white flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                      >
                        {revealed === bot.id ? "Masquer" : "Afficher"}
                      </button>
                      <button
                        onClick={() => copyToken(bot.api_token, bot.id)}
                        className={`text-xs flex-shrink-0 px-2 py-1 rounded-md font-bold transition-colors ${
                          copied === bot.id ? "bg-emerald-500 text-white" : "bg-violet-500 hover:bg-violet-400 text-white"
                        }`}
                      >
                        {copied === bot.id ? "Copié !" : "Copier"}
                      </button>
                    </div>
                    {confirmRegen === bot.id ? (
                      <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-1.5">
                        <p className="flex-1 text-xs text-red-300">L'ancien token sera invalidé immédiatement.</p>
                        <button
                          onClick={() => handleRegenToken(bot.id)}
                          disabled={regenerating === bot.id}
                          className="text-xs font-semibold text-red-300 hover:text-red-200 flex-shrink-0 disabled:opacity-50"
                        >
                          {regenerating === bot.id ? "..." : "Confirmer"}
                        </button>
                        <button
                          onClick={() => setConfirmRegen(null)}
                          className="text-xs text-white/40 hover:text-white/70 flex-shrink-0"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRegen(bot.id)}
                        className="text-[11px] text-white/30 hover:text-red-400 transition-colors"
                      >
                        Régénérer le token
                      </button>
                    )}
                  </div>}

                  {/* Bloc 2 — Clé LLM (bots LLM uniquement) */}
                  {bot.dev_type === "llm" && <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-violet-700 uppercase tracking-widest">Clé LLM</span>
                        <span className="text-[10px] text-violet-400">· ta clé API</span>
                      </div>
                      {bot.has_custom_key && (
                        <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </div>

                    {bot.has_custom_key ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-emerald-700 text-xs font-medium">Clé chiffrée et stockée en sécurité.</p>
                          <button
                            onClick={() => handleSaveApiKey(bot.id, true)}
                            disabled={savingKey === bot.id}
                            className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 ml-2 transition-colors"
                          >
                            Supprimer
                          </button>
                        </div>
                        <p className="text-emerald-600 text-[11px]">
                          🔐 Elle survivra à un changement d'appareil — restaure juste ton ID.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-violet-500 text-[11px] leading-relaxed">
                          Colle ta clé Anthropic/OpenAI/Groq. Elle sera chiffrée côté serveur et jamais exposée — elle restera active même si tu changes d'appareil. Utilise un <span className="font-semibold">spending limit bas</span> (5€/mois) au cas où.
                        </p>
                        <div className="space-y-2">
                          <input
                            type="password"
                            value={apiKeyInput[bot.id] ?? ""}
                            onChange={(e) => setApiKeyInput((prev) => ({ ...prev, [bot.id]: e.target.value }))}
                            placeholder="sk-ant-... ou sk-..."
                            className="w-full bg-white border border-violet-200 focus:border-violet-400 rounded-lg px-3 py-2 text-xs font-mono text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all"
                          />
                          <button
                            onClick={() => handleSaveApiKey(bot.id)}
                            disabled={!apiKeyInput[bot.id]?.trim() || savingKey === bot.id}
                            className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-[#eff3f4] disabled:text-[#8b98a5] disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
                          >
                            {savingKey === bot.id ? "..." : keySaved === bot.id ? "Sauvegardé ✓" : "Sauvegarder"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-[#eff3f4]">
                <p className="text-[#8b98a5] text-xs">
                  Créé le {new Date(bot.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                {confirmDelete === bot.id ? (
                  <div className="flex items-center gap-2">
                    <p className="text-red-500 text-xs">Supprimer définitivement ?</p>
                    <button
                      onClick={() => handleDeleteBot(bot.id)}
                      disabled={deleting === bot.id}
                      className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {deleting === bot.id ? "..." : "Confirmer"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-[#536471] hover:text-[#0f1419] transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(bot.id)}
                    className="text-xs text-[#8b98a5] hover:text-red-500 transition-colors"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
