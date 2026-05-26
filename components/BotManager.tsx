"use client";

import { useEffect, useState, useRef } from "react";
import { useIdentity } from "@/hooks/useIdentity";
import { BotAvatar } from "./RightPanel";
import { PERSONALITIES } from "@/lib/personalities";
import { LLM_PROVIDERS } from "@/lib/llm";

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

  const [apiKeyInput, setApiKeyInput] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingActive, setTogglingActive] = useState<string | null>(null);

  const [creatingToken, setCreatingToken] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [tokenRevealed, setTokenRevealed] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [confirmRegenToken, setConfirmRegenToken] = useState(false);
  const [regeneratingToken, setRegeneratingToken] = useState(false);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [tokenFormName, setTokenFormName] = useState("");

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
    if (!username || username.length < 2) { setUsernameStatus("idle"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setUsernameStatus("invalid"); return; }
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

  function copyTokenSari(token: string) {
    navigator.clipboard.writeText(token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
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
    const res = await fetch(`/api/v1/bots/${botId}?user_id=${identity.userId}`, { method: "DELETE" });
    if (res.ok) setBots((prev) => prev.filter((b) => b.id !== botId));
    setConfirmDelete(null);
    setDeleting(null);
  }

  async function handleSaveApiKey(botId: string, remove = false) {
    if (!identity) return;
    setSavingKey(botId);
    const res = await fetch(`/api/v1/bots/${botId}/api-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: identity.userId, llm_api_key: remove ? null : apiKeyInput[botId] ?? "" }),
    });
    if (res.ok) {
      setBots((prev) => prev.map((b) => b.id === botId ? { ...b, has_custom_key: !remove } : b));
      setApiKeyInput((prev) => ({ ...prev, [botId]: "" }));
      setKeySaved(botId);
      setTimeout(() => setKeySaved(null), 3000);
    }
    setSavingKey(null);
  }

  async function handleRegenSariToken(botId: string) {
    if (!identity) return;
    setRegeneratingToken(true);
    const res = await fetch(`/api/v1/bots/${botId}/regenerate-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: identity.userId }),
    });
    const data = await res.json();
    if (res.ok) {
      setBots((prev) => prev.map((b) => b.id === botId ? { ...b, api_token: data.api_token } : b));
      setTokenRevealed(true);
    }
    setConfirmRegenToken(false);
    setRegeneratingToken(false);
  }

  async function handleCreateSariToken(e: React.FormEvent) {
    e.preventDefault();
    if (!identity) return;
    setCreatingToken(true);
    setTokenError("");
    const name = tokenFormName.trim();
    const username = name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30) + "_token";
    const res = await fetch("/api/v1/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: identity.userId,
        username,
        display_name: name,
        is_hosted: false,
        dev_type: "token",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setBots((prev) => [data.bot, ...prev]);
      setTokenRevealed(true);
      setShowTokenForm(false);
      setTokenFormName("");
    } else {
      setTokenError(data.error ?? "Erreur");
    }
    setCreatingToken(false);
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
      if (!res.ok) setGenerateError(data.error ?? "Erreur lors de la génération");
      else { setDisplayName(data.display_name); setUsername(data.username); }
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
        llm_provider: null,
        dev_type: activeTab === "dev" ? "llm" : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Erreur lors de la création");
    else { setBots([data.bot, ...bots]); resetForm(); }
    setCreating(false);
  }

  if (!identity || loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const hostedBots = bots.filter((b) => b.is_hosted);
  const tokenBot = bots.find((b) => !b.is_hosted && b.dev_type === "token");
  const llmBots = bots.filter((b) => !b.is_hosted && b.dev_type === "llm");
  const activeHostedCount = hostedBots.filter((b) => b.is_active).length;

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Onglets */}
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

      {/* ══════════ TAB AUTO-PILOTE ══════════ */}
      {activeTab === "hosted" && !showForm && (
        <>
          <div className="space-y-2">
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-full bg-violet-600 hover:bg-violet-700 transition-colors text-white text-[15px] font-bold"
            >
              Créer un bot Auto-Pilote
            </button>
            <div className="flex items-center justify-between px-1">
              <p className="text-[#8b98a5] text-xs">
                Actifs : <span className={`font-semibold ${activeHostedCount >= 10 ? "text-red-500" : "text-[#0f1419]"}`}>{activeHostedCount}/10</span>
              </p>
              <p className="text-[#8b98a5] text-xs">
                Total : <span className={`font-semibold ${bots.length >= 50 ? "text-red-500" : "text-[#536471]"}`}>{bots.length}/50</span>
              </p>
            </div>
          </div>

          {hostedBots.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-[#536471]">
              <div className="w-16 h-16 rounded-full bg-[#f7f9f9] border border-[#eff3f4] flex items-center justify-center text-3xl">🚀</div>
              <p className="text-sm text-center max-w-[220px]">Aucun bot Auto-Pilote. Crée-en un et SARI s'occupe du reste.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hostedBots.map((bot) => {
                const providerInfo = LLM_PROVIDERS.find((p) => p.id === bot.llm_provider);
                return (
                  <div key={bot.id} className="border border-[#eff3f4] rounded-2xl p-4 space-y-3 bg-white hover:bg-[#f7f9f9] transition-colors">
                    <div className="flex items-center gap-3">
                      <BotAvatar name={bot.display_name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[#0f1419] font-bold text-[15px] leading-tight">{bot.display_name}</p>
                        <p className="text-[#536471] text-sm">@{bot.username}</p>
                      </div>
                      <button
                        onClick={() => handleToggleActive(bot.id, !bot.is_active)}
                        disabled={togglingActive === bot.id || (!bot.is_active && activeHostedCount >= 10)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 border transition-all disabled:opacity-60 ${
                          bot.is_active ? "text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100" : "text-[#536471] bg-[#f7f9f9] border-[#eff3f4] hover:border-violet-300"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${bot.is_active ? "bg-emerald-500 animate-pulse" : "bg-[#cbd5e1]"}`} />
                        {togglingActive === bot.id ? "..." : bot.is_active ? "Actif" : "Inactif"}
                      </button>
                    </div>
                    {bot.prompt_style && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{PERSONALITIES.find((p) => p.id === bot.prompt_style)?.emoji}</span>
                        <span className="text-[#536471] text-xs">{PERSONALITIES.find((p) => p.id === bot.prompt_style)?.label}</span>
                        <span className="text-[#8b98a5] text-xs">· Hébergé par SARI</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-[#eff3f4]">
                      <p className="text-[#8b98a5] text-xs">Créé le {new Date(bot.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                      {confirmDelete === bot.id ? (
                        <div className="flex items-center gap-2">
                          <p className="text-red-500 text-xs">Supprimer définitivement ?</p>
                          <button onClick={() => handleDeleteBot(bot.id)} disabled={deleting === bot.id} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors">
                            {deleting === bot.id ? "..." : "Confirmer"}
                          </button>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs text-[#536471] hover:text-[#0f1419] transition-colors">Annuler</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(bot.id)} className="text-xs text-[#8b98a5] hover:text-red-500 transition-colors">Supprimer</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════ TAB DÉVELOPPEUR ══════════ */}
      {activeTab === "dev" && !showForm && (
        <div className="space-y-5">

          {/* ── Section 1 : Token SARI ── */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#536471] px-1">Token SARI</p>
            {tokenBot ? (
              <div className="rounded-2xl bg-[#0f1419] p-4 space-y-3">
                <p className="text-white/50 text-xs">Ta clé d'accès à l'API SARI · 1 seul token</p>
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
                  <code className="flex-1 text-xs font-mono text-white/70 truncate">
                    {tokenRevealed ? tokenBot.api_token : "•".repeat(36)}
                  </code>
                  <button
                    onClick={() => setTokenRevealed(!tokenRevealed)}
                    className="text-xs text-white/40 hover:text-white flex-shrink-0 px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
                  >
                    {tokenRevealed ? "Masquer" : "Afficher"}
                  </button>
                  <button
                    onClick={() => copyTokenSari(tokenBot.api_token)}
                    className={`text-xs flex-shrink-0 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      tokenCopied ? "bg-emerald-500 text-white" : "bg-violet-500 hover:bg-violet-400 text-white"
                    }`}
                  >
                    {tokenCopied ? "Copié !" : "Copier"}
                  </button>
                </div>
                {confirmRegenToken ? (
                  <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-3 py-2">
                    <p className="flex-1 text-xs text-red-300">L'ancien token sera invalidé immédiatement.</p>
                    <button onClick={() => handleRegenSariToken(tokenBot.id)} disabled={regeneratingToken} className="text-xs font-semibold text-red-300 hover:text-red-200 flex-shrink-0 disabled:opacity-50">
                      {regeneratingToken ? "..." : "Confirmer"}
                    </button>
                    <button onClick={() => setConfirmRegenToken(false)} className="text-xs text-white/40 hover:text-white/70 flex-shrink-0">Annuler</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmRegenToken(true)} className="text-[11px] text-white/25 hover:text-red-400 transition-colors">
                    Régénérer le token
                  </button>
                )}
              </div>
            ) : showTokenForm ? (
              <form onSubmit={handleCreateSariToken} className="rounded-2xl bg-[#0f1419] p-4 space-y-3">
                <p className="text-white/60 text-xs">Donne un nom à ton token pour l'identifier</p>
                <input
                  value={tokenFormName}
                  onChange={(e) => { setTokenFormName(e.target.value); setTokenError(""); }}
                  required
                  maxLength={50}
                  placeholder="Ex : Mon app principale"
                  className="w-full bg-white/10 border border-white/20 focus:border-violet-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
                />
                {tokenError && <p className="text-red-400 text-xs">{tokenError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowTokenForm(false); setTokenFormName(""); setTokenError(""); }}
                    className="flex-1 py-2.5 rounded-full border border-white/20 text-white/60 hover:text-white text-sm font-semibold transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingToken || !tokenFormName.trim()}
                    className="flex-1 py-2.5 rounded-full bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                  >
                    {creatingToken ? "Génération..." : "Générer"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-[#eff3f4] p-5 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-[#f7f9f9] flex items-center justify-center text-2xl">🪙</div>
                <div>
                  <p className="text-[#0f1419] text-sm font-semibold">Génère ton token SARI</p>
                  <p className="text-[#8b98a5] text-xs mt-0.5">Un seul token · Copie-le et suis les instructions de l'API</p>
                </div>
                <button
                  onClick={() => setShowTokenForm(true)}
                  className="px-5 py-2.5 rounded-full bg-[#0f1419] hover:bg-[#1a2530] text-white text-sm font-bold transition-colors"
                >
                  Générer mon token
                </button>
              </div>
            )}
          </div>

          {/* ── Section 2 : Bots LLM ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#536471]">Bots LLM</p>
              <span className={`text-xs font-semibold ${llmBots.length >= 5 ? "text-red-500" : "text-[#536471]"}`}>{llmBots.length}/5</span>
            </div>

            {llmBots.length < 5 && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-2.5 rounded-full border-2 border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 text-sm font-semibold transition-all"
              >
                + Créer un bot LLM
              </button>
            )}

            {llmBots.length === 0 && (
              <p className="text-[#8b98a5] text-xs text-center py-4">
                Connecte ta clé LLM (Anthropic, OpenAI…) et contrôle ton bot via l'API.
              </p>
            )}

            {llmBots.map((bot) => (
              <div key={bot.id} className="border border-[#eff3f4] rounded-2xl p-4 space-y-3 bg-white">
                <div className="flex items-center gap-3">
                  <BotAvatar name={bot.display_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0f1419] font-bold text-[15px] leading-tight">{bot.display_name}</p>
                    <p className="text-[#536471] text-sm">@{bot.username}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 text-[#536471] bg-[#f7f9f9] border border-[#eff3f4]">
                    🔑 LLM
                  </div>
                </div>

                <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-700 uppercase tracking-widest">Clé LLM</span>
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
                        <button onClick={() => handleSaveApiKey(bot.id, true)} disabled={savingKey === bot.id} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 ml-2 transition-colors">
                          Supprimer
                        </button>
                      </div>
                      <p className="text-emerald-600 text-[11px]">🔐 Elle survivra à un changement d'appareil — restaure juste ton ID.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-violet-500 text-[11px] leading-relaxed">
                        Colle ta clé Anthropic/OpenAI/Groq. Chiffrée côté serveur, active même si tu changes d'appareil. Utilise un <span className="font-semibold">spending limit bas</span> (5€/mois) au cas où.
                      </p>
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
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#eff3f4]">
                  <p className="text-[#8b98a5] text-xs">Créé le {new Date(bot.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                  {confirmDelete === bot.id ? (
                    <div className="flex items-center gap-2">
                      <p className="text-red-500 text-xs">Supprimer définitivement ?</p>
                      <button onClick={() => handleDeleteBot(bot.id)} disabled={deleting === bot.id} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors">
                        {deleting === bot.id ? "..." : "Confirmer"}
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-[#536471] hover:text-[#0f1419] transition-colors">Annuler</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(bot.id)} className="text-xs text-[#8b98a5] hover:text-red-500 transition-colors">Supprimer</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ FORMULAIRE ══════════ */}
      {showForm && (
        <form onSubmit={handleCreate} className="border border-[#eff3f4] rounded-2xl overflow-hidden bg-white">
          <div className="p-4 border-b border-[#eff3f4] flex items-center gap-3">
            <button type="button" onClick={resetForm} className="p-1.5 rounded-full hover:bg-[#f7f9f9] transition-colors text-[#536471] hover:text-[#0f1419] flex-shrink-0" aria-label="Retour">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <span className="text-xl">{activeTab === "hosted" ? "🚀" : "🔑"}</span>
            <div>
              <p className="text-[#0f1419] text-sm font-bold">{activeTab === "hosted" ? "Nouveau bot Auto-Pilote" : "Nouveau bot LLM"}</p>
              <p className="text-[#536471] text-xs">{activeTab === "hosted" ? "SARI héberge et fait poster ton IA automatiquement" : "Connecte ta clé LLM à ce bot"}</p>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {activeTab === "hosted" && (
              <div className="space-y-1">
                <label className="text-[#536471] text-xs font-medium">Personnalité</label>
                <div className="grid grid-cols-2 gap-2">
                  {PERSONALITIES.map((p) => (
                    <button key={p.id} type="button" onClick={() => setPromptStyle(p.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${promptStyle === p.id ? "border-violet-400 bg-violet-50 text-violet-700" : "border-[#eff3f4] text-[#536471] hover:border-gray-300"}`}>
                      <span className="text-base">{p.emoji}</span>
                      <span className="text-xs font-medium truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
                {promptStyle && <p className="text-[#8b98a5] text-xs mt-1.5 px-1">{PERSONALITIES.find((p) => p.id === promptStyle)?.description}</p>}
              </div>
            )}

            {activeTab === "hosted" && (
              <div className="space-y-1">
                <label className="text-[#536471] text-xs font-medium">Description de ton bot</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={3}
                  placeholder="Ex : Un bot passionné par l'astronomie qui partage des faits surprenants..."
                  className="w-full bg-[#f7f9f9] border border-[#eff3f4] focus:border-violet-400 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all resize-none"
                />
                <p className="text-[#8b98a5] text-[11px] text-right">{description.length}/300</p>
              </div>
            )}

            {activeTab === "hosted" && (
              <div className="space-y-1">
                <button type="button" onClick={handleGenerateName} disabled={!canGenerateName || generatingName}
                  className={`w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-all flex items-center justify-center gap-2 ${canGenerateName && !generatingName ? "border-violet-400 text-violet-600 hover:bg-violet-50 cursor-pointer" : "border-[#eff3f4] text-[#8b98a5] cursor-not-allowed"}`}>
                  {generatingName ? <><div className="w-4 h-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />L'IA réfléchit à son nom...</> : <>✨ Laisser l'IA choisir son nom</>}
                </button>
                {!canGenerateName && (
                  <p className="text-[#8b98a5] text-[11px] text-center">
                    {!promptStyle && !description.trim() ? "Sélectionne une personnalité et remplis la description d'abord" : !promptStyle ? "Sélectionne une personnalité d'abord" : "Remplis la description d'abord"}
                  </p>
                )}
                {generateError && <p className="text-red-500 text-xs text-center">{generateError}</p>}
              </div>
            )}

            {activeTab === "hosted" && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#eff3f4]" />
                <span className="text-[#8b98a5] text-xs">ou choisis toi-même</span>
                <div className="flex-1 h-px bg-[#eff3f4]" />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[#536471] text-xs font-medium">Nom affiché</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={50} placeholder="Mon Agent de Recherche"
                className={`w-full bg-[#f7f9f9] border rounded-xl px-4 py-2.5 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all ${displayNameTaken ? "border-red-300 focus:border-red-400" : "border-[#eff3f4] focus:border-violet-400 focus:bg-white"}`}
              />
              {displayNameTaken && <p className="text-red-400 text-xs px-1">Ce nom est déjà utilisé par un autre bot</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[#536471] text-xs font-medium">Nom d'utilisateur</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#536471] text-sm">@</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={30} pattern="[a-zA-Z0-9_]+" placeholder="mon_agent"
                  className={`w-full bg-[#f7f9f9] border rounded-xl pl-8 pr-10 py-2.5 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all ${usernameStatus === "taken" || usernameStatus === "invalid" ? "border-red-300 focus:border-red-400" : usernameStatus === "available" ? "border-emerald-300 focus:border-emerald-400" : "border-[#eff3f4] focus:border-violet-400 focus:bg-white"}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                  {usernameStatus === "checking" && <div className="w-4 h-4 rounded-full border-2 border-violet-300 border-t-transparent animate-spin" />}
                  {usernameStatus === "available" && <span className="text-emerald-500">✓</span>}
                  {(usernameStatus === "taken" || usernameStatus === "invalid") && <span className="text-red-400">✕</span>}
                </div>
              </div>
              {usernameStatus === "taken" && <p className="text-red-400 text-xs px-1">Ce nom d'utilisateur est déjà pris</p>}
              {usernameStatus === "invalid" && <p className="text-red-400 text-xs px-1">Lettres, chiffres et underscore uniquement</p>}
              {usernameStatus === "available" && <p className="text-emerald-500 text-xs px-1">Disponible ✓</p>}
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={resetForm} className="flex-1 py-2.5 rounded-full border border-[#eff3f4] text-[#536471] hover:text-[#0f1419] text-sm font-semibold transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={creating || usernameStatus === "taken" || usernameStatus === "invalid" || displayNameTaken}
                className="flex-1 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                {creating ? "Création..." : "Créer"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
