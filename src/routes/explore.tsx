import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Search, Eye, EyeOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { people } from "@/lib/people";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore · Mingleza" },
      { name: "description", content: "See who's around your area in Nairobi — approximate areas only, never exact locations." },
      { property: "og:title", content: "Explore · Mingleza" },
      { property: "og:description", content: "See who's around your area, privately." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const [sel, setSel] = useState(people[0].id);
  const [visible, setVisible] = useState(true);
  const p = people.find((x) => x.id === sel)!;
  return (
    <AppShell>
      <div className="flex h-[calc(100vh-7rem)] flex-col lg:h-screen lg:flex-row">
        <section className="hidden w-80 shrink-0 overflow-y-auto border-r bg-card lg:block">
          <h1 className="px-5 pb-2 pt-6 text-3xl font-extrabold">Explore</h1>
          <p className="px-5 pb-4 text-xs text-muted-foreground">Areas are approximate. Exact locations are never shared.</p>
          {people.map((x) => (
            <button key={x.id} onMouseEnter={() => setSel(x.id)} onClick={() => setSel(x.id)} className={`flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted ${sel === x.id ? "bg-secondary" : ""}`}>
              <img src={x.photo} alt="" className="size-12 rounded-full object-cover" />
              <div><p className="font-semibold">{x.name}, {x.age}</p><p className="text-xs text-muted-foreground">{x.area} · {x.band}</p></div>
            </button>
          ))}
        </section>
        <section className="relative flex-1 overflow-hidden bg-map">
          <div className="absolute inset-x-4 top-4 z-10 flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-card px-4 py-3 shadow-soft"><Search className="size-4 text-muted-foreground" /><input placeholder="Search an area, e.g. Kilimani" className="flex-1 bg-transparent text-sm outline-none" /></div>
            <button onClick={() => setVisible(!visible)} title={visible ? "You're visible on the map" : "You're hidden"} className={`grid size-12 place-items-center rounded-full shadow-soft ${visible ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{visible ? <Eye className="size-5" /> : <EyeOff className="size-5" />}</button>
          </div>
          {people.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} style={{ left: `${x.map.x}%`, top: `${x.map.y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2">
              <span className={`absolute inset-0 -m-6 rounded-full bg-primary/15 ${sel === x.id ? "animate-pulse" : ""}`} />
              <img src={x.photo} alt={x.name} className={`relative size-12 rounded-full border-4 object-cover shadow-card transition ${sel === x.id ? "scale-125 border-primary" : "border-card"}`} />
            </button>
          ))}
          {visible && <span style={{ left: "50%", top: "50%" }} className="absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary ring-8 ring-primary/20" />}
          <div className="absolute inset-x-4 bottom-4 mx-auto flex max-w-sm items-center gap-3 rounded-3xl bg-card p-3 shadow-card">
            <Link to="/u/$id" params={{ id: p.id }} className="flex flex-1 items-center gap-3">
              <img src={p.photo} alt="" className="size-14 rounded-2xl object-cover" />
              <div><p className="font-display font-bold">{p.name}, {p.age}</p><p className="text-xs uppercase tracking-wide text-muted-foreground">{p.area}</p></div>
            </Link>
            <button aria-label="Like" className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><Heart className="size-5 fill-current" /></button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
