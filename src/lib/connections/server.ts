import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "../supabase/server";

const userInput = z.object({ userId: z.string().uuid() });
const responseInput = z.object({ requestId: z.string().uuid(), accept: z.boolean() });
const idInput = z.object({ id: z.string().uuid() });
const messageInput = z.object({ conversationId: z.string().uuid(), body: z.string().trim().min(1).max(4000) });

async function session() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, message: "Sign in to continue." };
  const { data: age, error: ageError } = await supabase.from("age_verifications").select("is_18_plus").eq("user_id", data.user.id).maybeSingle();
  if (ageError || age?.is_18_plus !== true) return { supabase, user: null, message: "Complete adult verification first." };
  return { supabase, user: data.user, message: "" };
}

export const listFriendships = createServerFn({ method: "GET" }).handler(async () => {
  const s = await session(); if (!s.user) return { ok: false as const, message: s.message };
  const { data, error } = await s.supabase.from("friendships").select("id,requester_id,addressee_id,status,created_at").or(`requester_id.eq.${s.user.id},addressee_id.eq.${s.user.id}`).order("created_at", { ascending: false }).limit(100);
  if (error) return { ok: false as const, message: "Requests could not be loaded." };
  return { ok: true as const, userId: s.user.id, requests: data ?? [] };
});

export const sendFriendRequest = createServerFn({ method: "POST" }).validator(userInput).handler(async ({ data }) => {
  const s = await session(); if (!s.user) return { ok: false as const, message: s.message };
  const { data: requestId, error } = await s.supabase.rpc("request_friendship", { p_addressee_id: data.userId });
  return error ? { ok: false as const, message: "Request unavailable, blocked, or already pending." } : { ok: true as const, requestId };
});

export const respondToFriendRequest = createServerFn({ method: "POST" }).validator(responseInput).handler(async ({ data }) => {
  const s = await session(); if (!s.user) return { ok: false as const, message: s.message };
  const { error } = await s.supabase.rpc("respond_friendship", { p_friendship_id: data.requestId, p_accept: data.accept });
  return error ? { ok: false as const, message: "Request is unavailable or you are not its recipient." } : { ok: true as const };
});

export const cancelFriendRequest = createServerFn({ method: "POST" }).validator(idInput).handler(async ({ data }) => {
  const s = await session(); if (!s.user) return { ok: false as const, message: s.message };
  const { error } = await s.supabase.rpc("cancel_friendship", { p_friendship_id: data.id });
  return error ? { ok: false as const, message: "Request cannot be cancelled." } : { ok: true as const };
});

export const startDirectConversation = createServerFn({ method: "POST" }).validator(userInput).handler(async ({ data }) => {
  const s = await session(); if (!s.user) return { ok: false as const, message: s.message };
  const { data: conversationId, error } = await s.supabase.rpc("start_direct_conversation", { p_other_user: data.userId });
  return error ? { ok: false as const, message: "Chat requires an accepted friendship and no active block." } : { ok: true as const, conversationId };
});

export const listMessages = createServerFn({ method: "POST" }).validator(idInput).handler(async ({ data }) => {
  const s = await session(); if (!s.user) return { ok: false as const, message: s.message };
  const { data: messages, error } = await s.supabase.from("messages").select("id,conversation_id,sender_id,body,created_at,edited_at").eq("conversation_id", data.id).order("created_at", { ascending: true }).limit(200);
  return error ? { ok: false as const, message: "Conversation unavailable or access denied." } : { ok: true as const, messages: messages ?? [] };
});

export const sendMessage = createServerFn({ method: "POST" }).validator(messageInput).handler(async ({ data }) => {
  const s = await session(); if (!s.user) return { ok: false as const, message: s.message };
  const { data: messageId, error } = await s.supabase.rpc("send_direct_message", { p_conversation_id: data.conversationId, p_body: data.body });
  return error ? { ok: false as const, message: "Message could not be sent; access may be restricted." } : { ok: true as const, messageId };
});
