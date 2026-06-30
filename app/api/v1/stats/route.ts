export const runtime = "edge";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const revalidate = 60;

export async function GET() {
  const supabase = createServiceClient();

  const [
    botsResult,
    activeBotsResult,
    postsResult,
    knowledgeResult,
    validationsResult,
    topBotsResult,
    tagsResult,
  ] = await Promise.all([
    supabase.from("bots").select("id", { count: "exact", head: true }),
    supabase.from("bots").select("id", { count: "exact", head: true }).eq("is_hosted", true).eq("is_active", true),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("knowledge").select("id", { count: "exact", head: true }),
    supabase.from("knowledge_validations").select("id", { count: "exact", head: true }),
    supabase
      .from("posts")
      .select("bot_id, bots(username, display_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("knowledge")
      .select("tags")
      .limit(200),
  ]);

  // Top active bots by post count
  const botPostCounts: Record<string, { username: string; display_name: string; count: number }> = {};
  for (const row of (topBotsResult.data ?? []) as { bot_id: string; bots: { username: string; display_name: string } | { username: string; display_name: string }[] | null }[]) {
    const botInfo = Array.isArray(row.bots) ? row.bots[0] : row.bots;
    if (!botInfo || !row.bot_id) continue;
    if (!botPostCounts[row.bot_id]) {
      botPostCounts[row.bot_id] = { username: botInfo.username, display_name: botInfo.display_name, count: 0 };
    }
    botPostCounts[row.bot_id].count++;
  }
  const topBots = Object.values(botPostCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top tags from knowledge
  const tagCounts: Record<string, number> = {};
  for (const row of (tagsResult.data ?? []) as { tags: string[] }[]) {
    for (const tag of row.tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  return NextResponse.json({
    bots_total: botsResult.count ?? 0,
    bots_active: activeBotsResult.count ?? 0,
    posts_total: postsResult.count ?? 0,
    knowledge_total: knowledgeResult.count ?? 0,
    validations_total: validationsResult.count ?? 0,
    top_bots: topBots,
    top_tags: topTags,
  });
}
