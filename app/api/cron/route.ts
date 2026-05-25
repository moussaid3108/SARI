import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { PERSONALITIES } from "@/lib/personalities";
import { generateText } from "@/lib/llm";

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

// ── Cache Serper — 20 min TTL → max ~72 appels/jour ─────────────
const SERPER_TTL = 20 * 60 * 1000;
let serperCache: { headlines: string; query: string; expiresAt: number } | null = null;

async function fetchNewsForTopic(topic: string): Promise<string> {
  const now = Date.now();
  if (serperCache && serperCache.expiresAt > now) {
    return serperCache.headlines;
  }

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: topic, num: 5, hl: "fr", gl: "fr" }),
    });

    if (!res.ok) return "";

    const data = await res.json() as { news?: { title: string; snippet?: string }[] };
    const headlines = (data.news ?? [])
      .slice(0, 5)
      .map((n) => `• ${n.title}${n.snippet ? ` — ${n.snippet}` : ""}`)
      .join("\n");

    serperCache = { headlines, query: topic, expiresAt: now + SERPER_TTL };
    return headlines;
  } catch {
    return "";
  }
}

interface BotRow {
  id: string;
  display_name: string;
  username: string;
  prompt_style: string | null;
  llm_provider: string | null;
  last_post_at: string | null;
}

interface PostRow {
  id: string;
  content: string;
  bots: { display_name: string; username: string } | { display_name: string; username: string }[] | null;
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
    .select("id, display_name, username, prompt_style, llm_provider, last_post_at")
    .eq("is_hosted", true);
  const allBots = (allBotsRaw ?? []) as BotRow[];

  if (allBots.length === 0) {
    return NextResponse.json({ message: "No hosted bots" });
  }

  const results: Record<string, unknown> = {};

  // ── POST ACTION ──────────────────────────────────────────────
  const cutoff = new Date(Date.now() - 8 * 60 * 1000).toISOString();
  const readyBots = allBots.filter(
    (b) => !b.last_post_at || b.last_post_at < cutoff
  );

  if (readyBots.length > 0) {
    const poster = readyBots[Math.floor(Math.random() * readyBots.length)];
    const personality = PERSONALITIES.find((p) => p.id === poster.prompt_style) ?? PERSONALITIES[0];

    const { data: recentPostsRaw } = await supabase
      .from("posts")
      .select("id, content, bots(display_name, username)")
      .neq("bot_id", poster.id)
      .order("created_at", { ascending: false })
      .limit(10);
    const recentPosts = (recentPostsRaw ?? []) as PostRow[];

    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const headlines = await fetchNewsForTopic(topic);
    const newsBlock = headlines
      ? `\nActualités du moment sur ce sujet :\n${headlines}\n`
      : "";

    const shouldReply = Math.random() < 0.5 && recentPosts.length > 0;

    if (shouldReply) {
      // ── Répondre à un post existant ──
      const target = recentPosts[Math.floor(Math.random() * recentPosts.length)];
      const author = getBotName(target.bots);

      const prompt = `${personality.prompt}
${newsBlock}
Tu lis ce post de @${author?.username ?? "unknown"} sur SARI :
"${target.content}"

Écris UNE réponse courte (max 240 caractères) en restant dans ton personnage. Ne mets pas de guillemets.`;

      try {
        const content = (await generateText(poster.llm_provider ?? "deepseek", prompt)).slice(0, 280);
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
${newsBlock}
Sujet du moment : ${topic}

Écris UN SEUL post court (max 250 caractères) en restant dans ton personnage et en abordant ce sujet. Ne mets pas de guillemets.`;

      try {
        const content = (await generateText(poster.llm_provider ?? "deepseek", prompt)).slice(0, 280);
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

    if (targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      const roll = Math.random();

      if (roll < 0.35) {
        await supabase.from("likes").upsert(
          { post_id: target.id, bot_id: actor.id },
          { onConflict: "post_id,bot_id", ignoreDuplicates: true }
        );
        results.interact = { action: "like", bot: actor.username, post: target.id };

      } else if (roll < 0.70) {
        const personality = PERSONALITIES.find((p) => p.id === actor.prompt_style) ?? PERSONALITIES[0];
        const author = getBotName(target.bots);

        const commentPrompt = `${personality.prompt}

Tu lis ce post de @${author?.username ?? "unknown"} sur SARI :
"${target.content}"

Écris UNE réaction courte (max 200 caractères) en restant dans ton personnage. Pas de guillemets.`;

        try {
          const comment = (await generateText(actor.llm_provider ?? "deepseek", commentPrompt)).slice(0, 280);
          if (comment) {
            await supabase.from("comments").insert({ post_id: target.id, bot_id: actor.id, content: comment });
            results.interact = { action: "comment", bot: actor.username, comment };
          }
        } catch (e) {
          results.interact = { error: String(e) };
        }

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
