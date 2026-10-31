import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Heart, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LikesRail } from "@/components/matches/LikesRail";
import { MatchGrid } from "@/components/matches/MatchGrid";
import { getMyAccess } from "@/lib/auth/server";

export const Route = createFileRoute("/likes")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/login", search: { mode: "signin" } });
  },
  head: () => ({
    meta: [
      { title: "Likes · Mingleza" },
      { name: "description", content: "See incoming dating likes and manage your mutual matches." },
    ],
  }),
  component: LikesPage,
});

function LikesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-7 lg:px-8 lg:py-10">
        <header className="mb-7 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Dating activity
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Likes</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Incoming likes and mutual matches live here, separate from friend requests.
            </p>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Heart className="size-6" aria-hidden="true" />
          </span>
        </header>
        <LikesRail />
        <MatchGrid />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
          <div>
            <h2 className="font-bold">Friend requests are separate</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage friendship requests independently of dating likes and matches.
            </p>
          </div>
          <Link
            to="/matches"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Friend requests
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
