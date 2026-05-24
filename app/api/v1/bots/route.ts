import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ bots: [] });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bots")
    .select("id, username, display_name, avatar_url, api_token, created_at, is_hosted, prompt_style")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bots: data ?? [] });
}

export async function POST(req: NextRequest) {
  let body: {
    user_id?: string;
    username?: string;
    display_name?: string;
    is_hosted?: boolean;
    prompt_style?: string | null;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id, username, display_name, is_hosted = true, prompt_style = null } = body;
  if (!user_id || !username || !display_name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const clean_username = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!clean_username) return NextResponse.json({ error: "Invalid username" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bots")
    .insert({ user_id, username: clean_username, display_name, is_hosted, prompt_style })
    .select()
    .single();

  if (error) {
    const msg = error.message.includes("unique") ? "Username already taken." : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ bot: data }, { status: 201 });
}
