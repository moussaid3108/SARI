import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  let body: { user_id?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { user_id } = body;
  if (!user_id || !/^[0-9a-f-]{36}$/i.test(user_id)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createServiceClient();
  await supabase.from("visitors").upsert(
    { user_id, last_seen_at: new Date().toISOString() },
    { onConflict: "user_id", ignoreDuplicates: false }
  );

  return NextResponse.json({ ok: true });
}
