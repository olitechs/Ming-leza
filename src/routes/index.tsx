import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Heart, MapPin, RotateCcw, Users, UserPlus } from "lucide-react";
import { AppShell, Chip } from "@/components/AppShell";
import { getMyAccess } from "@/lib/auth/server";
import { getDiscoverableProfiles } from "@/lib/discovery/server";
import { sendFriendRequest } from "@/lib/social/server";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/welcome", search: { authComplete: false } });
  },
  head: () => ({
    meta: [
      { title: "Discover · Mingleza" },
      { name: "description", content: "Discover real, age-verified people on Mingleza." },
    ],
  }),
  component: Discover,
});

type Intent = "dating" | "friends";
type Profile = {
  id: string;
  displayName: string;
  bio: string | null;
  avatarPath: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  friendsEnabled: boolean;
  datingEnabled: boolean;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Discover() {
  const [intent, setIntent] = useState<Intent>("dating");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [requestingId, setRequestingId] = useState("");
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getDiscoverableProfiles({ data: { intent, limit: 30 } })
      .then((result) => {
        if (!active) return;
        if (result.ok) setProfiles(result.profiles);
        else {
          setProfiles([]);
          setError(result.reason !== "unauthenticated");
        }
      })
      .catch(() => {
        if (active) {
          setProfiles([]);
          setError(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [intent, refresh]);

  const requestFriendship = async (profile: Profile) => {
    setRequestingId(profile.id);
    setRequestError("");
    try {
      const result = await sendFriendRequest({ data: { userId: profile.id } });
      if (!result.ok) {
        setRequestError(result.message);
        return;
      }
      setRequestedIds((current) =>
        current.includes(profile.id) ? current : [...current, profile.id],
      );
    } catch {
      setRequestError("We could not send the friend request. Please try again.");
    } finally {
      setRequestingId("");
    }
  };

  const intentButton = (value: Intent, label: string) => (
    <button
      onClick={() => setIntent(value)}
      aria-pressed={intent === value}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${intent === value ? "bg-primary text-primary-foreground" : "border bg-card"}`}
    >
      {value === "dating" ? <Heart className="size-4" /> : <Users className="size-4" />}
      {label}
    </button>
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <MapPin className="size-3.5 text-primary" /> Kenya and beyond
            </p>
            <h1 className="text-3xl font-extrabold">Discover</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Profiles follow each member&apos;s discovery settings.
            </p>
          </div>
          <div className="flex gap-2">
            {intentButton("dating", "Dating")}
            {intentButton("friends", "Friends")}
          </div>
        </header>

        {requestError && (
          <p
            role="alert"
            className="mb-4 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {requestError}
          </p>
        )}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading profiles">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border bg-card p-10 text-center">
            <AlertCircle className="mx-auto size-8 text-destructive" />
            <h2 className="mt-3 text-xl font-bold">We couldn&apos;t load profiles</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
            <button
              onClick={() => setRefresh((value) => value + 1)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              <RotateCcw className="size-4" />
              Try again
            </button>
          </div>
        ) : profiles.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed bg-card p-10 text-center">
            <Users className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 text-xl font-bold">No profiles to show yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Members appear when they are age-verified, discoverable, and have enabled this mode.
            </p>
            <button
              onClick={() => setRefresh((value) => value + 1)}
              className="mt-5 inline-flex items-center gap-2 rounded-full border px-5 py-3 font-semibold"
            >
              <RotateCcw className="size-4" />
              Refresh
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => {
              const place = [profile.city, profile.region, profile.countryCode]
                .filter(Boolean)
                .join(", ");
              const requested = requestedIds.includes(profile.id);
              return (
                <article
                  key={profile.id}
                  className="overflow-hidden rounded-3xl border bg-card shadow-soft"
                >
                  <div className="grid aspect-[4/3] place-items-center bg-secondary text-primary">
                    <div className="grid size-24 place-items-center rounded-full bg-card text-3xl font-extrabold shadow-soft">
                      {initials(profile.displayName)}
                    </div>
                  </div>
                  <div className="p-5">
                    <h2 className="text-xl font-bold">{profile.displayName}</h2>
                    {place && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="size-4" />
                        {place}
                      </p>
                    )}
                    <p className="mt-3 min-h-10 text-sm leading-relaxed text-muted-foreground">
                      {profile.bio || "This member has not added a bio yet."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.friendsEnabled && <Chip>Friends</Chip>}
                      {profile.datingEnabled && <Chip>Dating</Chip>}
                    </div>
                    <button
                      disabled={requested || requestingId === profile.id}
                      onClick={() => void requestFriendship(profile)}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <UserPlus className="size-4" />
                      {requested
                        ? "Request sent"
                        : requestingId === profile.id
                          ? "Sending…"
                          : "Add friend"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
