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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    photo:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=640&q=80",
  },
  {
    name: "Luca",
    age: 29,
    city: "Nairobi, Kenya",
    bio: "Music lover, weekend hiker, and enthusiastic home cook. I enjoy meeting people with curious minds.",
    intents: ["Friends", "Dating"],
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=640&q=80",
  },
  {
    name: "Zuri",
    age: 25,
    city: "Watamu, Kenya",
    bio: "Ocean sunsets, books, and slow mornings. Looking to make new friends and share local adventures.",
    intents: ["Friends"],
    photo:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=640&q=80",
  },
  {
    name: "Daniel",
    age: 31,
    city: "Malindi, Kenya",
    bio: "Nature, photography, and road trips up the coast. Always happy to talk about a great place to eat.",
    intents: ["Friends", "Dating"],
    photo:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=640&q=80",
  },
] as const;

function DemoProfiles() {
  type DemoStage = "preview" | "requested" | "accepted";
  const [selected, setSelected] = useState<(typeof demoProfiles)[number] | null>(null);
  const [stages, setStages] = useState<Record<string, DemoStage>>({});
  const [messages, setMessages] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState("");

  const stage = selected ? (stages[selected.name] ?? "preview") : "preview";
  const conversation = selected ? (messages[selected.name] ?? []) : [];

  const simulateRequest = () => {
    if (!selected) return;
    setStages((current) => ({ ...current, [selected.name]: "requested" }));
  };

  const simulateAcceptance = () => {
    if (!selected) return;
    setStages((current) => ({ ...current, [selected.name]: "accepted" }));
  };

  const sendDemoMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || stage !== "accepted") return;
    const body = draft.trim();
    if (!body) return;
    setMessages((current) => ({
      ...current,
      [selected.name]: [
        ...(current[selected.name] ?? []),
        `You: ${body}`,
        `${selected.name}: Thanks for saying hello! This is a scripted demo reply.`,
      ],
    }));
    setDraft("");
  };

  const resetDemo = () => {
    if (!selected) return;
    setStages((current) => {
      const next = { ...current };
      delete next[selected.name];
      return next;
    });
    setMessages((current) => {
      const next = { ...current };
      delete next[selected.name];
      return next;
    });
    setDraft("");
  };

  return (
    <section aria-labelledby="demo-profiles-title" className="mb-8">
      <div className="mb-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
          Get to know Mingleza
        </p>
        <h2 id="demo-profiles-title" className="mt-2 text-2xl font-extrabold tracking-tight">
          Try the experience
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Explore fictional example profiles and walk through a friend request and sample
          conversation. Demo actions stay in this page session; no real member is contacted and
          nothing is saved to your account.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {demoProfiles.map((person) => (
          <article
            key={person.name}
            className="overflow-hidden rounded-3xl border bg-card shadow-soft"
          >
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
              <h3 className="text-lg font-extrabold">
                {person.name}, {person.age}
              </h3>
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
              <Button
                type="button"
                className="mt-4 w-full rounded-full"
                onClick={() => {
                  setSelected(person);
                  setDraft("");
                }}
              >
                {stages[person.name] === "accepted"
                  ? "Continue demo"
                  : stages[person.name] === "requested"
                    ? "Continue request"
                    : "Try this profile"}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setDraft("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Try a profile: {selected.name}</DialogTitle>
                <DialogDescription>
                  Interactive walkthrough with fictional data. No real request or message is sent.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-2xl border bg-secondary/40 p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selected.photo}
                    alt=""
                    className="size-20 shrink-0 rounded-2xl object-cover"
                  />
                  <div>
                    <p className="font-bold">
                      {selected.name}, {selected.age}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin aria-hidden="true" className="size-4" />
                      {selected.city}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selected.intents.map((value) => (
                        <Chip key={value}>{value}</Chip>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6">{selected.bio}</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-extrabold">How the workflow works</p>
                <ol className="grid gap-2 text-sm sm:grid-cols-3">
                  <li
                    className={`rounded-xl border p-3 ${stage !== "preview" ? "border-primary bg-primary/5" : "bg-card"}`}
                  >
                    <span className="font-bold">1. Profile</span>
                    <p className="mt-1 text-muted-foreground">Review their details and intent.</p>
                  </li>
                  <li
                    className={`rounded-xl border p-3 ${stage === "requested" || stage === "accepted" ? "border-primary bg-primary/5" : "bg-card"}`}
                  >
                    <span className="font-bold">2. Friend request</span>
                    <p className="mt-1 text-muted-foreground">
                      {stage === "preview"
                        ? "Send a sample request."
                        : stage === "requested"
                          ? "Request sent in the demo."
                          : "Demo request accepted."}
                    </p>
                  </li>
                  <li
                    className={`rounded-xl border p-3 ${stage === "accepted" ? "border-primary bg-primary/5" : "bg-card"}`}
                  >
                    <span className="font-bold">3. Messaging</span>
                    <p className="mt-1 text-muted-foreground">
                      Unlock the sample chat after acceptance.
                    </p>
                  </li>
                </ol>
              </div>

              {stage === "preview" && (
                <Button type="button" className="w-full rounded-full" onClick={simulateRequest}>
                  <UserPlus aria-hidden="true" className="size-4" />
                  Simulate sending friend request
                </Button>
              )}

              {stage === "requested" && (
                <div className="space-y-3 rounded-2xl border border-primary/30 p-4">
                  <p className="text-sm font-semibold">Request sent — demo only</p>
                  <p className="text-sm text-muted-foreground">
                    In the real app, the other member would need to accept before messaging is
                    available. Simulate that acceptance to continue testing.
                  </p>
                  <Button
                    type="button"
                    className="w-full rounded-full"
                    onClick={simulateAcceptance}
                  >
                    Simulate acceptance
                  </Button>
                </div>
              )}

              {stage === "accepted" && (
                <div className="space-y-3 rounded-2xl border p-4">
                  <div>
                    <p className="font-bold">Demo conversation</p>
                    <p className="text-xs text-muted-foreground">
                      Scripted responses only. This is not the real messaging inbox.
                    </p>
                  </div>
                  <div
                    aria-live="polite"
                    className="max-h-48 space-y-2 overflow-y-auto rounded-xl bg-secondary/50 p-3"
                  >
                    {conversation.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No messages yet. Send a hello to try the composer.
                      </p>
                    ) : (
                      conversation.map((message, index) => (
                        <p
                          key={`${selected.name}-${index}`}
                          className="rounded-lg bg-card p-2 text-sm"
                        >
                          {message}
                        </p>
                      ))
                    )}
                  </div>
                  <form onSubmit={sendDemoMessage} className="flex gap-2">
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      aria-label="Demo message"
                      placeholder="Write a sample message…"
                      maxLength={500}
                      className="min-h-11 min-w-0 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button type="submit" disabled={!draft.trim()} className="rounded-full px-4">
                      Send
                    </Button>
                  </form>
                </div>
              )}

              <div className="flex flex-wrap justify-between gap-2 border-t pt-3">
                <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                  Demo only: no Supabase writes, real friend requests, or real messages.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={resetDemo}
                >
                  Reset demo
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
