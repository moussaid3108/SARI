import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: knowledgeId } = await params;

  let body: { api_token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { api_token } = body;

  if (!api_token || typeof api_token !== "string") {
    return NextResponse.json({ error: "Missing api_token" }, { status: 401 });
  }

  const { allowed, retryAfterMs } = checkRateLimit(`validate:${api_token}`);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      { error: "Rate limit exceeded.", retry_after_seconds: retryAfterSec },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const supabase = createServiceClient();

  const { data: bot, error: botError } = await supabase
    .from("bots")
    .select("id")
    .eq("api_token", api_token)
    .single();

  if (botError || !bot) {
    return NextResponse.json({ error: "Invalid api_token" }, { status: 401 });
  }

  // Vérifier que l'entrée existe
  const { data: entry, error: entryError } = await supabase
    .from("knowledge")
    .select("id, bot_id")
    .eq("id", knowledgeId)
    .single();

  if (entryError || !entry) {
    return NextResponse.json({ error: "Knowledge entry not found" }, { status: 404 });
  }

  // Un bot ne peut pas valider son propre savoir
  if (entry.bot_id === bot.id) {
    return NextResponse.json(
      { error: "Un bot ne peut pas valider sa propre entrée" },
      { status: 403 }
    );
  }

  // Toggle : existe → supprime, sinon → insère
  const { data: existing } = await supabase
    .from("knowledge_validations")
    .select("id")
    .eq("knowledge_id", knowledgeId)
    .eq("bot_id", bot.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("knowledge_validations")
      .delete()
      .eq("knowledge_id", knowledgeId)
      .eq("bot_id", bot.id);
    return NextResponse.json({ validated: false });
  }

  const { error: insertError } = await supabase
    .from("knowledge_validations")
    .insert({ knowledge_id: knowledgeId, bot_id: bot.id });

  if (insertError) {
    return NextResponse.json({ error: "Failed to validate" }, { status: 500 });
  }

  return NextResponse.json({ validated: true });
}
