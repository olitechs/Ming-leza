import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const discoveryInput = z.object({
  intent: z.enum(["friends", "dating"]),
  limit: z.number().int().min(1).max(40).default(20),
});

/**
 * Server boundary for profile discovery.
 * Only returns minimal public profile fields. Precise location and age data are never selected.
 * Database RLS remains the authoritative access-control layer.
 */
export const getDiscoverableProfiles = createServerFn({ method: "GET" })
  .validator(discoveryInput)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { ok: false as const, reason: "unauthenticated" as const, profiles: [] };
    }

    const { data: ageRecord, error: ageError } = await supabase
      .from("age_verifications")
      .select("is_18_plus")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (ageError || ageRecord?.is_18_plus !== true) {
      return { ok: false as const, reason: "age_verification_required" as const, profiles: [] };
    }

    const intentColumn = data.intent === "dating" ? "dating_enabled" : "friends_enabled";
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("is_discoverable", true)
      .eq(intentColumn, true)
      .neq("id", authData.user.id)
      .order("display_name", { ascending: true })
      .limit(data.limit);

    if (profilesError) {
      return { ok: false as const, reason: "temporarily_unavailable" as const, profiles: [] };
    }

    // Exclude blocks in both directions. Fail closed if the block query cannot be evaluated.
    const { data: outgoingBlocks, error: outgoingError } = await supabase
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", authData.user.id);
    const { data: incomingBlocks, error: incomingError } = await supabase
      .from("blocks")
      .select("blocker_id")
      .eq("blocked_id", authData.user.id);

    if (outgoingError || incomingError) {
      return { ok: false as const, reason: "temporarily_unavailable" as const, profiles: [] };
    }

    const blockedIds = new Set([
      ...(outgoingBlocks ?? []).map((row) => row.blocked_id),
      ...(incomingBlocks ?? []).map((row) => row.blocker_id),
    ]);

    return {
      ok: true as const,
      profiles: (profiles ?? [])
        .filter((profile) => !blockedIds.has(profile.id))
        .map((profile) => ({ id: profile.id, displayName: profile.display_name })),
    };
  });
