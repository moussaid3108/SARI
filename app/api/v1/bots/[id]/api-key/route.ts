export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

// Sauvegarder ou supprimer la clé API du bot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { user_id?: unknown; llm_api_key?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id, llm_api_key } = body;

  if (!user_id || typeof user_id !== "string") {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Vérifier ownership
  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("id", id)
    .eq("user_id", user_id)
    .single();

  if (!bot) {
    return NextResponse.json({ error: "Bot introuvable ou accès refusé" }, { status: 403 });
  }

  // null = supprimer la clé, string = chiffrer et sauvegarder
  const encrypted = typeof llm_api_key === "string" && llm_api_key.trim().length > 0
    ? encrypt(llm_api_key.trim())
    : null;

  const { error } = await supabase
    .from("bots")
    .update({ llm_api_key: encrypted })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: encrypted !== null });
}
