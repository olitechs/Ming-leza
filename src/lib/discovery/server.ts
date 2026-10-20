import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const discoveryInput = z.object({
  intent: z.enum(["friends", "dating"]),
  limit: z.number().int().min(1).max(40).default(20),
});

type DiscoverableProfile = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  friends_enabled: boolean;
  dating_enabled: boolean;
};

/**
 * Server boundary for profile discovery.
 * The database RPC is the authoritative age, discoverability, intent and
 * reciprocal-block filter. Never select exact coordinates or date-of-birth data.
 */
export const getDiscoverableProfiles = createServerFn({ method: "GET" })
  .validator(discoveryInput)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        return { ok: false as const, reason: "unauthenticated" as const, profiles: [] };
      }

      const { data: rows, error } = await supabase.rpc("discover_profiles", {
        p_intent: data.intent,
        p_limit: data.limit,
      });

      if (error) {
        // Do not expose database details, query text, or policy information to clients.
        const reason =
          error.code === "42501"
            ? "age_verification_required"
            : "temporarily_unavailable";
        return { ok: false as const, reason, profiles: [] };
      }

      const profiles = (rows ?? []) as DiscoverableProfile[];
      return {
        ok: true as const,
        profiles: profiles.map((profile) => ({
          id: profile.id,
          displayName: profile.display_name,
          bio: profile.bio,
          avatarPath: profile.avatar_path,
          countryCode: profile.country_code,
          region: profile.region,
          city: profile.city,
          friendsEnabled: profile.friends_enabled,
          datingEnabled: profile.dating_enabled,
        })),
      };
    } catch {
      return {
        ok: false as const,
        reason: "temporarily_unavailable" as const,
        profiles: [],
      };
    }
  });
