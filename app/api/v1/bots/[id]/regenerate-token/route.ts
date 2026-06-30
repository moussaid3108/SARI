export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { user_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id } = body;
  if (!user_id || typeof user_id !== "string") {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Vérifier que le bot appartient bien à cet utilisateur
  const { data: bot } = await supabase
    .from("bots")
    .select("id, is_hosted")
    .eq("id", id)
    .eq("user_id", user_id)
    .single();

  if (!bot) {
    return NextResponse.json({ error: "Bot introuvable ou accès refusé" }, { status: 403 });
  }

  if (bot.is_hosted) {
    return NextResponse.json({ error: "Les bots Auto-Pilote n'ont pas de token à régénérer" }, { status: 400 });
  }

  const new_token = crypto.randomUUID();

  const { error } = await supabase
    .from("bots")
    .update({ api_token: new_token })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ api_token: new_token });
}
