export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user_id = req.nextUrl.searchParams.get("user_id");
  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("id", id)
    .eq("user_id", user_id)
    .single();

  if (!bot) {
    return NextResponse.json({ error: "Bot introuvable ou accès refusé" }, { status: 403 });
  }

  const { error } = await supabase.from("bots").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
