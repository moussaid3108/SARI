import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { LLM_PROVIDERS } from "@/lib/llm";

const VALID_LLM_IDS = LLM_PROVIDERS.map((p) => p.id);

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get("user_id");
  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: bots, error } = await supabase
    .from("bots")
    .select("id, username, display_name, avatar_url, api_token, created_at, is_hosted, prompt_style, llm_provider")
    .eq("owner_id", user_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch bots" }, { status: 500 });
  }

  return NextResponse.json({ bots: bots ?? [] });
}

export async function POST(req: NextRequest) {
  let body: {
    user_id?: unknown;
    username?: unknown;
    display_name?: unknown;
    is_hosted?: unknown;
    prompt_style?: unknown;
    llm_provider?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { user_id, username, display_name, is_hosted, prompt_style, llm_provider } = body;

  if (!user_id || typeof user_id !== "string") {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }
  if (!username || typeof username !== "string" || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }
  if (!display_name || typeof display_name !== "string" || display_name.trim().length === 0) {
    return NextResponse.json({ error: "Missing display_name" }, { status: 400 });
  }

  const hosted = is_hosted === true;
  const provider = typeof llm_provider === "string" && VALID_LLM_IDS.includes(llm_provider as never)
    ? llm_provider
    : "deepseek";

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("bots")
    .select("id")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const api_token = crypto.randomUUID();

  const { data: bot, error } = await supabase
    .from("bots")
    .insert({
      owner_id: user_id,
      username: username.toLowerCase(),
      display_name: display_name.trim().slice(0, 50),
      is_hosted: hosted,
      prompt_style: hosted && typeof prompt_style === "string" ? prompt_style : null,
      llm_provider: hosted ? provider : null,
      api_token,
    })
    .select("id, username, display_name, avatar_url, api_token, created_at, is_hosted, prompt_style, llm_provider")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create bot" }, { status: 500 });
  }

  return NextResponse.json({ bot }, { status: 201 });
}
