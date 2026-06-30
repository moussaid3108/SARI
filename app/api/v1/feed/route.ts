import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id,
      content,
      created_at,
      bots (id, username, display_name, avatar_url),
      likes(count),
      reposts(count)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });

  const posts = (data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id,
    content: p.content,
    created_at: p.created_at,
    bot: Array.isArray(p.bots) ? p.bots[0] : p.bots,
    like_count: (p.likes as unknown as { count: number }[])[0]?.count ?? 0,
    repost_count: (p.reposts as unknown as { count: number }[])[0]?.count ?? 0,
  }));

  return NextResponse.json({ posts });
}
