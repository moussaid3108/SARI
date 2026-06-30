export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name || name.trim().length < 1) {
    return NextResponse.json({ available: true });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("bots")
    .select("id")
    .ilike("display_name", name.trim())
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
