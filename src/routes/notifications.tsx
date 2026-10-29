import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, Heart, MessageCircle, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyAccess } from "@/lib/auth/server";
import { listMyNotifications, markNotificationRead } from "@/lib/social/server";

export const Route = createFileRoute("/notifications")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/login", search: { mode: "signin" } });
  },
  head: () => ({
    meta: [
      { title: "Notifications · Mingleza" },
      { name: "description", content: "Your dating match and message notifications." },
    ],
  }),
  component: NotificationsPage,
});

type NotificationItem = {
  id: string;
  notification_type: "new_match" | "dating_message";
  actor_id: string | null;
  match_id: string;
  message_id: string | null;
  created_at: string;
  read_at: string | null;
};

function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listMyNotifications();
      if (!result.ok) {
        setItems([]);
        setError("We could not load your notifications. Please try again.");
        return;
      }
      setItems(result.notifications as NotificationItem[]);
    } catch {
      setError("We could not load your notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (item: NotificationItem) => {
    if (item.read_at) return;
    const result = await markNotificationRead({ data: { notificationId: item.id } });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setItems((current) =>
      current.map((notification) =>
        notification.id === item.id
          ? { ...notification, read_at: new Date().toISOString() }
          : notification,
      ),
    );
  };

  const unreadCount = items.filter((item) => !item.read_at).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-7 lg:px-8 lg:py-10">
        <header className="mb-7 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Your activity
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Notifications</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Updates about mutual matches and dating messages.
            </p>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Bell className="size-6" />
          </span>
        </header>

        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-destructive/30 p-4 text-sm">
            {error}
            <button onClick={() => void load()} className="ml-2 font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <p className="mb-3 text-xs font-semibold text-muted-foreground" aria-live="polite">
            {unreadCount} unread · Showing the latest {items.length}
          </p>
        )}

        <section aria-label="Notification list" className="space-y-3">
          {loading ? (
            <p
              className="rounded-2xl border p-8 text-center text-sm text-muted-foreground"
              aria-live="polite"
            >
              Loading notifications…
            </p>
          ) : items.length === 0 && !error ? (
            <div className="rounded-3xl border border-dashed p-10 text-center">
              <Bell className="mx-auto size-9 text-primary" />
              <h2 className="mt-3 text-lg font-bold">You’re all caught up</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                New mutual matches and messages will appear here.
              </p>
              <Link
                to="/matches"
                className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                View dating matches
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const isMatch = item.notification_type === "new_match";
              const Icon = isMatch ? Heart : MessageCircle;
              return (
                <article
                  key={item.id}
                  className={`flex items-start gap-3 rounded-2xl border p-4 transition ${item.read_at ? "bg-card" : "border-primary/30 bg-primary/5"}`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {isMatch ? "It’s a mutual match!" : "You received a dating message"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isMatch
                        ? "You both liked each other. Start a conversation when you’re ready."
                        : "Open your match conversation to read and reply."}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                      {!item.read_at && (
                        <span className="ml-2 font-semibold text-primary">New</span>
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        to="/chat/$matchId"
                        params={{ matchId: item.match_id }}
                        onClick={() => void markRead(item)}
                        className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                      >
                        Open conversation
                      </Link>
                      {!item.read_at && (
                        <button
                          type="button"
                          onClick={() => void markRead(item)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold"
                        >
                          <CheckCheck className="size-4" /> Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </AppShell>
  );
}
