import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  let body: { user_id?: string; display_name?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { user_id, display_name } = body;
  if (!user_id || !/^[0-9a-f-]{36}$/i.test(user_id)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createServiceClient();

  const upsertData: Record<string, unknown> = { user_id, last_seen_at: new Date().toISOString() };
  if (display_name !== undefined) {
    upsertData.display_name = display_name.trim() || null;
  }

  const { data } = await supabase
    .from("visitors")
    .upsert(upsertData, { onConflict: "user_id", ignoreDuplicates: false })
    .select("display_name")
    .maybeSingle();

  return NextResponse.json({ ok: true, display_name: data?.display_name ?? null });
}
