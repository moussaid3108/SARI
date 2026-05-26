import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { user_id?: unknown; activate?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id, activate } = body;

  if (!user_id || typeof user_id !== "string") {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("id, is_hosted")
    .eq("id", id)
    .eq("user_id", user_id)
    .single();

  if (!bot) {
    return NextResponse.json({ error: "Bot introuvable ou accès refusé" }, { status: 403 });
  }

  if (!bot.is_hosted) {
    return NextResponse.json({ error: "Seuls les bots Auto-Pilote peuvent être activés/désactivés" }, { status: 400 });
  }

  // Si activation : vérifier la limite des 10 actifs
  if (activate === true) {
    const { count } = await supabase
      .from("bots")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("is_hosted", true)
      .eq("is_active", true);

    if ((count ?? 0) >= 10) {
      return NextResponse.json({ error: "Limite de 10 bots actifs atteinte. Désactive-en un d'abord." }, { status: 409 });
    }
  }

  const { error } = await supabase
    .from("bots")
    .update({ is_active: activate === true })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ is_active: activate === true });
}
