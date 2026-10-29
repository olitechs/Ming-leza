import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Send, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Input as BrandInput } from "@/components/brand";
import { getMyAccess } from "@/lib/auth/server";
import { useRealtimeConversationMessages } from "@/lib/social/use-realtime-messages";
import { listAcceptedFriendProfiles } from "@/lib/social/friends";
import {
  listConversationMessages,
  openFriendConversation,
  sendConversationMessage,
} from "@/lib/social/server";

export const Route = createFileRoute("/messages")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/login", search: { mode: "signin" } });
  },
  head: () => ({
    meta: [
      { title: "Messages · Mingleza" },
      {
        name: "description",
        content: "Private conversations with your accepted friends on Mingleza.",
      },
    ],
  }),
  component: Messages,
});

type Friend = {
  friendshipId: string;
  id: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
};
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  mine: boolean;
};
type MessageCursor = {
  createdAt: string;
  id: string;
};

function Messages() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [messageCursor, setMessageCursor] = useState<MessageCursor | null>(null);

  const openFriend = useCallback(async (friend: Friend) => {
    setError("");
    setLoading(true);
    setActiveFriend(friend);
    setMobileThreadOpen(true);
    setMessages([]);
    setConversationId(null);
    setHasMore(false);
    setMessageCursor(null);
    try {
      const opened = await openFriendConversation({ data: { otherUserId: friend.id } });
      if (!opened.ok) {
        setError(opened.message);
        return;
      }
      setConversationId(opened.conversationId);
      const result = await listConversationMessages({
        data: { conversationId: opened.conversationId, limit: 100 },
      });
      if (!result.ok) {
        setError("We could not load this conversation. Please try again.");
        return;
      }
      setMessages(result.messages as Message[]);
      setHasMore(result.hasMore);
      setMessageCursor(result.nextCursor);
    } catch {
      setError("Messaging is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    listAcceptedFriendProfiles()
      .then(async (result) => {
        if (!active) return;
        if (!result.ok) {
          setError(
            result.reason === "unauthenticated"
              ? "Sign in to view your conversations."
              : "We could not load your friends.",
          );
          return;
        }
        const list = result.friends as Friend[];
        setFriends(list);
        const firstFriend = list[0];
        const isDesktop =
          typeof window !== "undefined" &&
          (typeof window.matchMedia === "function"
            ? window.matchMedia("(min-width: 768px)").matches
            : window.innerWidth >= 768);
        if (isDesktop && firstFriend) await openFriend(firstFriend);
        else setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError("We could not load your friends. Please refresh.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [openFriend]);

  const handleRealtimeMessage = useCallback((message: Message) => {
    setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
  }, []);

  useRealtimeConversationMessages({ conversationId, table: "messages", onMessage: handleRealtimeMessage });

  const loadEarlier = useCallback(async () => {
    if (!conversationId || !hasMore || loadingEarlier || !messageCursor) return;
    setLoadingEarlier(true);
    setError("");
    try {
      const result = await listConversationMessages({
        data: { conversationId, limit: 100, cursor: messageCursor },
      });
      if (!result.ok) {
        setError("We could not load earlier messages. Please try again.");
        return;
      }
      setMessages((current) => [...(result.messages as Message[]), ...current]);
      setHasMore(result.hasMore);
      setMessageCursor(result.nextCursor);
    } catch {
      setError("We could not load earlier messages. Please try again.");
    } finally {
      setLoadingEarlier(false);
    }
  }, [conversationId, hasMore, loadingEarlier, messageCursor]);

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!conversationId || !draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const result = await sendConversationMessage({
        data: { conversationId, body: draft.trim() },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessages((current) => current.some((item) => item.id === (result.message as Message).id) ? current : [...current, result.message as Message]);
      setDraft("");
    } catch {
      setError("Your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell hideTabs={mobileThreadOpen}>
      <div className="mx-auto flex h-[calc(100dvh-7rem)] max-w-6xl overflow-hidden bg-card md:h-[calc(100dvh-5rem)] md:rounded-3xl md:border">
        <aside
          className={`w-full flex-col md:flex md:w-80 md:shrink-0 md:border-r ${mobileThreadOpen ? "hidden" : "flex"}`}
        >
          <header className="bg-primary px-5 py-5 text-primary-foreground">
            <h1 className="text-2xl font-extrabold">Messages</h1>
            <p className="mt-1 text-sm opacity-85">Chat privately with accepted friends</p>
          </header>
          <div className="flex-1 overflow-y-auto">
            {friends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => void openFriend(friend)}
                className={`flex w-full items-center gap-3 border-b px-4 py-4 text-left hover:bg-muted ${activeFriend?.id === friend.id ? "bg-secondary" : ""}`}
              >
                <Avatar
                  name={friend.display_name}
                  avatarPath={friend.avatar_path}
                  className="size-12"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{friend.display_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[friend.city, friend.region, friend.country_code].filter(Boolean).join(", ") ||
                      "Mingleza friend"}
                  </span>
                </span>
                <MessageCircle className="size-4 text-muted-foreground" />
              </button>
            ))}
            {!loading && friends.length === 0 && (
              <div className="p-7 text-center">
                <Users className="mx-auto size-8 text-primary" />
                <p className="mt-3 font-semibold">No accepted friends yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Accept or send a friend request before starting a private conversation.
                </p>
              </div>
            )}
          </div>
        </aside>

        <section
          className={`min-w-0 flex-1 flex-col ${mobileThreadOpen ? "flex" : "hidden md:flex"}`}
        >
          {activeFriend ? (
            <>
              <header className="flex items-center gap-3 border-b px-4 py-4">
                <button
                  onClick={() => setMobileThreadOpen(false)}
                  aria-label="Back to friends"
                  className="md:hidden"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <Avatar
                  name={activeFriend.display_name}
                  avatarPath={activeFriend.avatar_path}
                  className="size-10"
                />
                <div className="min-w-0">
                  <h2 className="truncate font-bold">{activeFriend.display_name}</h2>
                  <p className="text-xs text-muted-foreground">Private conversation</p>
                </div>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-6">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading conversation…</p>
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Say hello and start the conversation.
                  </p>
                ) : (
                  <>
                    {hasMore && (
                      <div className="flex justify-center pb-1">
                        <button
                          type="button"
                          onClick={() => void loadEarlier()}
                          disabled={loadingEarlier}
                          aria-label="Load earlier messages"
                          className="min-h-11 rounded-full border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                        >
                          {loadingEarlier ? "Loading earlier…" : "Load earlier"}
                        </button>
                      </div>
                    )}
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:max-w-md ${message.mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground"}`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          <time
                            className={`mt-1 block text-right text-[10px] ${message.mine ? "opacity-75" : "text-muted-foreground"}`}
                            dateTime={message.created_at}
                          >
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <form onSubmit={send} className="flex gap-2 border-t bg-card p-3 sm:p-4">
                <BrandInput
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={5000}
                  placeholder="Write a message…"
                  aria-label="Message"
                  aria-describedby={error ? "message-error" : undefined}
                  disabled={!conversationId || loading || sending}
                  className="min-w-0 flex-1 rounded-full border bg-background px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={!conversationId || !draft.trim() || loading || sending}
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                >
                  <Send className="size-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div>
                <MessageCircle className="mx-auto size-10 text-primary" />
                <h2 className="mt-3 text-xl font-bold">Your conversations</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose an accepted friend to start chatting.
                </p>
              </div>
            </div>
          )}
          {error && (
            <p
              id="message-error"
              role="alert"
              className="border-t bg-destructive/10 px-4 py-3 text-sm text-destructive-text"
            >
              {error}
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
