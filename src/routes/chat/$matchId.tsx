import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/brand";
import { getMyAccess } from "@/lib/auth/server";
import { useRealtimeConversationMessages } from "@/lib/social/use-realtime-messages";
import {
  listDatingMessages,
  listMyDatingMatches,
  openDatingConversation,
  sendDatingMessage,
} from "@/lib/social/server";

export const Route = createFileRoute("/chat/$matchId")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/login", search: { mode: "signin" } });
  },
  head: () => ({
    meta: [
      { title: "Dating chat · Mingleza" },
      { name: "description", content: "Private messages with an active mutual dating match." },
    ],
  }),
  component: DatingChatPage,
});

type MatchRow = {
  match_id: string;
  matched_at: string;
  other_user_id: string;
  display_name: string;
  avatar_path: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
};
type DatingMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  mine: boolean;
};

function DatingChatPage() {
  const { matchId } = Route.useParams();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<DatingMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const matchesResult = await listMyDatingMatches();
      if (!matchesResult.ok) {
        setError("We could not load your dating matches. Please try again.");
        return;
      }
      const current = (matchesResult.matches as MatchRow[]).find(
        (item) => item.match_id === matchId,
      );
      if (!current) {
        setMatch(null);
        setError("This dating match is no longer active or is unavailable.");
        return;
      }
      setMatch(current);
      const opened = await openDatingConversation({ data: { matchId } });
      if (!opened.ok) {
        setError(opened.message);
        return;
      }
      setConversationId(opened.conversationId);
      const result = await listDatingMessages({ data: { conversationId: opened.conversationId } });
      if (!result.ok) {
        setError("We could not load this conversation. Please try again.");
        return;
      }
      setMessages(result.messages as DatingMessage[]);
    } catch {
      setError("Dating chat is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const handleRealtimeMessage = useCallback((message: DatingMessage) => {
    setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
  }, []);

  useRealtimeConversationMessages({ conversationId, table: "dating_messages", onMessage: handleRealtimeMessage });

  useEffect(() => {
    void load();
  }, [load]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!conversationId || !draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const result = await sendDatingMessage({ data: { conversationId, body: draft.trim() } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessages((current) => current.some((item) => item.id === (result.message as DatingMessage).id) ? current : [...current, result.message as DatingMessage]);
      setDraft("");
    } catch {
      setError("Your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100dvh-7rem)] max-w-3xl flex-col px-3 py-4 md:h-[calc(100dvh-2rem)] md:px-6 md:py-6">
        <header className="mb-4 flex items-center gap-3 rounded-2xl border bg-card p-4">
          <Link
            to="/matches"
            aria-label="Back to dating matches"
            className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="size-5" />
          </Link>
          {match ? (
            <>
              <Avatar
                name={match.display_name}
                avatarPath={match.avatar_path}
                className="size-12"
              />
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-bold">{match.display_name}</h1>
                <p className="truncate text-xs text-muted-foreground">
                  {[match.city, match.region, match.country_code].filter(Boolean).join(", ") ||
                    "Mutual dating match"}
                </p>
              </div>
            </>
          ) : (
            <div>
              <h1 className="font-bold">Dating chat</h1>
              <p className="text-xs text-muted-foreground">Private conversation</p>
            </div>
          )}
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
          >
            {error}
            <div className="mt-3">
              <Button variant="outline" onClick={() => void load()} disabled={loading}>
                Try again
              </Button>
            </div>
          </div>
        )}

        <section
          aria-label="Dating conversation"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card"
        >
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground" aria-live="polite">
                Loading conversation…
              </p>
            ) : messages.length === 0 && !error ? (
              <div className="mx-auto flex max-w-sm flex-col items-center py-12 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <MessageCircle className="size-6" />
                </span>
                <h2 className="mt-4 font-semibold">Start the conversation</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Say hello. Only you and your active mutual match can read these messages.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm ${message.mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground"}`}
                  >
                    {message.body}
                    <p className="mt-1 text-[10px] opacity-65">
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t p-3">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="Write a dating message"
              maxLength={2000}
              placeholder="Write a message…"
              disabled={!conversationId || loading || Boolean(error)}
              className="min-h-11 min-w-0 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim() || sending || !conversationId || loading || Boolean(error)}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
