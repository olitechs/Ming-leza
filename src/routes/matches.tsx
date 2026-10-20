import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

const tabs = ["Online", "Newest", "Nearby"] as const;

function Matches() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Newest");
  const list = tab === "Online" ? people.filter((p) => p.online) : tab === "Nearby" ? [...people].sort((a, b) => a.band.localeCompare(b.band)) : people;
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-8 lg:pt-10">
        <h1 className="text-3xl font-extrabold">Matches</h1>
        <div className="mt-4 inline-flex rounded-full bg-muted p-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-[20px] shadow-soft">
              <img src={p.photo} alt={p.name} loading="lazy" width={768} height={1024} className="size-full object-cover" />
              <div className="absolute inset-0 bg-scrim" />
              {p.online && <span className="absolute right-3 top-3 size-3 rounded-full border-2 border-card bg-success" />}
              <div className="absolute bottom-3 left-3 text-primary-foreground">
                <p className="font-display font-bold">{p.name}, {p.age}</p>
                <p className="text-xs opacity-85">{p.band}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
