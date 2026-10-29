import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const listAcceptedFriendProfiles = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { ok: false as const, reason: "unauthenticated" as const };

  const [friendResult, requestResult] = await Promise.all([
    supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, created_at")
      .eq("status", "accepted")
      .or(`requester_id.eq.${auth.user.id},addressee_id.eq.${auth.user.id}`)
      .order("updated_at", { ascending: false }),
    supabase
      .from("message_requests")
      .select("id,requester_id,recipient_id,created_at")
      .eq("status", "accepted")
      .or(`requester_id.eq.${auth.user.id},recipient_id.eq.${auth.user.id}`)
      .order("updated_at", { ascending: false }),
  ]);
  if (friendResult.error || requestResult.error)
    return { ok: false as const, reason: "unavailable" as const };

  const contacts = [
    ...(friendResult.data ?? []).map((row) => ({
      friendshipId: row.id,
      id: row.requester_id === auth.user.id ? row.addressee_id : row.requester_id,
      created_at: row.created_at,
      contactKind: "friend" as const,
    })),
    ...(requestResult.data ?? []).map((row) => ({
      friendshipId: row.id,
      id: row.requester_id === auth.user.id ? row.recipient_id : row.requester_id,
      created_at: row.created_at,
      contactKind: "message-request" as const,
    })),
  ];
  const ids = [...new Set(contacts.map((contact) => contact.id))];
  if (!ids.length) return { ok: true as const, friends: [] };
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, bio, avatar_path, city, region, country_code")
    .in("id", ids);
  if (profileError) return { ok: false as const, reason: "unavailable" as const };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return {
    ok: true as const,
    friends: contacts.flatMap((contact) => {
      const profile = profileById.get(contact.id);
      return profile
        ? [{ friendshipId: contact.friendshipId, contactKind: contact.contactKind, ...profile }]
        : [];
    }),
  };
});
