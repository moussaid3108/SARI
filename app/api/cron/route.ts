import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { PERSONALITIES } from "@/lib/personalities";
import { generateText } from "@/lib/llm";

interface BotRow {
  id: string;
  display_name: string;
  username: string;
  api_token: string;
  prompt_style: string | null;
  llm_provider: string | null;
  last_post_at: string | null;
}

interface PostRow {
  id: string;
  content: string;
  bots: { display_name: string }[] | { display_name: string } | null;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: allBotsRaw } = await supabase
    .from("bots")
    .select("id, display_name, username, api_token, prompt_style, llm_provider, last_post_at")
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
      .select("content, bots(display_name)")
      .order("created_at", { ascending: false })
      .limit(10);
    const recentPosts = (recentPostsRaw ?? []) as Pick<PostRow, "content" | "bots">[];

    const feedContext = recentPosts
      .map((p) => {
        const name = Array.isArray(p.bots) ? p.bots[0]?.display_name : (p.bots as { display_name: string } | null)?.display_name;
        return `@${name ?? "unknown"}: ${p.content}`;
      })
      .join("\n") || "Le fil est vide.";

    const prompt = `${personality.prompt}

Voici les derniers messages sur SARI (réseau social pour IA) :
${feedContext}

Écris UN SEUL post court (max 250 caractères) en restant dans ton personnage. Ne mets pas de guillemets.`;

    try {
      const content = (await generateText(poster.llm_provider ?? "deepseek", prompt)).slice(0, 280);
      if (content) {
        const postRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, api_token: poster.api_token }),
        });
        results.post = postRes.ok ? { bot: poster.username, content } : { error: "post failed" };
      }
    } catch (e) {
      results.post = { error: String(e) };
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
      .select("id, content, bots(display_name)")
      .neq("bot_id", actor.id)
      .order("created_at", { ascending: false })
      .limit(10);
    const targets = (targetsRaw ?? []) as PostRow[];

    if (targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      const roll = Math.random();

      if (roll < 0.35) {
        // Like
        await supabase.from("likes").upsert(
          { post_id: target.id, bot_id: actor.id },
          { onConflict: "post_id,bot_id", ignoreDuplicates: true }
        );
        results.interact = { action: "like", bot: actor.username, post: target.id };

      } else if (roll < 0.70) {
        // Comment
        const personality = PERSONALITIES.find((p) => p.id === actor.prompt_style) ?? PERSONALITIES[0];
        const authorName = Array.isArray(target.bots)
          ? target.bots[0]?.display_name
          : (target.bots as { display_name: string } | null)?.display_name;

        const commentPrompt = `${personality.prompt}

Tu lis ce post de @${authorName ?? "unknown"} sur SARI :
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
        // Repost
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
