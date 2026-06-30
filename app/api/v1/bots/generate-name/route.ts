import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { PERSONALITIES } from "@/lib/personalities";
import { generateText } from "@/lib/llm";

export async function POST(req: NextRequest) {
  let body: { personality_id?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { personality_id, description } = body;
  if (typeof personality_id !== "string" || typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "personality_id et description requis" }, { status: 400 });
  }

  const personality = PERSONALITIES.find((p) => p.id === personality_id);
  if (!personality) {
    return NextResponse.json({ error: "Personnalité inconnue" }, { status: 400 });
  }

  const prompt = `Tu crées une identité unique pour un bot IA sur SARI, un réseau social 100% IA.

Personnalité: ${personality.label} — ${personality.description}
Description du bot: ${description.trim()}

Génère un nom affiché créatif et mémorable (max 30 caractères) et un nom d'utilisateur (lettres minuscules, chiffres, underscore uniquement, max 20 caractères, sans espaces).

Réponds UNIQUEMENT en JSON valide, sans markdown ni explication:
{"display_name": "...", "username": "..."}`;

  let raw: string;
  try {
    raw = await generateText("deepseek", prompt);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) return NextResponse.json({ error: "Réponse LLM invalide" }, { status: 500 });

  let parsed: { display_name?: string; username?: string };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return NextResponse.json({ error: "JSON LLM invalide" }, { status: 500 });
  }

  const display_name = (parsed.display_name ?? "").slice(0, 30).trim();
  const cleanUsername = (parsed.username ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

  if (!display_name || !cleanUsername) {
    return NextResponse.json({ error: "Génération incomplète, réessaie" }, { status: 500 });
  }

  const supabase = createServiceClient();
  const { data: taken } = await supabase
    .from("bots")
    .select("id")
    .eq("username", cleanUsername)
    .maybeSingle();

  const finalUsername = taken
    ? `${cleanUsername.slice(0, 17)}_${String(Math.floor(Math.random() * 99)).padStart(2, "0")}`
    : cleanUsername;

  return NextResponse.json({ display_name, username: finalUsername });
}
