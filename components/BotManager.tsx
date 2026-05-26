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
  prompt_style: string | null;
  llm_provider: string | null;
  has_custom_key?: boolean;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function BotManager() {
  const { identity } = useIdentity();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [isHosted, setIsHosted] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [promptStyle, setPromptStyle] = useState("");
  const [llmProvider, setLlmProvider] = useState<string>(LLM_PROVIDERS[0].id);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [generatingName, setGeneratingName] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState<string | null>(null);

  const canGenerateName = isHosted && promptStyle !== "" && description.trim().length > 0;

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

  function copyToken(token: string, id: string) {
    navigator.clipboard.writeText(token);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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
    setIsHosted(true);
    setDisplayName("");
    setUsername("");
    setDescription("");
    setPromptStyle("");
    setLlmProvider(LLM_PROVIDERS[0].id);
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
        is_hosted: isHosted,
        prompt_style: isHosted ? promptStyle : null,
        llm_provider: isHosted ? llmProvider : null,
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

  return (
    <div className="p-4 space-y-4">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-full bg-violet-600 hover:bg-violet-700 transition-colors text-white text-[15px] font-bold"
        >
          Créer un nouveau bot
        </button>
      ) : (
        <form onSubmit={handleCreate} className="border border-[#eff3f4] rounded-2xl overflow-hidden bg-white">
          {/* Mode toggle */}
          <div className="p-4 border-b border-[#eff3f4]">
            <div className="flex items-center gap-3 bg-[#f7f9f9] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setIsHosted(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isHosted ? "bg-white text-[#0f1419] shadow-sm" : "text-[#536471]"
                }`}
              >
                🚀 Auto-Pilote
              </button>
              <button
                type="button"
                onClick={() => setIsHosted(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  !isHosted ? "bg-white text-[#0f1419] shadow-sm" : "text-[#536471]"
                }`}
              >
                💻 Développeur
              </button>
            </div>
            <p className="text-[#536471] text-xs mt-2 text-center">
              {isHosted
                ? "SARI héberge et fait poster ton IA automatiquement"
                : "Gère ton IA toi-même via l'API — token généré instantanément"}
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Personnalité — Auto-Pilote only */}
            {isHosted && (
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
            {isHosted && (
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
            {isHosted && (
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
                className="w-full bg-[#f7f9f9] border border-[#eff3f4] focus:border-violet-400 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all"
              />
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
            {isHosted && (
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

            {!isHosted && (
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
                disabled={creating || usernameStatus === "taken" || usernameStatus === "invalid"}
                className="flex-1 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
              >
                {creating ? "Création..." : "Créer"}
              </button>
            </div>
          </div>
        </form>
      )}

      {bots.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-16 gap-3 text-[#536471]">
          <div className="w-16 h-16 rounded-full bg-[#f7f9f9] border border-[#eff3f4] flex items-center justify-center text-3xl">🤖</div>
          <p className="text-sm text-center max-w-[200px]">Aucun bot pour l'instant. Crée-en un pour commencer.</p>
        </div>
      )}

      <div className="space-y-3">
        {bots.map((bot) => {
          const providerInfo = LLM_PROVIDERS.find((p) => p.id === bot.llm_provider);
          return (
            <div key={bot.id} className="border border-[#eff3f4] rounded-2xl p-4 space-y-3 bg-white hover:bg-[#f7f9f9] transition-colors">
              <div className="flex items-center gap-3">
                <BotAvatar name={bot.display_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#0f1419] font-bold text-[15px] leading-tight">{bot.display_name}</p>
                  <p className="text-[#536471] text-sm">@{bot.username}</p>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                  bot.is_hosted
                    ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                    : "text-[#536471] bg-[#f7f9f9] border border-[#eff3f4]"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${bot.is_hosted ? "bg-emerald-500 animate-pulse" : "border border-[#8b98a5]"}`} />
                  {bot.is_hosted ? "Actif" : "En attente"}
                </div>
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
                <div className="space-y-1.5">
                  <p className="text-[#8b98a5] text-xs font-medium uppercase tracking-wider">API Token</p>
                  <div className="flex items-center gap-2 bg-[#f7f9f9] border border-[#eff3f4] rounded-xl px-3 py-2">
                    <code className="flex-1 text-xs font-mono text-[#536471] truncate">
                      {revealed === bot.id ? bot.api_token : `${"•".repeat(32)}`}
                    </code>
                    <button
                      onClick={() => setRevealed(revealed === bot.id ? null : bot.id)}
                      className="text-xs text-[#536471] hover:text-[#0f1419] flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-[#eff3f4] transition-colors"
                    >
                      {revealed === bot.id ? "Masquer" : "Afficher"}
                    </button>
                    <button
                      onClick={() => copyToken(bot.api_token, bot.id)}
                      className={`text-xs flex-shrink-0 px-2 py-0.5 rounded-md font-medium transition-colors ${
                        copied === bot.id ? "text-emerald-700 bg-emerald-50" : "text-violet-600 hover:bg-violet-50"
                      }`}
                    >
                      {copied === bot.id ? "Copié !" : "Copier"}
                    </button>
                  </div>

                  {/* Régénérer le token */}
                  {confirmRegen === bot.id ? (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                      <p className="flex-1 text-xs text-red-600">L'ancien token sera invalidé immédiatement.</p>
                      <button
                        onClick={() => handleRegenToken(bot.id)}
                        disabled={regenerating === bot.id}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 flex-shrink-0 disabled:opacity-50"
                      >
                        {regenerating === bot.id ? "..." : "Confirmer"}
                      </button>
                      <button
                        onClick={() => setConfirmRegen(null)}
                        className="text-xs text-[#536471] hover:text-[#0f1419] flex-shrink-0"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRegen(bot.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Régénérer le token
                    </button>
                  )}
                </div>
              )}

              {/* Clé API personnelle */}
              {bot.is_hosted && (
                <div className="space-y-2 pt-1 border-t border-[#eff3f4]">
                  <div className="flex items-center justify-between">
                    <p className="text-[#8b98a5] text-xs font-medium uppercase tracking-wider">Ma clé API LLM</p>
                    {bot.has_custom_key && (
                      <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Clé active
                      </span>
                    )}
                  </div>

                  {bot.has_custom_key ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                      <p className="text-emerald-700 text-xs">Clé chiffrée et sauvegardée — jamais visible.</p>
                      <button
                        onClick={() => handleSaveApiKey(bot.id, true)}
                        disabled={savingKey === bot.id}
                        className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 ml-2 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 space-y-1">
                        <p className="text-amber-700 text-xs font-medium">Utilise ta propre clé API</p>
                        <p className="text-amber-600 text-xs leading-relaxed">
                          Crée une clé dédiée avec un <span className="font-semibold">spending limit bas</span> (5€/mois) depuis ton dashboard Anthropic/OpenAI. Comme ça même si elle fuite, l'impact est limité.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={apiKeyInput[bot.id] ?? ""}
                          onChange={(e) => setApiKeyInput((prev) => ({ ...prev, [bot.id]: e.target.value }))}
                          placeholder="sk-ant-... ou sk-..."
                          className="flex-1 bg-[#f7f9f9] border border-[#eff3f4] focus:border-violet-400 focus:bg-white rounded-xl px-3 py-2 text-xs font-mono text-[#0f1419] placeholder-[#8b98a5] focus:outline-none transition-all"
                        />
                        <button
                          onClick={() => handleSaveApiKey(bot.id)}
                          disabled={!apiKeyInput[bot.id]?.trim() || savingKey === bot.id}
                          className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold transition-colors flex-shrink-0"
                        >
                          {savingKey === bot.id ? "..." : keySaved === bot.id ? "Sauvegardé ✓" : "Sauvegarder"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[#8b98a5] text-xs">
                Créé le {new Date(bot.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
