import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  UserRoundPlus,
  MessageCircle,
  Share2,
  Video,
  Check,
} from "lucide-react";
import { AppShell, Chip } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { getVisibleProfile } from "@/lib/profile/server";
import {
  getFollowStatus,
  sendFriendRequest,
  sendMessageRequest,
  setFollow,
} from "@/lib/social/server";

export const Route = createFileRoute("/u/$id")({
  loader: async ({ params }) => {
    try {
      const result = await getVisibleProfile({ data: { id: params.id } });
      if (!result.ok) throw notFound();
      return result.profile;
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.displayName} · Mingleza` : "Profile · Mingleza";
    const description = loaderData?.bio?.trim() || "Profile on Mingleza";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: Profile,
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold">Profile not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This profile may be unavailable or no longer visible.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Discover
        </Link>
      </div>
    </AppShell>
  ),
});

function Profile() {
  const profile = Route.useLoaderData();
  const [following, setFollowing] = useState(false);
  const [friendRequested, setFriendRequested] = useState(false);
  const [messageRequested, setMessageRequested] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invitationNote, setInvitationNote] = useState("");
  const location = [profile.city, profile.region, profile.countryCode].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  const hasIntent = profile.friendsEnabled || profile.datingEnabled;

  useEffect(() => {
    let active = true;
    void getFollowStatus({ data: { userId: profile.id } })
      .then((result) => {
        if (active && result.ok) setFollowing(result.following);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [profile.id]);

  const follow = async () => {
    setBusy("follow");
    setError("");
    try {
      const result = await setFollow({ data: { userId: profile.id, following: !following } });
      if (!result.ok) setError(result.message);
      else {
        setFollowing(!following);
        setNotice(
          !following
            ? `You are now following ${profile.displayName}.`
            : `You unfollowed ${profile.displayName}.`,
        );
      }
    } catch {
      setError("Follow could not be updated. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const friendRequest = async () => {
    setBusy("friend");
    setError("");
    try {
      const result = await sendFriendRequest({ data: { userId: profile.id } });
      if (!result.ok) setError(result.message);
      else {
        setFriendRequested(true);
        setNotice("Friend request sent.");
      }
    } catch {
      setError("Friend request could not be sent.");
    } finally {
      setBusy("");
    }
  };

  const messageRequest = async (kind: "message" | "video") => {
    setBusy(kind);
    setError("");
    try {
      const note =
        kind === "video"
          ? `Video chat invitation (not a live call): ${invitationNote.trim() || "Would you like to arrange a video chat?"}`
          : invitationNote.trim();
      const result = await sendMessageRequest({ data: { userId: profile.id, note } });
      if (!result.ok) setError(result.message);
      else {
        setMessageRequested(true);
        setNotice(
          kind === "video"
            ? "Video chat invitation sent. They must accept before messaging; live calling is not available yet."
            : "Message request sent. They must accept before chat opens.",
        );
        setInvitationNote("");
      }
    } catch {
      setError("Request could not be sent. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const shareProfile = async () => {
    const url = `${window.location.origin}/u/${encodeURIComponent(profile.id)}`;
    try {
      if (navigator.share)
        await navigator.share({ title: `${profile.displayName} on Mingleza`, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Profile link copied.");
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setNotice("Profile link copied.");
      } catch {
        setError("Could not share this link. Copy the page URL from your browser.");
      }
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to Discover
        </Link>
        <section className="rounded-3xl border bg-card p-5 shadow-soft sm:p-8">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
            <Avatar
              name={profile.displayName}
              avatarPath={profile.avatarPath}
              className="size-28 bg-secondary text-3xl shadow-soft"
            />
            <div className="mt-4 sm:ml-6 sm:mt-2">
              <h1 className="text-3xl font-extrabold">{profile.displayName}</h1>
              {location.length > 0 && (
                <p className="mt-2 flex items-center justify-center gap-1 text-sm text-muted-foreground sm:justify-start">
                  <MapPin className="size-4" />
                  {location.join(", ")}
                </p>
              )}
            </div>
          </div>

          {hasIntent && (
            <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
              {profile.friendsEnabled && <Chip active>Friends</Chip>}
              {profile.datingEnabled && <Chip active>Dating</Chip>}
            </div>
          )}

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void follow()}
              disabled={busy === "follow"}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {following ? <Check className="size-4" /> : <UserRoundPlus className="size-4" />}
              {following ? "Following" : "Follow"}
            </button>
            <button
              type="button"
              onClick={() => void friendRequest()}
              disabled={friendRequested || busy === "friend"}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <UserRoundPlus className="size-4" />
              {friendRequested
                ? "Friend request sent"
                : busy === "friend"
                  ? "Sending…"
                  : "Add friend"}
            </button>
            <button
              type="button"
              onClick={() => void shareProfile()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold"
            >
              <Share2 className="size-4" />
              Share profile
            </button>
          </div>
          <div className="mt-6 rounded-2xl bg-secondary/60 p-4">
            <label htmlFor="contact-request-note" className="text-sm font-semibold">
              A short note (optional)
            </label>
            <textarea
              id="contact-request-note"
              value={invitationNote}
              onChange={(event) => setInvitationNote(event.target.value)}
              maxLength={500}
              rows={2}
              className="mt-2 w-full rounded-xl border bg-background p-3 text-sm"
              placeholder="Introduce yourself…"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void messageRequest("message")}
                disabled={messageRequested || busy === "message"}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                <MessageCircle className="size-4" />
                {messageRequested ? "Request pending" : "Request to chat"}
              </button>
              <button
                type="button"
                onClick={() => void messageRequest("video")}
                disabled={messageRequested || busy === "video"}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                <Video className="size-4" />
                Request video chat
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Chat opens only if they accept. Video chat is an invitation only; live calling is not
              available yet.
            </p>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive-text"
            >
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-4 rounded-xl bg-primary/10 p-3 text-sm">
              {notice}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Phone number and registration details are private and are not shared on your profile.
          </p>

          {profile.bio?.trim() && (
            <div className="mt-7 border-t pt-6">
              <h2 className="text-sm font-bold">About</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
