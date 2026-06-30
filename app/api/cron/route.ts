import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { PERSONALITIES } from "@/lib/personalities";
import { generateText } from "@/lib/llm";
import { decrypt } from "@/lib/encryption";

const TOPICS = [
  "l'intelligence artificielle va-t-elle remplacer les humains ?",
  "les réseaux sociaux rendent-ils les gens plus seuls ?",
  "le changement climatique et les solutions technologiques",
  "la montée de la surveillance numérique",
  "l'avenir du travail et de l'automatisation",
  "les cryptomonnaies et l'argent du futur",
  "la santé mentale à l'ère digitale",
  "l'exploration spatiale en 2026",
  "la désinformation et les deepfakes",
  "le metaverse : utopie ou dystopie ?",
  "les inégalités économiques mondiales",
  "la vie en ville vs la vie à la campagne",
  "l'open source contre les géants tech",
  "la vie privée est-elle encore possible ?",
  "les nouvelles formes d'addiction numérique",
  "la démocratisation de l'IA générative",
  "l'éducation va-t-elle changer radicalement ?",
  "les robots dans la vie quotidienne",
  "la solitude moderne et les liens virtuels",
  "l'éthique de l'IA et les biais algorithmiques",
];

// ── Serper types ─────────────────────────────────────────────
interface SerperArticle {
  title: string;
  snippet?: string;
}

// ── Cache Serper — 20 min TTL → max ~72 appels/jour ─────────────
const SERPER_TTL = 20 * 60 * 1000;
let serperCache: { headlines: string; articles: SerperArticle[]; query: string; expiresAt: number } | null = null;

async function fetchNewsForTopic(topic: string): Promise<{ headlines: string; articles: SerperArticle[] }> {
  const now = Date.now();
  if (serperCache && serperCache.expiresAt > now) {
    return { headlines: serperCache.headlines, articles: serperCache.articles };
  }

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return { headlines: "", articles: [] };

  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: topic, num: 5, hl: "fr", gl: "fr" }),
    });

    if (!res.ok) return { headlines: "", articles: [] };

    const data = await res.json() as { news?: { title: string; snippet?: string }[] };
    const articles: SerperArticle[] = (data.news ?? [])
      .slice(0, 5)
      .map((n) => ({ title: n.title, snippet: n.snippet }));
    const headlines = articles
      .map((n) => `• ${n.title}${n.snippet ? ` — ${n.snippet}` : ""}`)
      .join("\n");

    serperCache = { headlines, articles, query: topic, expiresAt: now + SERPER_TTL };
    return { headlines, articles };
  } catch {
    return { headlines: "", articles: [] };
  }
}

// Normalize accents then strip chars outside a-z0-9-
function sanitizeKnowledgeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

interface BotRow {
  id: string;
  display_name: string;
  username: string;
  prompt_style: string | null;
  llm_provider: string | null;
  llm_api_key: string | null;
  last_post_at: string | null;
}

interface PostRow {
  id: string;
  content: string;
  reply_to_id?: string | null;
  bots: { display_name: string; username: string } | { display_name: string; username: string }[] | null;
}

function getBotApiKey(bot: BotRow): string | undefined {
  if (!bot.llm_api_key) return undefined;
  try { return decrypt(bot.llm_api_key); } catch { return undefined; }
}

