import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const listAcceptedFriendProfiles = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { ok: false as const, reason: "unauthenticated" as const };

  const { data: friendships, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, created_at")
    .eq("status", "accepted")
    .or(`requester_id.eq.${auth.user.id},addressee_id.eq.${auth.user.id}`)
    .order("updated_at", { ascending: false });
  if (error) return { ok: false as const, reason: "unavailable" as const };

  const friendIds = (friendships ?? []).map((f) =>
    f.requester_id === auth.user.id ? f.addressee_id : f.requester_id,
  );
  if (friendIds.length === 0) return { ok: true as const, friends: [] };

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, bio, avatar_path, city, region, country_code")
    .in("id", friendIds);
  if (profileError) return { ok: false as const, reason: "unavailable" as const };

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return {
    ok: true as const,
    friends: (friendships ?? []).flatMap((friendship) => {
      const id = friendship.requester_id === auth.user.id ? friendship.addressee_id : friendship.requester_id;
      const profile = profileById.get(id);
      return profile ? [{ friendshipId: friendship.id, ...profile }] : [];
    }),
  };
});
