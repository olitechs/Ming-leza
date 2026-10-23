import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const userIdSchema = z.string().uuid();
const requestSchema = z.object({ userId: userIdSchema });
const respondSchema = z.object({ requestId: userIdSchema, accept: z.boolean() });
const cancelSchema = z.object({ requestId: userIdSchema });
const conversationSchema = z.object({ otherUserId: userIdSchema });
const messageCursorSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: userIdSchema,
});
const listMessagesSchema = z.object({
  conversationId: userIdSchema,
  limit: z.number().int().min(1).max(100).default(50),
  cursor: messageCursorSchema.optional(),
});
const sendMessageSchema = z.object({
  conversationId: userIdSchema,
  body: z.string().trim().min(1).max(5000),
});

async function authenticatedClient() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

export const listMyFriendships = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await authenticatedClient();
  if (!user) return { ok: false as const, reason: "unauthenticated" as const };
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order("created_at", { ascending: false });
  if (error) return { ok: false as const, reason: "unavailable" as const };
  return { ok: true as const, friendships: data ?? [] };
});

export const sendFriendRequest = createServerFn({ method: "POST" })
  .validator(requestSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await authenticatedClient();
    if (!user) return { ok: false as const, message: "Sign in to send a friend request." };
    const { data: requestId, error } = await supabase.rpc("send_friend_request", {
      p_addressee_id: data.userId,
    });
    if (error) {
      const rpcMessage = error.message.toLowerCase();
      if (rpcMessage.includes("request already pending")) {
        return { ok: false as const, message: "A friend request is already pending." };
      }
      if (rpcMessage.includes("already connected")) {
        return { ok: false as const, message: "You are already connected with this member." };
      }
      return { ok: false as const, message: "This friend request could not be sent." };
    }
    return { ok: true as const, requestId };
  });

export const respondToFriendRequest = createServerFn({ method: "POST" })
  .validator(respondSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await authenticatedClient();
    if (!user) return { ok: false as const, message: "Sign in to respond to requests." };
    const { error } = await supabase.rpc("respond_to_friend_request", {
      p_request_id: data.requestId,
      p_accept: data.accept,
    });
    if (error)
      return { ok: false as const, message: "That friend request is no longer available." };
    return { ok: true as const };
  });

export const cancelFriendRequest = createServerFn({ method: "POST" })
  .validator(cancelSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await authenticatedClient();
    if (!user) return { ok: false as const, message: "Sign in to manage requests." };
    const { error } = await supabase.rpc("cancel_friend_request", {
      p_request_id: data.requestId,
    });
    if (error)
      return { ok: false as const, message: "That pending request could not be cancelled." };
    return { ok: true as const };
  });

export const openFriendConversation = createServerFn({ method: "POST" })
  .validator(conversationSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await authenticatedClient();
    if (!user) return { ok: false as const, message: "Sign in to start a conversation." };
    const { data: conversationId, error } = await supabase.rpc("open_friend_conversation", {
      p_other_user_id: data.otherUserId,
    });
    if (error)
      return { ok: false as const, message: "Messaging is available to accepted friends only." };
    return { ok: true as const, conversationId };
  });

export const listConversationMessages = createServerFn({ method: "GET" })
  .validator(listMessagesSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await authenticatedClient();
    if (!user) return { ok: false as const, reason: "unauthenticated" as const };
    let query = supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at, edited_at, deleted_at")
      .eq("conversation_id", data.conversationId)
      .is("deleted_at", null);
    if (data.cursor) {
      query = query.or(
        `created_at.lt.${data.cursor.createdAt},and(created_at.eq.${data.cursor.createdAt},id.lt.${data.cursor.id})`,
      );
    }
    const { data: messages, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(data.limit + 1);
    if (error) return { ok: false as const, reason: "unavailable" as const };
    const page = (messages ?? []).slice(0, data.limit).reverse();
    const oldestMessage = page[0];
    return {
      ok: true as const,
      messages: page.map((message) => ({
        ...message,
        mine: message.sender_id === user.id,
      })),
      hasMore: (messages ?? []).length > data.limit,
      nextCursor: oldestMessage
        ? { createdAt: oldestMessage.created_at, id: oldestMessage.id }
        : null,
    };
  });

export const sendConversationMessage = createServerFn({ method: "POST" })
  .validator(sendMessageSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await authenticatedClient();
    if (!user) return { ok: false as const, message: "Sign in to send messages." };
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: data.conversationId,
        sender_id: user.id,
        body: data.body,
      })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();
    if (error || !message)
      return {
        ok: false as const,
        message: "This message could not be sent. Check the conversation and try again.",
      };
    return { ok: true as const, message: { ...message, mine: true } };
  });
