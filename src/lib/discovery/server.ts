import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
const discoveryInput = z.object({ intent: z.enum(["friends", "dating"]), limit: z.number().int().min(1).max(40).default(20) });
type DiscoverableProfile = { id: string; display_name: string; bio: string | null; avatar_path: string | null; country_code: string | null; region: string | null; city: string | null; friends_enabled: boolean; dating_enabled: boolean };
async function discover(intent: "friends" | "dating", limit: number, nearby: boolean) {
  try {
    const supabase = getSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { ok: false as const, reason: "unauthenticated" as const, profiles: [] };
    const { data: rows, error } = await supabase.rpc(nearby ? "discover_nearby_profiles" : "discover_profiles", { p_intent: intent, p_limit: limit });
    if (error) {
      if (error.code === "42501") return { ok: false as const, reason: "age_verification_required" as const, profiles: [] };
      if (nearby && error.code === "22023" && error.message.toLowerCase().includes("city")) return { ok: false as const, reason: "city_required" as const, profiles: [] };
      return { ok: false as const, reason: "temporarily_unavailable" as const, profiles: [] };
    }
    const profiles = (rows ?? []) as DiscoverableProfile[];
    return { ok: true as const, profiles: profiles.map((p) => ({ id: p.id, displayName: p.display_name, bio: p.bio, avatarPath: p.avatar_path, countryCode: p.country_code, region: p.region, city: p.city, friendsEnabled: p.friends_enabled, datingEnabled: p.dating_enabled })) };
  } catch { return { ok: false as const, reason: "temporarily_unavailable" as const, profiles: [] }; }
}
export const getDiscoverableProfiles = createServerFn({ method: "GET" }).validator(discoveryInput).handler(async ({ data }) => discover(data.intent, data.limit, false));
export const getNearbyProfiles = createServerFn({ method: "GET" }).validator(discoveryInput).handler(async ({ data }) => discover(data.intent, data.limit, true));
