import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Send, Users, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Input as BrandInput } from "@/components/brand";
import { getMyAccess } from "@/lib/auth/server";
import { listAcceptedFriendProfiles } from "@/lib/social/friends";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  listConversationMessages,
  openFriendConversation,
  sendConversationMessage,
  createFriendGroup,
  listMyGroupConversations,
} from "@/lib/social/server";

export const Route = createFileRoute("/messages")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/welcome", search: { authComplete: false, authError: "" } });
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
  senderName?: string | null;
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
  const [groups, setGroups] = useState<{ id: string; title: string | null; created_at: string }[]>(
    [],
  );
  const [activeGroupTitle, setActiveGroupTitle] = useState("");
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [groupBusy, setGroupBusy] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const openFriend = useCallback(async (friend: Friend) => {
    setError("");
    setLoading(true);
    setActiveFriend(friend);
    setActiveGroupTitle("");
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

  const openGroup = useCallback(async (group: { id: string; title: string | null }) => {
    setError("");
    setLoading(true);
    setActiveFriend(null);
    setActiveGroupTitle(group.title || "Group chat");
    setMobileThreadOpen(true);
    setConversationId(group.id);
    setMessages([]);
    setHasMore(false);
    setMessageCursor(null);
    try {
      const result = await listConversationMessages({
        data: { conversationId: group.id, limit: 100 },
      });
      if (!result.ok) setError("We could not load this group conversation.");
      else {
        setMessages(result.messages as Message[]);
        setHasMore(result.hasMore);
        setMessageCursor(result.nextCursor);
      }
    } catch {
      setError("Group chat is temporarily unavailable.");
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
        const groupResult = await listMyGroupConversations();
        if (active && groupResult.ok) setGroups(groupResult.groups);
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

  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    const refreshMessages = async () => {
      const result = await listConversationMessages({ data: { conversationId, limit: 100 } }).catch(
        () => null,
      );
      if (!active || !result?.ok) return;
      setMessages((current) => {
        const byId = new Map(current.map((message) => [message.id, message]));
        for (const message of result.messages as Message[]) byId.set(message.id, message);
        return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    };
    const supabase = getSupabaseBrowserClient();
    setRealtimeConnected(false);
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => void refreshMessages(),
      )
      .subscribe((status: string) => {
        if (active) setRealtimeConnected(status === "SUBSCRIBED");
      });
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || realtimeConnected) return;
    let active = true;
    const refresh = async () => {
      const result = await listConversationMessages({ data: { conversationId, limit: 100 } }).catch(
        () => null,
      );
      if (!active || !result?.ok) return;
      setMessages((current) => {
        const byId = new Map(current.map((message) => [message.id, message]));
        for (const message of result.messages as Message[]) byId.set(message.id, message);
        return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    };
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [conversationId, realtimeConnected]);

  const createGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setGroupBusy(true);
    try {
      const result = await createFriendGroup({
        data: { title: newGroupTitle.trim(), friendIds: selectedFriendIds },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const group = {
        id: result.conversationId,
        title: newGroupTitle.trim(),
        created_at: new Date().toISOString(),
      };
      setGroups((current) => [group, ...current]);
      setNewGroupTitle("");
      setSelectedFriendIds([]);
      await openGroup(group);
    } catch {
      setError("Group chat could not be created.");
    } finally {
      setGroupBusy(false);
    }
  };

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
      setMessages((current) => [...current, result.message as Message]);
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
            <p className="mt-1 text-sm opacity-85">
              Open chats use a live connection when available
            </p>
          </header>
          <details className="border-b p-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold">
              <span className="flex items-center gap-2">
                <Plus className="size-4" /> Create group chat
              </span>
            </summary>
            <form onSubmit={(event) => void createGroup(event)} className="mt-3 space-y-3">
              <label className="block text-xs font-semibold">
                Group name
                <BrandInput
                  value={newGroupTitle}
                  onChange={(event) => setNewGroupTitle(event.target.value)}
                  required
                  minLength={1}
                  maxLength={80}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Select 2–19 accepted friends. Group members can see one another.
              </p>
              <div className="max-h-36 space-y-2 overflow-auto">
                {friends.map((friend) => (
                  <label key={friend.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedFriendIds.includes(friend.id)}
                      onChange={(event) =>
                        setSelectedFriendIds((ids) =>
                          event.target.checked
                            ? [...ids, friend.id]
                            : ids.filter((id) => id !== friend.id),
                        )
                      }
                    />
                    {friend.display_name}
                  </label>
                ))}
                {friends.length < 2 && (
                  <p className="text-xs text-muted-foreground">
                    You need at least two accepted friends to create a group.
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={groupBusy || selectedFriendIds.length < 2}
                className="min-h-10 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {groupBusy ? "Creating…" : "Create group"}
              </button>
            </form>
          </details>
          <div className="flex-1 overflow-y-auto">
            {groups.length > 0 && (
              <div className="border-b p-3">
                <h2 className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Groups
                </h2>
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => void openGroup(group)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-muted ${conversationId === group.id ? "bg-secondary" : ""}`}
                  >
                    <Users className="size-5 text-primary" />
                    <span className="truncate text-sm font-semibold">
                      {group.title || "Group chat"}
                    </span>
                  </button>
                ))}
              </div>
            )}
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
          {activeFriend || activeGroupTitle ? (
            <>
              <header className="flex items-center gap-3 border-b px-4 py-4">
                <button
                  onClick={() => setMobileThreadOpen(false)}
                  aria-label="Back to friends"
                  className="md:hidden"
                >
                  <ArrowLeft className="size-5" />
                </button>
                {activeFriend ? (
                  <Avatar
                    name={activeFriend.display_name}
                    avatarPath={activeFriend.avatar_path}
                    className="size-10"
                  />
                ) : (
                  <Users className="size-8 text-primary" />
                )}
                <div className="min-w-0">
                  <h2 className="truncate font-bold">
                    {activeFriend?.display_name || activeGroupTitle}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {realtimeConnected
                      ? "Live connection active"
                      : "Reconnecting · checking for new messages every 5 seconds"}
                    {!activeFriend && " · Group members can see group messages"}
                  </p>
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
                          {!message.mine && activeGroupTitle && (
                            <p className="mb-1 text-xs font-semibold">
                              {message.senderName || "Mingleza member"}
                            </p>
                          )}
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
