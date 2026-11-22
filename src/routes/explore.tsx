import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowRight, Compass, MapPin, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyAccess } from "@/lib/auth/server";
import { getLiveCityPresence, getMyOnlinePresencePreferences } from "@/lib/profile/server";

const LiveCityMap = lazy(() =>
  import("@/components/LiveCityMap").then((module) => ({ default: module.LiveCityMap })),
);

export const Route = createFileRoute("/explore")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/login", search: { mode: "signin" } });
  },
  head: () => ({
    meta: [
      { title: "Explore · Mingleza" },
      {
        name: "description",
        content: "Discover people through privacy-conscious, city-based discovery on Mingleza.",
      },
    ],
  }),
  component: Explore,
});

function Explore() {
  const [mapOptedIn, setMapOptedIn] = useState<boolean | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");
  const [clusters, setClusters] = useState<
    { city: string; region: string | null; country_code: string; online_count: number }[]
  >([]);

  useEffect(() => {
    let active = true;
    void getMyOnlinePresencePreferences()
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setMapError(result.message);
          setMapOptedIn(false);
          setMapLoading(false);
          return;
        }
        setMapOptedIn(
          result.preferences?.showOnlineStatus === true &&
            result.preferences?.mapDiscoveryEnabled === true,
        );
      })
      .catch(() => {
        if (active) {
          setMapError("Map privacy settings could not be checked.");
          setMapOptedIn(false);
          setMapLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapOptedIn) {
      if (mapOptedIn === false) setMapLoading(false);
      return;
    }
    let active = true;
    let timer = 0;
    const loadClusters = async () => {
      if (document.visibilityState === "visible") {
        const result = await getLiveCityPresence().catch(() => null);
        if (!active) return;
        if (result?.ok) {
          setClusters(result.clusters);
          setMapError("");
        } else {
          setMapError(result?.message ?? "Live city clusters could not be loaded.");
        }
        setMapLoading(false);
      }
      if (active) timer = window.setTimeout(() => void loadClusters(), 30_000);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        void loadClusters();
      }
    };
    setMapLoading(true);
    void loadClusters();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [mapOptedIn]);

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
            Your world, your pace
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Explore</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Find people open to friendship or dating, starting with the places and preferences you
            choose to share. You stay in control of what appears on your profile.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border bg-card p-6 shadow-soft sm:p-7">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Users aria-hidden="true" className="size-6" />
            </span>
            <h2 className="mt-4 text-xl font-bold">Meet people in your city</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Nearby discovery compares the city on your profile with other eligible members’
              cities. It does not need your GPS coordinates or live location.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Open Discover <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </article>

          <article className="rounded-3xl border bg-card p-6 shadow-soft sm:p-7">
            <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
              <MapPin aria-hidden="true" className="size-6" />
            </span>
            <h2 className="mt-4 text-xl font-bold">Choose the place you share</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Keep your city current to make same-city discovery useful. You can update it in your
              profile settings; no street address or exact coordinates are required.
            </p>
            <Link
              to="/profile-edit"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border bg-background px-5 text-sm font-bold text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Edit profile <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </article>
        </div>

        <section
          className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-7"
          aria-labelledby="city-map-title"
        >
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MapPin aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
                Live · city level
              </p>
              <h2 id="city-map-title" className="mt-1 text-xl font-bold">
                Online city mini-map
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This privacy-first map shows city-centre markers for anonymous clusters, never
                individual people. A city appears only when at least three eligible adults opt in.
                Markers use published city-centre coordinates and never request GPS.
              </p>
            </div>
          </div>

          {mapLoading ? (
            <p className="mt-5 text-sm text-muted-foreground">Loading city clusters…</p>
          ) : !mapOptedIn ? (
            <div className="mt-5 rounded-2xl border border-dashed p-4">
              <p className="text-sm font-semibold">The city mini-map is off for your account.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Turn on online status and city-map sharing in your privacy settings to see and join
                anonymous city clusters.
              </p>
              <Link
                to="/profile-edit"
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
              >
                Choose map privacy settings <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          ) : mapError ? (
            <p role="status" className="mt-5 text-sm text-destructive-text">
              {mapError}
            </p>
          ) : clusters.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-secondary/40 p-4 text-sm text-muted-foreground">
              No city currently has enough opted-in members to show a cluster.
            </p>
          ) : (
            <>
              <Suspense
                fallback={
                  <p role="status" className="mt-5 text-sm text-muted-foreground">
                    Loading interactive map…
                  </p>
                }
              >
                <LiveCityMap clusters={clusters} />
              </Suspense>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clusters.map((cluster) => (
                  <article
                    key={`${cluster.country_code}:${cluster.region ?? ""}:${cluster.city}`}
                    className="flex min-h-20 items-center gap-3 rounded-2xl border bg-secondary/30 p-4"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
                    >
                      <Users className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{cluster.city}</h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {[cluster.region, cluster.country_code].filter(Boolean).join(", ")}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-primary">
                        {cluster.online_count}+ members online
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <div className="mt-6 rounded-3xl border bg-secondary/40 p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-primary">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold">Discovery with privacy in mind</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li className="flex gap-2">
                  <Compass aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" /> Use
                  For You for broader discovery, or Nearby for members with the same city listed.
                </li>
                <li className="flex gap-2">
                  <ShieldCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />{" "}
                  Discovery is limited to eligible adult-verified members and respects visibility
                  preferences and blocks.
                </li>
                <li className="flex gap-2">
                  <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" /> Map
                  points show city centres only—never member pins, GPS tracking, or exact locations.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
