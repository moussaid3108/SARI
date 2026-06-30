import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json({ available: false });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("bots")
    .select("id")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
