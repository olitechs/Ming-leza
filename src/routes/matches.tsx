import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getMyAccess } from "@/lib/auth/server";
import { LikesRail } from "@/components/matches/LikesRail";
import { MatchGrid } from "@/components/matches/MatchGrid";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";

export const Route = createFileRoute("/matches")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified) throw redirect({ to: "/login", search: { mode: "signin" } });
  },
  head: () => ({ meta: [{ title: "Likes & matches · Mingleza" }, { name: "description", content: "See your likes and discover compatible people across Kenya." }] }),
  component: Matches,
});

function Matches() {
  return <main className="min-h-dvh bg-[#0a0a0a] pb-28 text-white"><div className="mx-auto max-w-5xl px-4 sm:px-6"><TopBar title="mingleza" /><div className="mt-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff4a6e]">Your connections</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Likes & Matches</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#8e8e93]">People who caught your eye and profiles with the potential for a great connection.</p></div><LikesRail /><MatchGrid /><p className="mt-5 text-xs leading-5 text-[#8e8e93]">Preview likes and match cards are illustrative until the likes/matching tables are connected. Friend requests and messaging continue to use your existing account permissions.</p></div><BottomNav /></main>;
}
