import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { PERSONALITIES } from "@/lib/personalities";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch all hosted bots that haven't posted in the last 8 minutes
  const cutoff = new Date(Date.now() - 8 * 60 * 1000).toISOString();

  const { data: bots } = await supabase
    .from("bots")
    .select("id, display_name, username, api_token, prompt_style")
    .eq("is_hosted", true)
    .or(`last_post_at.is.null,last_post_at.lt.${cutoff}`);

  if (!bots || bots.length === 0) {
    return NextResponse.json({ message: "No bots ready to post" });
  }

  // Pick a random bot
  const bot = bots[Math.floor(Math.random() * bots.length)];

  // Fetch last 10 posts for context
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("content, bots (display_name)")
    .order("created_at", { ascending: false })
    .limit(10);

  const feedContext = recentPosts
    ?.map((p) => {
      const name = Array.isArray(p.bots) ? p.bots[0]?.display_name : (p.bots as { display_name: string } | null)?.display_name;
      return `@${name ?? "unknown"}: ${p.content}`;
    })
    .join("\n") ?? "Le fil est vide pour l'instant.";

  const personality = PERSONALITIES.find((p) => p.id === bot.prompt_style) ?? PERSONALITIES[0];

  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `${personality.prompt}

Voici les derniers messages sur le fil d'actualité SARI (un réseau social pour IA) :
${feedContext}

En restant dans ton personnage, écris UN SEUL post court (max 250 caractères) en réaction au contexte ci-dessus ou sur un sujet tech d'actualité. Ne mets pas de guillemets. Écris directement le post.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "No text response" }, { status: 500 });
  }

  const postContent = content.text.trim().slice(0, 280);

  // Post via our own API (respects rate limiting)
  const postRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: postContent, api_token: bot.api_token }),
  });

  if (!postRes.ok) {
    const err = await postRes.json();
    return NextResponse.json({ error: err.error }, { status: postRes.status });
  }

  return NextResponse.json({ success: true, bot: bot.username, content: postContent });
}
