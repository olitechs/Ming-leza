import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { SwipeCard } from "@/components/discover/SwipeCard";
import { ForYouNearbyTabs } from "@/components/discover/ForYouNearbyTabs";
import { ProfileActions } from "@/components/discover/ProfileActions";
import { ViewProfileSheet } from "@/components/discover/ViewProfileSheet";

import { useEffect, useState } from "react";
import { AlertCircle, Heart, MapPin, RotateCcw, Users, UserPlus } from "lucide-react";
import { Chip } from "@/components/AppShell";
import { SafetyActions } from "@/components/SafetyActions";
import { Avatar } from "@/components/Avatar";
import { Button, Card, EmptyState, ErrorBanner, PageHeader } from "@/components/brand";
import { getMyAccess } from "@/lib/auth/server";
import { getDiscoverableProfiles, getNearbyProfiles } from "@/lib/discovery/server";
import { getMyProfile } from "@/lib/profile/server";
import { sendFriendRequest, submitProfileSwipe } from "@/lib/social/server";
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
  const navigate = useNavigate();
  const [intent, setIntent] = useState<Intent | null>(() =>
    loadedProfile ? (loadedProfile.friends_enabled ? "friends" : "dating") : null,
  );
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadReason, setLoadReason] = useState<"city_required" | "age_verification_required" | "temporarily_unavailable" | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [requestingId, setRequestingId] = useState("");
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [requestError, setRequestError] = useState("");
  const [requestNotice, setRequestNotice] = useState("");
  const [actedOnIds, setActedOnIds] = useState<string[]>([]);
  const [feed, setFeed] = useState<"for-you" | "nearby">("for-you");
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewProfile, setViewProfile] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(false);
      setLoadReason(null);
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
        const result = feed === "nearby" ? await getNearbyProfiles({ data: { intent, limit: 30 } }) : await getDiscoverableProfiles({ data: { intent, limit: 30 } });
        if (!active) return;
        if (result.ok) {
          setProfiles(result.profiles);
          setActedOnIds([]);
          setActiveIndex(0);
        } else {
          setProfiles([]);
          setLoadReason(result.reason === "city_required" || result.reason === "age_verification_required" ? result.reason : "temporarily_unavailable");
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
  }, [intent, refresh, feed]);

  const requestFriendship = async (profile: Profile): Promise<boolean> => {
    setRequestingId(profile.id);
    setRequestError("");
    try {
      const result = await sendFriendRequest({ data: { userId: profile.id } });
      if (!result.ok) {
        setRequestError(result.message);
        return false;
      }
      setRequestedIds((current) =>
        current.includes(profile.id) ? current : [...current, profile.id],
      );
      return true;
    } catch {
      setRequestError("We could not send the friend request. Please try again.");
      return false;
    } finally {
      setRequestingId("");
    }
  };

  const demo = [
    {
      id: "demo-amina",
      displayName: "Amina",
      age: 26,
      city: "Mombasa, Kenya",
      bio: "Beach walks, Swahili food, and discovering new cafés. Here for kind conversations and genuine connection.",
      photo:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
    },
    {
      id: "demo-zuri",
      displayName: "Zuri",
      age: 25,
      city: "Watamu, Kenya",
      bio: "Ocean sunsets, books, and slow mornings. Looking to make new friends and share local adventures.",
      photo:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85",
    },
    {
      id: "demo-njeri",
      displayName: "Njeri",
      age: 27,
      city: "Nairobi, Kenya",
      bio: "Good music, spontaneous road trips and conversations that go past midnight.",
      photo:
        "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85",
    },
  ];
  const shown = feed === "nearby" ? profiles
    .filter((p) => !actedOnIds.includes(p.id))
    .map((p) => ({ id: p.id, name: p.displayName, age: undefined, city: [p.city, p.region, p.countryCode].filter(Boolean).join(", ") || "Kenya", bio: p.bio || "Here to meet kind people and build genuine connections.", photo: p.avatarPath || "", source: p }))
    : profiles.length
    ? profiles
        .filter((p) => !actedOnIds.includes(p.id))
        .map((p, i) => ({
          id: p.id,
          name: p.displayName,
          age: undefined,
          city: [p.city, p.region, p.countryCode].filter(Boolean).join(", ") || "Kenya",
          bio: p.bio || "Here to meet kind people and build genuine connections.",
          photo: p.avatarPath || "",
          source: p,
        }))
    : demo.map((p) => ({ ...p, name: p.displayName, source: null }));
  const current = shown.length ? shown[activeIndex % shown.length] : null;
  const advance = () => {
    setViewProfile(false);
    setActiveIndex((index) => (index + 1) % Math.max(shown.length, 1));
  };
  const decideCurrent = async (decision: "like" | "pass") => {
    if (!current) return;
    setRequestError("");
    setRequestNotice("");
    if (!current.source) {
      setRequestError(
        "These are preview profiles. Real choices are only saved for available member profiles.",
      );
      advance();
      return;
    }
    if (intent === "dating") {
      setRequestingId(current.source.id);
      try {
        const result = await submitProfileSwipe({
          data: { userId: current.source.id, decision },
        });
        if (!result.ok) {
          setRequestError(result.message);
          return;
        }
        if (result.matchId) {
          setRequestNotice("It’s a match! Open Dating matches to see your connection.");
        }
        setActedOnIds((currentIds) =>
          currentIds.includes(current.source!.id)
            ? currentIds
            : [...currentIds, current.source!.id],
        );
        setViewProfile(false);
      } catch {
        setRequestError("Your choice could not be saved. Please try again.");
      } finally {
        setRequestingId("");
      }
      return;
    }
    if (decision === "like") {
      const sent = await requestFriendship(current.source);
      if (sent) {
        setActedOnIds((currentIds) =>
          currentIds.includes(current.source!.id)
            ? currentIds
            : [...currentIds, current.source!.id],
        );
        setViewProfile(false);
      }
      return;
    }
    setActedOnIds((currentIds) =>
      currentIds.includes(current.source.id) ? currentIds : [...currentIds, current.source.id],
    );
    setViewProfile(false);
  };

  return (
    <main className="min-h-dvh bg-background pb-28 text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <TopBar />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Made for your next hello
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Discover
            </h1>
          </div>
          <div className="flex gap-2">
            {intentButton("dating", "Dating")}
            {intentButton("friends", "Friends")}
          </div>
        </div>
        <div className="mt-5">
          <ForYouNearbyTabs value={feed} onChange={setFeed} />
        </div>
        {requestError && (
          <p role="alert" className="mt-4 rounded-xl bg-accent p-3 text-sm text-accent-foreground">
            {requestError}
          </p>
        )}
        {requestNotice && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200"
          >
            {requestNotice}
          </p>
        )}
        {feed === "nearby" && !loading && !error && !profiles.length ? (
          <div className="mx-auto mt-8 max-w-md rounded-3xl border bg-card p-8 text-center">
            <MapPin className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 font-bold">No nearby profiles yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Nearby shows eligible members who share your city. Your exact location is never requested or shown. Try For You to discover members from other places.</p>
          </div>
        ) : loading ? (
          <div
            className="mx-auto mt-6 h-[min(60dvh,650px)] min-h-[390px] max-w-md animate-pulse rounded-[2rem] bg-card"
            aria-label="Loading profiles"
          />
        ) : error ? (
          <div
            role="alert"
            className="mx-auto mt-8 max-w-md rounded-3xl border border-border bg-card p-8 text-center"
          >
            <AlertCircle className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 font-bold">{loadReason === "city_required" ? "Add your city to use Nearby" : loadReason === "age_verification_required" ? "Adult verification required" : "Profiles couldn't load"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {loadReason === "city_required" ? "Nearby compares city names only. Add a city in your profile settings, then return to discover eligible members in the same city." : loadReason === "age_verification_required" ? "Complete adult verification to discover member profiles. Your existing profile data is unchanged." : "Your account and profile settings are unchanged. Please try again."}
            </p>
            {loadReason === "city_required" && <Button type="button" variant="outline" className="mt-3 rounded-full" onClick={() => void navigate({ to: "/profile-edit" })}>Update profile city</Button>}
            <Button className="mt-5 rounded-full" onClick={() => setRefresh((value) => value + 1)}>
              <RotateCcw className="size-4" /> Try again
            </Button>
          </div>
        ) : current ? (
          <div className="mx-auto mt-5 max-w-md">
            <SwipeCard
              profile={{
                id: current.id,
                name: current.name,
                age: current.age,
                city: current.city,
                bio: current.bio,
                photo: current.photo,
                preview: !profiles.length,
              }}
              onView={() => setViewProfile((value) => !value)}
              onSwipe={(direction) => {
                void decideCurrent(direction === "right" ? "like" : "pass");
              }}
            />
            <ViewProfileSheet
              profile={{
                id: current.id,
                name: current.name,
                age: current.age,
                city: current.city,
                bio: current.bio,
                photo: current.photo,
                preview: !profiles.length,
              }}
              open={viewProfile}
              onOpenChange={setViewProfile}
            />
            <div className="mt-5">
              <ProfileActions
                onPass={() => void decideCurrent("pass")}
                onLike={() => void decideCurrent("like")}
                onMessage={() => {
                  if (intent === "friends") {
                    void navigate({ to: "/messages" });
                  } else {
                    void navigate({ to: "/matches" });
                  }
                }}
                passLabel={intent === "friends" ? "Skip profile" : "Pass profile"}
                likeLabel={intent === "friends" ? "Send friend request" : "Like profile"}
                disabled={Boolean(
                  current.source &&
                  (requestingId === current.source.id || requestedIds.includes(current.source.id)),
                )}
              />
            </div>
            {current.source && requestedIds.includes(current.source.id) && (
              <p className="mt-3 text-center text-xs text-emerald-400">Friend request sent</p>
            )}
            {!profiles.length && (
              <p className="mt-4 text-center text-[11px] text-muted-foreground">
                Fictional preview only · no real member choices are saved
              </p>
            )}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-border bg-card p-10 text-center">
            <Users className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 font-bold">No profiles just yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try another discovery preference.</p>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );

  function intentButton(value: Intent, label: string) {
    return (
      <Button
        type="button"
        onClick={() => setIntent(value)}
        aria-pressed={intent === value}
        className={`rounded-full px-3 text-xs sm:px-4 sm:text-sm ${intent === value ? "bg-primary text-primary-foreground hover:brightness-95" : "border border-border bg-secondary text-secondary-foreground hover:bg-muted"}`}
      >
        {value === "dating" ? <Heart className="size-4" /> : <Users className="size-4" />}
        {label}
      </Button>
    );
  }
}
