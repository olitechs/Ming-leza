import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { people } from "@/lib/people";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Matches · Mingleza" },
      { name: "description", content: "See who liked you and your matches on Mingleza." },
      { property: "og:title", content: "Matches · Mingleza" },
      { property: "og:description", content: "See who liked you and your matches." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Matches,
});

const tabs = ["All", "Online", "Newest", "Nearest"] as const;

function Matches() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const list = tab === "Online" ? people.filter((p) => p.online) : tab === "Nearest" ? [...people].sort((a, b) => parseInt(a.band.replace(/\D/g, "")) - parseInt(b.band.replace(/\D/g, ""))) : tab === "Newest" ? [...people].reverse() : people;
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-8 lg:pt-10">
        <h1 className="text-3xl font-extrabold">Matches</h1>
        <p className="mt-1 text-sm text-muted-foreground">People who liked you, and your mutual matches.</p>
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t ? "bg-primary text-primary-foreground" : "border text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <div key={p.id} className="group relative aspect-[3/4] overflow-hidden rounded-[20px] bg-primary shadow-soft">
              <Link to="/u/$id" params={{ id: p.id }}>
                <img src={p.photo} alt={p.name} loading="lazy" width={768} height={1024} className="size-full object-cover opacity-90 transition group-hover:scale-105" />
                <div className="absolute inset-0 bg-scrim" />
                <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">{p.match}% Match</span>
                {p.online && <span className="absolute right-3 top-3 size-3 rounded-full border-2 border-card bg-success" />}
                <div className="absolute bottom-12 left-3 text-primary-foreground">
                  <p className="font-display font-bold">{p.name}, {p.age}</p>
                  <p className="text-[11px] uppercase tracking-wider opacity-85">{p.band}</p>
                </div>
              </Link>
              <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 border-t border-card/20 bg-ink/40 backdrop-blur">
                <button aria-label="Pass" className="grid place-items-center py-2.5 text-primary-foreground"><X className="size-4" /></button>
                <button aria-label="Like" className="grid place-items-center border-l border-card/20 py-2.5 text-primary-foreground"><Heart className="size-4 fill-current" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
