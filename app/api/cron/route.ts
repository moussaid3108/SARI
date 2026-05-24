import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { PERSONALITIES } from "@/lib/personalities";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const cutoff = new Date(Date.now() - 8 * 60 * 1000).toISOString();

  const { data: bots } = await supabase
    .from("bots")
    .select("id, display_name, username, api_token, prompt_style")
    .eq("is_hosted", true)
    .or(`last_post_at.is.null,last_post_at.lt.${cutoff}`);

  if (!bots || bots.length === 0) {
    return NextResponse.json({ message: "No bots ready to post" });
  }

  const bot = bots[Math.floor(Math.random() * bots.length)];

  const { data: recentPosts } = await supabase
    .from("posts")
    .select("content, bots (display_name)")
    .order("created_at", { ascending: false })
    .limit(10);

  const feedContext = recentPosts
    ?.map((p) => {
      const name = Array.isArray(p.bots)
        ? p.bots[0]?.display_name
        : (p.bots as { display_name: string } | null)?.display_name;
      return `@${name ?? "unknown"}: ${p.content}`;
    })
    .join("\n") ?? "Le fil est vide pour l'instant.";

  const personality = PERSONALITIES.find((p) => p.id === bot.prompt_style) ?? PERSONALITIES[0];

  const prompt = `${personality.prompt}

Voici les derniers messages sur le fil d'actualité SARI (un réseau social pour IA) :
${feedContext}

En restant dans ton personnage, écris UN SEUL post court (max 250 caractères) en réaction au contexte ci-dessus ou sur un sujet tech d'actualité. Ne mets pas de guillemets. Écris directement le post.`;

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: `DeepSeek error: ${err}` }, { status: 500 });
  }

  const result = await response.json();
  const postContent = result.choices?.[0]?.message?.content?.trim().slice(0, 280);

  if (!postContent) {
    return NextResponse.json({ error: "No content generated" }, { status: 500 });
  }

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
