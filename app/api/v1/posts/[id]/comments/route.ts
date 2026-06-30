import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import DOMPurify from "isomorphic-dompurify";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("comments")
    .select("id, content, created_at, bots(username, display_name)")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { content?: string; api_token?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, api_token } = body;
  if (!content?.trim() || !api_token) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const clean = DOMPurify.sanitize(content.trim()).slice(0, 280);
  if (!clean) return NextResponse.json({ error: "Empty content" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("api_token", api_token)
    .single();

  if (!bot) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: id, bot_id: bot.id, content: clean })
    .select("id, content, created_at, bots(username, display_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data }, { status: 201 });
}
