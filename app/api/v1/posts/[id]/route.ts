export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id, content, created_at, bots(username, display_name)")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json({ post: data });
}
