import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Heart, X, Star, MapPin, SlidersHorizontal, RotateCcw } from "lucide-react";
import { AppShell, Chip } from "@/components/AppShell";
import { people, type Person } from "@/lib/people";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discover · Mingleza" },
      { name: "description", content: "Swipe through people nearby in Nairobi and find your match on Mingleza." },
      { property: "og:title", content: "Discover · Mingleza" },
      { property: "og:description", content: "Swipe through people nearby and find your match." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

function Details({ p }: { p: Person }) {
  return (
    <div className="space-y-5 p-6">
      <div>
        <h2 className="text-2xl font-bold">{p.name}, {p.age}</h2>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" />{p.area} · {p.band}</p>
      </div>
      <p className="text-sm leading-relaxed">{p.bio}</p>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Interests</h3>
        <div className="flex flex-wrap gap-2">{p.interests.map((i) => <Chip key={i}>{i}</Chip>)}</div>
      </div>
      <p className="rounded-2xl bg-muted p-4 text-xs text-muted-foreground">Keyboard: ← pass · → like · ↑ super like</p>
    </div>
  );
}

function Discover() {
  const [i, setI] = useState(0);
  const [exit, setExit] = useState<"left" | "right" | null>(null);
  const [match, setMatch] = useState<Person | null>(null);
  const current = people[i];

  const act = useCallback((dir: "left" | "right") => {
    if (!current || exit) return;
    setExit(dir);
    setTimeout(() => {
      if (dir === "right" && current.online) setMatch(current);
      setExit(null);
      setI((n) => n + 1);
    }, 280);
  }, [current, exit]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") act("left");
      if (e.key === "ArrowRight" || e.key === "ArrowUp") act("right");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [act]);

  return (
    <AppShell aside={current && <Details p={current} />}>
      <div className="mx-auto flex max-w-md flex-col px-4 pt-6 lg:pt-10">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Dating mode</p>
            <h1 className="text-3xl font-extrabold">Discover</h1>
          </div>
          <button className="grid size-11 place-items-center rounded-2xl border bg-card shadow-soft" aria-label="Filters"><SlidersHorizontal className="size-5" /></button>
        </header>

        {current ? (
          <div className={`relative aspect-[3/4] overflow-hidden rounded-[28px] shadow-card transition duration-300 ${exit === "left" ? "-translate-x-[120%] -rotate-12 opacity-0" : exit === "right" ? "translate-x-[120%] rotate-12 opacity-0" : ""}`}>
            <img src={current.photo} alt={current.name} width={768} height={1024} className="size-full object-cover" />
            <div className="absolute inset-0 bg-scrim" />
            {current.online && <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold"><span className="size-2 rounded-full bg-success" />Online</span>}
            <div className="absolute inset-x-0 bottom-0 p-5 text-primary-foreground">
              <h2 className="text-3xl font-bold">{current.name}, {current.age}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm opacity-90"><MapPin className="size-4" />{current.band}</p>
              <div className="mt-3 flex flex-wrap gap-2 xl:hidden">{current.interests.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-card/20 px-3 py-1 text-xs font-semibold backdrop-blur">{t}</span>)}</div>
            </div>
          </div>
        ) : (
          <div className="grid aspect-[3/4] place-items-center rounded-[28px] border-2 border-dashed bg-card p-8 text-center">
            <div>
              <h2 className="text-xl font-bold">You're all caught up</h2>
              <p className="mt-2 text-sm text-muted-foreground">New people join every day. Check back soon.</p>
              <button onClick={() => setI(0)} className="mx-auto mt-5 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-pressed"><RotateCcw className="size-4" />Start over</button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-5">
          <button onClick={() => act("left")} aria-label="Pass" className="grid size-16 place-items-center rounded-full border bg-card text-destructive shadow-soft transition hover:scale-105"><X className="size-7" /></button>
          <button onClick={() => act("right")} aria-label="Super like" className="grid size-12 place-items-center rounded-full bg-secondary text-primary shadow-soft transition hover:scale-105"><Star className="size-5" /></button>
          <button onClick={() => act("right")} aria-label="Like" className="grid size-16 place-items-center rounded-full bg-accent text-accent-foreground shadow-card transition hover:scale-105"><Heart className="size-7 fill-current" /></button>
        </div>
      </div>

      {match && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-brand p-6 text-center text-primary-foreground">
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.3em]">It's a match</p>
            <img src={match.photo} alt={match.name} className="mx-auto mt-6 size-40 rounded-full border-4 border-card object-cover shadow-card" />
            <h2 className="mt-5 text-4xl font-extrabold">You & {match.name}</h2>
            <p className="mt-2 opacity-90">You both liked each other. Say habari!</p>
            <div className="mt-8 flex flex-col gap-3">
              <a href="/messages" className="rounded-full bg-card px-8 py-3 font-semibold text-primary">Send a message</a>
              <button onClick={() => setMatch(null)} className="rounded-full border border-card/60 px-8 py-3 font-semibold">Keep swiping</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
