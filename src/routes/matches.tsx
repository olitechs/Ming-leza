import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, MessageCircle, UserRound, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar, AvatarFallback, Button, PageHeader } from "@/components/brand";
import { getMyAccess } from "@/lib/auth/server";
import { cancelFriendRequest, respondToFriendRequest } from "@/lib/social/server";
import { listFriendRequests } from "@/lib/social/requests";

export const Route = createFileRoute("/matches")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/welcome", search: { authComplete: false, authError: "" } });
  },
  head: () => ({
    meta: [
      { title: "Friend requests · Mingleza" },
      { name: "description", content: "Review incoming and outgoing friend requests on Mingleza." },
    ],
  }),
  component: Matches,
});

type RequestItem = {
  id: string;
  requester_id: string;
  addressee_id: string;
  created_at: string;
  incoming: boolean;
  profile: {
    id: string;
    display_name: string;
    avatar_path: string | null;
    city: string | null;
    region: string | null;
    country_code: string | null;
  };
};

function Matches() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listFriendRequests();
      if (!result.ok) {
        setError(
          result.reason === "unauthenticated"
            ? "Sign in to review friend requests."
            : "We could not load friend requests.",
        );
        setRequests([]);
      } else {
        setRequests(result.requests as RequestItem[]);
      }
    } catch {
      setError("We could not load friend requests. Please try again.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (request: RequestItem, accept: boolean) => {
    setBusyId(request.id);
    setError("");
    try {
      if (request.incoming) {
        const result = await respondToFriendRequest({ data: { requestId: request.id, accept } });
        if (!result.ok) {
          setError(result.message);
          return;
        }
      } else {
        const result = await cancelFriendRequest({ data: { requestId: request.id } });
        if (!result.ok) {
          setError(result.message);
          return;
        }
      }
      setRequests((current) => current.filter((item) => item.id !== request.id));
    } catch {
      setError("That request could not be updated. Refresh and try again.");
    } finally {
      setBusyId("");
    }
  };

  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-7 lg:px-8 lg:py-10">
        <PageHeader
          title="Friend requests"
          description="Accept requests to unlock private messaging. You can decline or cancel requests at any time."
          actions={
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/messages">
                <MessageCircle aria-hidden="true" className="size-4" /> Messages
              </Link>
            </Button>
          }
        />

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive-text"
          >
            {error}
          </p>
        )}
        {loading ? (
          <div className="mt-6 space-y-3" aria-label="Loading friend requests">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-8 rounded-3xl border-2 border-dashed p-10 text-center">
            <UserRound className="mx-auto size-9 text-primary" />
            <h2 className="mt-3 text-xl font-bold">No pending requests</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              When someone sends you a friend request, it will appear here.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              Discover people
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {requests.map((request) => {
              const place = [
                request.profile.city,
                request.profile.region,
                request.profile.country_code,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <article
                  key={request.id}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft"
                >
                  <Avatar
                    aria-label={`${request.profile.display_name} avatar`}
                    className="size-14 shrink-0 bg-primary/10 text-lg font-bold text-primary"
                  >
                    <AvatarFallback>{initials(request.profile.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold">{request.profile.display_name}</h2>
                    <p className="text-sm text-muted-foreground">{place || "Mingleza member"}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="size-3" />{" "}
                      {request.incoming ? "Sent you a request" : "Request sent"} ·{" "}
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {request.incoming ? (
                    <div className="flex gap-2">
                      <button
                        disabled={busyId === request.id}
                        onClick={() => void respond(request, false)}
                        aria-label="Decline request"
                        className="grid size-10 place-items-center rounded-full border text-muted-foreground disabled:opacity-50"
                      >
                        <X className="size-4" />
                      </button>
                      <button
                        disabled={busyId === request.id}
                        onClick={() => void respond(request, true)}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        <Check className="size-4" /> Accept
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={busyId === request.id}
                      onClick={() => void respond(request, false)}
                      className="rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      Cancel request
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </AppShell>
  );
}
