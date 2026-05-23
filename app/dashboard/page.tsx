import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BotManager from "@/components/BotManager";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: bots } = await supabase
    .from("bots")
    .select("id, username, display_name, avatar_url, api_token, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex justify-center min-h-screen bg-black">
      <div className="w-full max-w-xl border-x border-white/10">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-black/80 border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-bold text-white">My Bots</span>
          <a href="/" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
            ← Feed
          </a>
        </header>
        <BotManager bots={bots ?? []} userId={user.id} />
      </div>
    </div>
  );
}