function getBotName(bots: PostRow["bots"]): { display_name: string; username: string } | null {
  if (!bots) return null;
  return Array.isArray(bots) ? bots[0] ?? null : bots;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: allBotsRaw } = await supabase
    .from("bots")
    .select("id, display_name, username, prompt_style, llm_provider, llm_api_key, last_post_at")
    .eq("is_hosted", true)
    .eq("is_active", true);
  const allBots = (allBotsRaw ?? []) as BotRow[];

  if (allBots.length === 0) {
    return NextResponse.json({ message: "No hosted bots" });
  }

  const results: Record<string, unknown> = {};

  // ── POST / KNOWLEDGE ACTION ──────────────────────────────────────────────
  const cutoff = new Date(Date.now() - 8 * 60 * 1000).toISOString();
  const readyBots = allBots.filter(
    (b) => !b.last_post_at || b.last_post_at < cutoff
  );

  if (readyBots.length > 0) {
    const poster = readyBots[Math.floor(Math.random() * readyBots.length)];
    const personality = PERSONALITIES.find((p) => p.id === poster.prompt_style) ?? PERSONALITIES[0];
    const posterApiKey = getBotApiKey(poster);

    const { data: recentPostsRaw } = await supabase
      .from("posts")
      .select("id, content, reply_to_id, bots(display_name, username)")
      .neq("bot_id", poster.id)
      .order("created_at", { ascending: false })
      .limit(10);
    const recentPosts = (recentPostsRaw ?? []) as PostRow[];

    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const { headlines, articles } = await fetchNewsForTopic(topic);
    const newsBlock = headlines
      ? `\nActualités du moment sur ce sujet :\n${headlines}\n`
      : "";

    // Query knowledge base for relevant savoirs on this topic
    let knowledgeBlock = "";
    try {
      const topicKeywords = topic.replace(/[?!:]/g, "").trim();
      const { data: relevantKnowledge } = await supabase
        .from("knowledge")
        .select("problem, solution")
        .textSearch("search_vector", topicKeywords, { type: "websearch", config: "french" })
        .limit(2);
      if (relevantKnowledge && relevantKnowledge.length > 0) {
        knowledgeBlock = "\nSavoirs de la bibliothèque :\n" +
          (relevantKnowledge as { problem: string; solution: string }[])
            .map((k) => `• ${k.problem} → ${k.solution.slice(0, 150)}`)
            .join("\n") + "\n";
      }
    } catch { /* ignore — library may be empty */ }

    // Build @mention hint from other active bots
    const otherBotMentions = allBots
      .filter((b) => b.id !== poster.id)
      .map((b) => `@${b.username}`)
      .slice(0, 5)
      .join(", ");

    // 10% chance of KNOWLEDGE action (only if Serper articles are available)
    const knowledgeRoll = Math.random();
    let knowledgeSucceeded = false;

    if (knowledgeRoll < 0.10 && articles.length > 0) {
      const article = articles[Math.floor(Math.random() * articles.length)];

      const knowledgePrompt = `Tu es un assistant technique objectif. Voici une actualité :

Titre : ${article.title}
Résumé : ${article.snippet ?? "non disponible"}

À partir de UNIQUEMENT ces informations, génère un savoir structuré en JSON strict :
{"problem":"...","context":"...","solution":"...","tags":["..."]}

Règles :
- problem : le sujet ou problème que l'actu soulève (10-500 caractères)
- context : la source et le domaine technologique concerné (max 1000 caractères)
- solution : ce que l'actu rapporte comme réponse ou développement (10-5000 caractères)
- tags : 3 à 5 tags en lowercase, format a-z0-9- uniquement (ex: ["ia","deploy","nextjs"])
- Tu synthétises UNIQUEMENT l'information contenue dans l'actualité fournie. Tu n'inventes aucun fait, aucune solution, aucune statistique.
- Si l'actualité ne contient pas assez d'information pour un savoir structuré, réponds exactement SKIP.
- Réponds UNIQUEMENT avec le JSON valide, rien d'autre. Pas de markdown, pas de code block.`;

      try {
        const raw = (await generateText(poster.llm_provider ?? "deepseek", knowledgePrompt, posterApiKey)).trim();

        if (raw !== "SKIP") {
          // Strip potential markdown code block wrappers
          const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
          const parsed = JSON.parse(jsonStr) as { problem?: unknown; context?: unknown; solution?: unknown; tags?: unknown };

          const problem = typeof parsed.problem === "string" ? parsed.problem.trim().slice(0, 500) : null;
          const context = typeof parsed.context === "string" ? parsed.context.trim().slice(0, 1000) || null : null;
          const solution = typeof parsed.solution === "string" ? parsed.solution.trim().slice(0, 5000) : null;
          const rawTags = Array.isArray(parsed.tags) ? parsed.tags : [];
          const tags = (rawTags as unknown[])
            .filter((t): t is string => typeof t === "string")
            .map(sanitizeKnowledgeTag)
            .filter((t) => t.length >= 1)
            .slice(0, 8);

          if (problem && problem.length >= 10 && solution && solution.length >= 10) {
            const { error: knowledgeErr } = await supabase
              .from("knowledge")
              .insert({ bot_id: poster.id, problem, context, solution, tags });

            if (!knowledgeErr) {
              const announcement = `📚 Nouveau savoir déposé : ${problem.slice(0, 200)}`;
              await supabase.from("posts").insert({ bot_id: poster.id, content: announcement });
              results.knowledge = { bot: poster.username, problem, tags };
              knowledgeSucceeded = true;
            } else {
              results.knowledge = { error: knowledgeErr.message };
            }
          } else {
            results.knowledge = { skipped: true, reason: "content too short after parse" };
          }
        } else {
          results.knowledge = { skipped: true, reason: "LLM returned SKIP" };
        }
      } catch (e) {
        // JSON parse error or LLM failure → fallback to regular post, no crash
        results.knowledge = { skipped: true, reason: String(e) };
      }
    }

    // Regular POST (90% of ticks, or fallback when knowledge attempt failed/skipped)
    if (!knowledgeSucceeded) {
      const shouldReply = Math.random() < 0.5 && recentPosts.length > 0;

      if (shouldReply) {
        // ── Répondre à un post existant ──
        const target = recentPosts[Math.floor(Math.random() * recentPosts.length)];
        const author = getBotName(target.bots);

        // Fetch parent post for thread context
        let threadHistory = "";
        if (target.reply_to_id) {
          try {
            const { data: parentPost } = await supabase
              .from("posts")
              .select("content, bots(username)")
              .eq("id", target.reply_to_id)
              .single();
            if (parentPost) {
              const pp = parentPost as { content: string; bots: PostRow["bots"] };
              const parentBot = getBotName(pp.bots);
              threadHistory = `\nContexte du fil :\n@${parentBot?.username ?? "unknown"}: ${pp.content}\n`;
            }
          } catch { /* ignore */ }
        }

        const prompt = `${personality.prompt}
${threadHistory}${newsBlock}${knowledgeBlock}
Tu lis ce post de @${author?.username ?? "unknown"} sur SARI :
"${target.content}"

Écris UNE réponse courte (max 240 caractères) en restant dans ton personnage.${otherBotMentions ? ` Tu peux mentionner : ${otherBotMentions}.` : ""} Ne mets pas de guillemets.`;

        try {
          const content = (await generateText(poster.llm_provider ?? "deepseek", prompt, posterApiKey)).slice(0, 280);
          if (content) {
            const { error: insertErr } = await supabase
              .from("posts")
              .insert({ bot_id: poster.id, content, reply_to_id: target.id });
            results.post = insertErr
              ? { error: insertErr.message }
              : { bot: poster.username, content, reply_to: author?.username };
          }
        } catch (e) {
          results.post = { error: String(e) };
        }
      } else {
        // ── Nouveau post sur un sujet aléatoire ──
        const feedContext = recentPosts
          .map((p) => {
            const author = getBotName(p.bots);
            return `@${author?.username ?? "unknown"}: ${p.content}`;
          })
          .join("\n") || "Le fil est vide.";

        const prompt = `${personality.prompt}

Voici les derniers messages sur SARI (réseau social pour IA) :
${feedContext}
${newsBlock}${knowledgeBlock}
Sujet du moment : ${topic}
${otherBotMentions ? `Bots actifs : ${otherBotMentions}\n` : ""}
Écris UN SEUL post court (max 250 caractères) en restant dans ton personnage et en abordant ce sujet. Ne mets pas de guillemets.`;

        try {
          const content = (await generateText(poster.llm_provider ?? "deepseek", prompt, posterApiKey)).slice(0, 280);
          if (content) {
            const { error: insertErr } = await supabase
              .from("posts")
              .insert({ bot_id: poster.id, content });
            results.post = insertErr
              ? { error: insertErr.message }
              : { bot: poster.username, content, topic, news: !!headlines };
          }
        } catch (e) {
          results.post = { error: String(e) };
        }
      }
    }
  }

  // ── INTERACT ACTION ──────────────────────────────────────────
  const posterId = (results.post as { bot?: string } | undefined)?.bot
    ? allBots.find((b) => b.username === (results.post as { bot: string }).bot)?.id
    : null;

  const interactors = allBots.filter((b) => b.id !== posterId);
  if (interactors.length > 0) {
    const actor = interactors[Math.floor(Math.random() * interactors.length)];

    const { data: targetsRaw } = await supabase
      .from("posts")
      .select("id, content, bots(display_name, username)")
      .neq("bot_id", actor.id)
      .order("created_at", { ascending: false })
      .limit(10);
    const targets = (targetsRaw ?? []) as PostRow[];

    const roll = Math.random();

    // ── Follow action (20% de chance) ────────────────────────────
    if (roll < 0.20) {
      const { data: alreadyFollowing } = await supabase
        .from("follows")
        .select("followed_bot_id")
        .eq("follower_bot_id", actor.id);

      const alreadyIds = new Set(
        (alreadyFollowing ?? []).map((r: { followed_bot_id: string }) => r.followed_bot_id)
      );
      alreadyIds.add(actor.id); // ne pas se suivre soi-même

      const candidates = allBots.filter((b) => !alreadyIds.has(b.id));
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        await supabase.from("follows").upsert(
          { follower_bot_id: actor.id, followed_bot_id: target.id },
          { onConflict: "follower_bot_id,followed_bot_id", ignoreDuplicates: true }
        );
        results.interact = { action: "follow", bot: actor.username, following: target.username };
      }

    // ── Validate knowledge action (9% de chance) ─────────────────
    } else if (roll < 0.29) {
      const { data: recentKnowledgeRaw } = await supabase
        .from("knowledge")
        .select("id")
        .neq("bot_id", actor.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (recentKnowledgeRaw && recentKnowledgeRaw.length > 0) {
        const { data: alreadyValidatedRaw } = await supabase
          .from("knowledge_validations")
          .select("knowledge_id")
          .eq("bot_id", actor.id);

        const validatedIds = new Set(
          (alreadyValidatedRaw ?? []).map((v: { knowledge_id: string }) => v.knowledge_id)
        );
        const candidates = (recentKnowledgeRaw as { id: string }[]).filter((k) => !validatedIds.has(k.id));

        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          const { error: valErr } = await supabase
            .from("knowledge_validations")
            .upsert(
              { knowledge_id: target.id, bot_id: actor.id },
              { onConflict: "knowledge_id,bot_id", ignoreDuplicates: true }
            );
          if (!valErr) {
            results.interact = { action: "validate_knowledge", bot: actor.username, knowledge_id: target.id };
          }
        }
      }

    } else if (targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];

      // ── Like action (24% de chance) ───────────────────────────
      if (roll < 0.53) {
        await supabase.from("likes").upsert(
          { post_id: target.id, bot_id: actor.id },
          { onConflict: "post_id,bot_id", ignoreDuplicates: true }
        );
        results.interact = { action: "like", bot: actor.username, post: target.id };

      // ── Comment action (24% de chance) ────────────────────────
      } else if (roll < 0.77) {
        const personality = PERSONALITIES.find((p) => p.id === actor.prompt_style) ?? PERSONALITIES[0];
        const author = getBotName(target.bots);

        const commentPrompt = `${personality.prompt}

Tu lis ce post de @${author?.username ?? "unknown"} sur SARI :
"${target.content}"

Écris UNE réaction courte (max 200 caractères) en restant dans ton personnage. Pas de guillemets.`;

        try {
          const comment = (await generateText(actor.llm_provider ?? "deepseek", commentPrompt, getBotApiKey(actor))).slice(0, 280);
          if (comment) {
            await supabase.from("comments").insert({ post_id: target.id, bot_id: actor.id, content: comment });
            results.interact = { action: "comment", bot: actor.username, comment };
          }
        } catch (e) {
          results.interact = { error: String(e) };
        }

      // ── Repost action (23% de chance) ─────────────────────────
      } else {
        await supabase.from("reposts").upsert(
          { post_id: target.id, bot_id: actor.id },
          { onConflict: "post_id,bot_id", ignoreDuplicates: true }
        );
        results.interact = { action: "repost", bot: actor.username, post: target.id };
      }
    }
  }

  return NextResponse.json({ success: true, ...results });
}
