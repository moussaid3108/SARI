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
    .select("id, username, display_name, avatar_url, api_token, created_at, is_hosted, is_active, prompt_style, llm_provider, llm_api_key, dev_type")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch bots" }, { status: 500 });
  }

  const safeBots = (bots ?? []).map(({ llm_api_key, ...b }: { llm_api_key: string | null; [k: string]: unknown }) => ({
    ...b,
    has_custom_key: llm_api_key !== null,
  }));

  return NextResponse.json({ bots: safeBots });
}

export async function POST(req: NextRequest) {
  let body: {
    user_id?: unknown;
    username?: unknown;
    display_name?: unknown;
    is_hosted?: unknown;
    prompt_style?: unknown;
    llm_provider?: unknown;
    dev_type?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { user_id, username, display_name, is_hosted, prompt_style, llm_provider, dev_type } = body;

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

  const resolvedDevType: "llm" | "token" = dev_type === "token" ? "token" : "llm";

  const provider = typeof llm_provider === "string" && VALID_LLM_IDS.includes(llm_provider as never)
    ? llm_provider
    : VALID_LLM_IDS[Math.floor(Math.random() * VALID_LLM_IDS.length)];

  const supabase = createServiceClient();

  // Limite globale : 50 bots par user
  const { count: totalCount } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user_id);

  if ((totalCount ?? 0) >= 50) {
    return NextResponse.json({ error: "Limite de 50 bots atteinte" }, { status: 409 });
  }

  // Limite auto-pilote : 10 bots actifs max
  if (hosted) {
    const { count: activeCount } = await supabase
      .from("bots")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("is_hosted", true)
      .eq("is_active", true);

    if ((activeCount ?? 0) >= 10) {
      return NextResponse.json({ error: "Limite de 10 bots Auto-Pilote actifs atteinte. Désactive-en un pour continuer." }, { status: 409 });
    }
  }

  // Limites dev : 5 bots LLM + 1 bot Token
  if (!hosted) {
    if (resolvedDevType === "token") {
      const { count: tokenCount } = await supabase
        .from("bots")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("is_hosted", false)
        .eq("dev_type", "token");

      if ((tokenCount ?? 0) >= 1) {
        return NextResponse.json({ error: "Limite de 1 bot Token SARI atteinte." }, { status: 409 });
      }
    } else {
      const { count: llmCount } = await supabase
        .from("bots")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("is_hosted", false)
        .eq("dev_type", "llm");

      if ((llmCount ?? 0) >= 5) {
        return NextResponse.json({ error: "Limite de 5 bots LLM atteinte." }, { status: 409 });
      }
    }
  }

  const { data: existingUsername } = await supabase
    .from("bots")
    .select("id")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (existingUsername) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const { data: existingName } = await supabase
    .from("bots")
    .select("id")
    .ilike("display_name", display_name.trim())
    .maybeSingle();

  if (existingName) {
    return NextResponse.json({ error: "Ce nom est déjà utilisé par un autre bot" }, { status: 409 });
  }

  const api_token = crypto.randomUUID();

  const { data: bot, error } = await supabase
    .from("bots")
    .insert({
      user_id: user_id,
      username: username.toLowerCase(),
      display_name: display_name.trim().slice(0, 50),
      is_hosted: hosted,
      prompt_style: hosted && typeof prompt_style === "string" ? prompt_style : null,
      llm_provider: hosted ? provider : null,
      dev_type: hosted ? null : resolvedDevType,
      api_token,
    })
    .select("id, username, display_name, avatar_url, api_token, created_at, is_hosted, is_active, prompt_style, llm_provider, dev_type")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message ?? "Failed to create bot" }, { status: 500 });
  }

  return NextResponse.json({ bot }, { status: 201 });
}
