import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const listFriendRequests = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { ok: false as const, reason: "unauthenticated" as const };

  const { data: rows, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .eq("status", "pending")
    .or(`requester_id.eq.${auth.user.id},addressee_id.eq.${auth.user.id}`)
    .order("created_at", { ascending: false });
  if (error) return { ok: false as const, reason: "unavailable" as const };

  const otherIds = [...new Set((rows ?? []).map((row) =>
    row.requester_id === auth.user.id ? row.addressee_id : row.requester_id,
  ))];
  if (otherIds.length === 0) return { ok: true as const, requests: [] };

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_path, city, region, country_code")
    .in("id", otherIds);
  if (profileError) return { ok: false as const, reason: "unavailable" as const };

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return {
    ok: true as const,
    requests: (rows ?? []).flatMap((row) => {
      const incoming = row.addressee_id === auth.user.id;
      const otherId = incoming ? row.requester_id : row.addressee_id;
      const profile = profileById.get(otherId);
      return profile ? [{ ...row, incoming, profile }] : [];
    }),
  };
});
