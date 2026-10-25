import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Heart, MapPin, RotateCcw, Users, UserPlus } from "lucide-react";
import { AppShell, Chip } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Button, Card, EmptyState, ErrorBanner, PageHeader } from "@/components/brand";
import { getMyAccess } from "@/lib/auth/server";
import { getDiscoverableProfiles } from "@/lib/discovery/server";
import { getMyProfile } from "@/lib/profile/server";
import { sendFriendRequest } from "@/lib/social/server";
import { PublicHomepage } from "@/components/PublicHomepage";
import { getHomePageMode } from "@/lib/homepage-routing";
import { getHomeHead, getPublicSiteUrl } from "@/lib/seo";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    const page = getHomePageMode(access);
    if (page === "marketing") return { page, profile: null };
    if (page === "onboarding")
      throw redirect({ to: "/welcome", search: { authComplete: false, authError: "" } });
    let profile;
    try {
      profile = await getMyProfile();
    } catch {
      return { page: "discover" as const, profile: null };
    }
    if (profile.ok) {
      const displayName = profile.profile.display_name?.trim() ?? "";
      const city = profile.profile.city?.trim() ?? "";
      if (!displayName || displayName.toLowerCase() === "new member" || !city) {
        throw redirect({
          to: "/welcome",
          search: { authComplete: true, authError: "", mode: "profile" },
        });
      }
      return { page: "discover" as const, profile: profile.profile };
    }
    return { page: "discover" as const, profile: null };
  },
  loader: async ({ context }) => ({ page: context.page, siteUrl: await getPublicSiteUrl() }),
  head: ({ loaderData }) =>
    loaderData ? getHomeHead(loaderData.page, loaderData.siteUrl) : getHomeHead("marketing", null),
  component: HomeRoute,
});

function HomeRoute() {
  const { page } = Route.useRouteContext();
  return page === "marketing" ? <PublicHomepage /> : <Discover />;
}

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


const demoProfiles = [
  {
    name: "Amina",
    age: 26,
    city: "Mombasa, Kenya",
    bio: "Beach walks, Swahili food, and discovering new cafés. Here for kind conversations and genuine friendship.",
    intents: ["Friends", "Dating"],
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=640&q=80",
  },
  {
    name: "Luca",
    age: 29,
    city: "Nairobi, Kenya",
    bio: "Music lover, weekend hiker, and enthusiastic home cook. I enjoy meeting people with curious minds.",
    intents: ["Friends", "Dating"],
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=640&q=80",
  },
  {
    name: "Zuri",
    age: 25,
    city: "Watamu, Kenya",
    bio: "Ocean sunsets, books, and slow mornings. Looking to make new friends and share local adventures.",
    intents: ["Friends"],
    photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=640&q=80",
  },
  {
    name: "Daniel",
    age: 31,
    city: "Malindi, Kenya",
    bio: "Nature, photography, and road trips up the coast. Always happy to talk about a great place to eat.",
    intents: ["Friends", "Dating"],
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=640&q=80",
  },
] as const;

function DemoProfiles() {
  return (
    <section aria-labelledby="demo-profiles-title" className="mb-8">
      <div className="mb-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
          Get to know Mingleza
        </p>
        <h2 id="demo-profiles-title" className="mt-2 text-2xl font-extrabold tracking-tight">
          Example profiles
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          These fictional demo profiles help you preview the experience. They are examples, not real
          members, and cannot receive friend requests or messages. Real members appear below when
          they finish setup and choose to be discoverable.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {demoProfiles.map((person) => (
          <article key={person.name} className="overflow-hidden rounded-3xl border bg-card shadow-soft">
            <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
              <img
                src={person.photo}
                alt={`Illustrative portrait for fictional demo profile ${person.name}`}
                loading="lazy"
                className="size-full object-cover"
              />
              <span className="absolute left-3 top-3 rounded-full border bg-card/95 px-3 py-1.5 text-xs font-extrabold text-foreground">
                Fictional demo
              </span>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-extrabold">{person.name}, {person.age}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin aria-hidden="true" className="size-4 shrink-0" />
                {person.city}
              </p>
              <p className="mt-3 min-h-20 text-sm leading-6 text-muted-foreground">{person.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {person.intents.map((value) => (
                  <Chip key={value}>{value}</Chip>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Discover() {
  const { profile: loadedProfile } = Route.useRouteContext();
  const [intent, setIntent] = useState<Intent | null>(() =>
    loadedProfile ? (loadedProfile.friends_enabled ? "friends" : "dating") : null,
  );
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [requestingId, setRequestingId] = useState("");
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        if (!intent) {
          const profile = await getMyProfile();
          if (!active) return;
          if (!profile.ok) {
            setProfiles([]);
            setError(true);
            return;
          }
          setIntent(profile.profile.friends_enabled ? "friends" : "dating");
          return;
        }
        const result = await getDiscoverableProfiles({ data: { intent, limit: 30 } });
        if (!active) return;
        if (result.ok) setProfiles(result.profiles);
        else {
          setProfiles([]);
          setError(result.reason !== "unauthenticated");
        }
      } catch {
        if (active) {
          setProfiles([]);
          setError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
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
    <Button
      type="button"
      onClick={() => setIntent(value)}
      aria-pressed={intent === value}
      className={`rounded-full px-4 text-sm ${intent === value ? "bg-primary text-primary-foreground" : "border bg-card"}`}
    >
      {value === "dating" ? <Heart className="size-4" /> : <Users className="size-4" />}
      {label}
    </Button>
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-10">
        <PageHeader
          className="mb-6"
          eyebrow={
            <span className="flex items-center gap-1">
              <MapPin aria-hidden="true" className="size-3.5 text-primary" /> Kenya and beyond
            </span>
          }
          title="Discover"
          description="Profiles follow each member's discovery settings."
          actions={
            <>
              {intentButton("dating", "Dating")}
              {intentButton("friends", "Friends")}
            </>
          }
        />

        <DemoProfiles />

        {requestError && <ErrorBanner className="mb-4">{requestError}</ErrorBanner>}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading profiles">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-10 text-center">
            <AlertCircle aria-hidden="true" className="mx-auto size-8 text-destructive-text" />
            <h2 className="mt-3 text-xl font-bold">We couldn&apos;t load profiles</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
            <Button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
              className="mt-5 rounded-full px-5"
            >
              <RotateCcw aria-hidden="true" className="size-4" /> Try again
            </Button>
          </Card>
        ) : profiles.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No profiles to show yet"
            description="Members appear when they are age-verified, discoverable, and have enabled this mode."
            action={
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefresh((value) => value + 1)}
                className="rounded-full px-5"
              >
                <RotateCcw aria-hidden="true" className="size-4" /> Refresh
              </Button>
            }
          />
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
                    <Avatar
                      name={profile.displayName}
                      avatarPath={profile.avatarPath}
                      className="size-24 bg-card text-3xl font-extrabold shadow-soft"
                    />
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
