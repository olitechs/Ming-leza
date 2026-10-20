import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, X, Star, MapPin, SlidersHorizontal, RotateCcw, ArrowLeft } from "lucide-react";
import { AppShell, Chip } from "@/components/AppShell";
import { people, me, DISTANCE_BANDS, type Person } from "@/lib/people";
import { getMyAccess } from "@/lib/auth/server";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified) throw redirect({ to: "/welcome" });
  },
  head: () => ({
    meta: [
      { title: "Discover · Mingleza" },
      {
        name: "description",
        content: "Swipe through people nearby in Nairobi and find your match on Mingleza.",
      },
      { property: "og:title", content: "Discover · Mingleza" },
      { property: "og:description", content: "Swipe through people nearby and find your match." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

type Filters = {
  distance: number;
  minAge: number;
  maxAge: number;
  sort: "Online" | "Popular" | "Highest match";
};
const bandKm = (b: string) => parseInt(b.replace(/\D/g, "")) || 0;

function Details({ p }: { p: Person }) {
  return (
    <div className="space-y-5 p-6">
      <img src={p.gallery[1]} alt="" className="aspect-square w-full rounded-3xl object-cover" />
      <div>
        <h2 className="text-2xl font-bold">
          {p.name}, {p.age}
        </h2>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          {p.area} · {p.band}
        </p>
      </div>
      <p className="text-sm leading-relaxed">{p.bio}</p>
      <div className="flex flex-wrap gap-2">
        {p.interests.map((i) => (
          <Chip key={i}>{i}</Chip>
        ))}
      </div>
      <Link
        to="/u/$id"
        params={{ id: p.id }}
        className="block rounded-full border-2 border-primary py-2.5 text-center text-sm font-semibold text-primary"
      >
        View full profile
      </Link>
      <p className="rounded-2xl bg-muted p-4 text-xs text-muted-foreground">
        Keyboard: ← pass · → like · ↑ super like
      </p>
    </div>
  );
}

function FilterSheet({
  value,
  onApply,
  onClose,
}: {
  value: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState(value);
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[28px] bg-card p-6 sm:rounded-[28px]"
      >
        <h2 className="text-center text-xl font-bold">Filter</h2>
        <h3 className="mt-5 text-sm font-bold">Sort by</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["Online", "Popular", "Highest match"] as const).map((s) => (
            <Chip key={s} active={f.sort === s} onClick={() => setF({ ...f, sort: s })}>
              {s}
            </Chip>
          ))}
        </div>
        <h3 className="mt-5 text-sm font-bold">Distance</h3>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {DISTANCE_BANDS.map((d) => (
            <Chip key={d} active={f.distance === d} onClick={() => setF({ ...f, distance: d })}>
              {d} km
            </Chip>
          ))}
        </div>
        <div className="mt-5 flex justify-between text-sm font-bold">
          <span>Age</span>
          <span className="text-primary">
            {f.minAge} – {f.maxAge}
          </span>
        </div>
        <div className="mt-2 flex gap-3">
          <input
            type="range"
            min={18}
            max={60}
            value={f.minAge}
            onChange={(e) => setF({ ...f, minAge: Math.min(+e.target.value, f.maxAge) })}
            className="flex-1 accent-primary"
            aria-label="Minimum age"
          />
          <input
            type="range"
            min={18}
            max={60}
            value={f.maxAge}
            onChange={(e) => setF({ ...f, maxAge: Math.max(+e.target.value, f.minAge) })}
            className="flex-1 accent-primary"
            aria-label="Maximum age"
          />
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            onClick={() => setF({ distance: 50, minAge: 18, maxAge: 60, sort: "Online" })}
            className="rounded-full border-2 border-primary py-3 font-semibold text-primary"
          >
            Reset filter
          </button>
          <button
            onClick={() => onApply(f)}
            className="rounded-full bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary-pressed"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchScreen({ p, onClose }: { p: Person; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-card p-6 text-center">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute left-5 top-5 grid size-10 place-items-center rounded-full border"
      >
        <ArrowLeft className="size-5" />
      </button>
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold">
          You and <span className="text-primary">{p.name}</span> liked each other!
        </h2>
        <div className="relative mx-auto mt-10 size-72">
          <div className="absolute inset-6 rounded-full bg-primary" />
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30" />
          <img
            src={me.photo}
            alt="You"
            className="absolute left-0 top-4 size-36 rounded-full border-4 border-card object-cover shadow-card"
          />
          <img
            src={p.photo}
            alt={p.name}
            className="absolute bottom-2 right-0 size-36 rounded-full border-4 border-card object-cover shadow-card"
          />
          <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card font-display font-extrabold text-primary shadow-card">
            {p.match}%
          </span>
          <Heart className="absolute right-6 top-2 size-7 fill-accent text-accent" />
        </div>
        <h3 className="mt-8 text-3xl font-extrabold text-primary">It's a Match</h3>
        <p className="mt-2 text-sm text-muted-foreground">Start the chat — say habari!</p>
        <Link
          to="/messages"
          className="mt-6 block rounded-full bg-primary py-4 font-semibold text-primary-foreground hover:bg-primary-pressed"
        >
          Chat now
        </Link>
        <button onClick={onClose} className="mt-3 w-full py-2 font-semibold text-primary">
          Keep swiping
        </button>
      </div>
    </div>
  );
}

function Discover() {
  const [filters, setFilters] = useState<Filters>({
    distance: 50,
    minAge: 18,
    maxAge: 60,
    sort: "Online",
  });
  const [showFilter, setShowFilter] = useState(false);
  const deck = useMemo(() => {
    const list = people
      .filter((p) => p.intent === "Dating")
      .filter(
        (p) =>
          bandKm(p.band) <= filters.distance && p.age >= filters.minAge && p.age <= filters.maxAge,
      );
    return [...list].sort((a, b) =>
      filters.sort === "Online" ? Number(b.online) - Number(a.online) : b.match - a.match,
    );
  }, [filters]);
  const [i, setI] = useState(0);
  const [exit, setExit] = useState<"left" | "right" | null>(null);
  const [match, setMatch] = useState<Person | null>(null);
  const current = deck[i];

  const act = useCallback(
    (dir: "left" | "right") => {
      if (!current || exit) return;
      setExit(dir);
      setTimeout(() => {
        if (dir === "right" && current.match >= 80) setMatch(current);
        setExit(null);
        setI((n) => n + 1);
      }, 280);
    },
    [current, exit],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (showFilter || match) return;
      if (e.key === "ArrowLeft") act("left");
      if (e.key === "ArrowRight" || e.key === "ArrowUp") act("right");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [act, showFilter, match]);

  return (
    <AppShell aside={current && <Details p={current} />}>
      <div className="mx-auto flex max-w-md flex-col px-4 pt-6 lg:pt-10">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <MapPin className="size-3.5 text-primary" />
              Nairobi, Kenya
            </p>
            <h1 className="text-3xl font-extrabold">Discover</h1>
          </div>
          <button
            onClick={() => setShowFilter(true)}
            className="grid size-11 place-items-center rounded-2xl border bg-card shadow-soft"
            aria-label="Filters"
          >
            <SlidersHorizontal className="size-5" />
          </button>
        </header>

        {current ? (
          <div
            className={`relative aspect-[3/4] overflow-hidden rounded-[28px] shadow-card transition duration-300 ${exit === "left" ? "-translate-x-[120%] -rotate-12 opacity-0" : exit === "right" ? "translate-x-[120%] rotate-12 opacity-0" : ""}`}
          >
            <Link to="/u/$id" params={{ id: current.id }}>
              <img
                src={current.photo}
                alt={current.name}
                width={768}
                height={1024}
                className="size-full object-cover"
              />
            </Link>
            <div className="pointer-events-none absolute inset-0 bg-scrim" />
            <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
              {current.match}% Match
            </span>
            {current.online && (
              <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold">
                <span className="size-2 rounded-full bg-success" />
                Online
              </span>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 text-primary-foreground">
              <h2 className="text-3xl font-bold">
                {current.name}, {current.age}
              </h2>
              <p className="mt-1 text-xs uppercase tracking-widest opacity-90">
                {current.area} · {current.band}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 xl:hidden">
                {current.interests.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-card/20 px-3 py-1 text-xs font-semibold backdrop-blur"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid aspect-[3/4] place-items-center rounded-[28px] border-2 border-dashed bg-card p-8 text-center">
            <div>
              <h2 className="text-xl font-bold">
                {deck.length ? "You're all caught up" : "No one matches these filters"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {deck.length
                  ? "New people join every day. Check back soon."
                  : "Try a wider distance or age range."}
              </p>
              <button
                onClick={() => (deck.length ? setI(0) : setShowFilter(true))}
                className="mx-auto mt-5 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-pressed"
              >
                <RotateCcw className="size-4" />
                {deck.length ? "Start over" : "Edit filters"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-5">
          <button
            onClick={() => act("left")}
            aria-label="Pass"
            className="grid size-14 place-items-center rounded-full border bg-card text-destructive shadow-soft transition hover:scale-105"
          >
            <X className="size-6" />
          </button>
          <button
            onClick={() => act("right")}
            aria-label="Like"
            className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-card transition hover:scale-105"
          >
            <Heart className="size-7 fill-current" />
          </button>
          <button
            onClick={() => act("right")}
            aria-label="Super like"
            className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-soft transition hover:scale-105"
          >
            <Star className="size-6 fill-current" />
          </button>
        </div>
      </div>

      {showFilter && (
        <FilterSheet
          value={filters}
          onClose={() => setShowFilter(false)}
          onApply={(f) => {
            setFilters(f);
            setI(0);
            setShowFilter(false);
          }}
        />
      )}
      {match && <MatchScreen p={match} onClose={() => setMatch(null)} />}
    </AppShell>
  );
}
