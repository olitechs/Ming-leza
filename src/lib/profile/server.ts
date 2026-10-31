import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "../supabase/server";
import { SUPPORTED_COUNTRIES } from "../countries";

const profileInput = z.object({
  displayName: z.string().trim().min(2).max(40),
  bio: z.string().trim().max(300),
  city: z.string().trim().max(80),
  region: z.string().trim().max(80),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/),
});

const avatarPathInput = z.object({
  path: z
    .string()
    .min(1)
    .max(300)
    .regex(/^[0-9a-f-]{36}\/avatar\.(jpg|png|webp)$/i),
});

const profileSetupInput = z.object({
  displayName: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .refine((value) => value.toLowerCase() !== "new member", "Choose a real display name."),
  city: z.string().trim().min(2).max(80),
});

const publicProfileInput = z.object({ id: z.string().uuid() });

const discoveryPreferencesInput = z.object({
  isDiscoverable: z.boolean(),
  friendsEnabled: z.boolean(),
  datingEnabled: z.boolean(),
});

async function getVerifiedUser() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { supabase, user: null, message: "Sign in to edit your profile." };
  }
  const { data: age, error: ageError } = await supabase
    .from("age_verifications")
    .select("is_18_plus")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (ageError || age?.is_18_plus !== true) {
    return {
      supabase,
      user: null,
      message: "Complete adult verification before editing your profile.",
    };
  }
  return { supabase, user: data.user, message: "" };
}

export const getMyProfile = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabase, user, message } = await getVerifiedUser();
    if (!user) return { ok: false as const, message };
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "display_name,bio,avatar_path,country_code,region,city,friends_enabled,dating_enabled,is_discoverable",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (error || !data) {
      return {
        ok: false as const,
        message: "Profile could not be loaded. Please retry.",
      };
    }
    return { ok: true as const, profile: data };
  } catch {
    return {
      ok: false as const,
      message: "Profile service is temporarily unavailable.",
    };
  }
});

export const listSupportedCountries = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { user, message } = await getVerifiedUser();
    if (!user) return { ok: false as const, message, countries: [] };
    // Country names are static reference data. Do not make profile editing depend on
    // Supabase availability, RLS state, or a seeded reference table.
    return { ok: true as const, countries: [...SUPPORTED_COUNTRIES] };
  } catch {
    return {
      ok: false as const,
      message: "Your profile service is temporarily unavailable. Please retry.",
      countries: [],
    };
  }
});

export const getVisibleProfile = createServerFn({ method: "GET" })
  .validator(publicProfileInput)
  .handler(async ({ data }) => {
    try {
      const { supabase, user, message } = await getVerifiedUser();
      if (!user) return { ok: false as const, message };
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "id,display_name,bio,avatar_path,country_code,region,city,friends_enabled,dating_enabled",
        )
        .eq("id", data.id)
        .maybeSingle();
      if (
        error ||
        !profile ||
        !profile.display_name.trim() ||
        profile.display_name.trim().toLowerCase() === "new member"
      ) {
        return { ok: false as const, message: "This profile is not available." };
      }
      return {
        ok: true as const,
        profile: {
          id: profile.id,
          displayName: profile.display_name,
          bio: profile.bio,
          avatarPath: profile.avatar_path,
          countryCode: profile.country_code,
          region: profile.region,
          city: profile.city,
          friendsEnabled: profile.friends_enabled,
          datingEnabled: profile.dating_enabled,
        },
      };
    } catch {
      return { ok: false as const, message: "This profile is not available." };
    }
  });

export const completeMyProfileSetup = createServerFn({ method: "POST" })
  .validator(profileSetupInput)
  .handler(async ({ data }) => {
    try {
      const { supabase, user, message } = await getVerifiedUser();
      if (!user) return { ok: false as const, message };
      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          display_name: data.displayName,
          city: data.city,
          is_discoverable: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (error)
        return { ok: false as const, message: "Profile setup could not be saved. Please retry." };
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "Profile service is temporarily unavailable." };
    }
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .validator(profileInput)
  .handler(async ({ data }) => {
    try {
      const { supabase, user, message } = await getVerifiedUser();
      if (!user) return { ok: false as const, message };
      const { data: country, error: countryError } = await supabase
        .from("supported_countries")
        .select("code")
        .eq("code", data.countryCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();
      if (countryError || !country)
        return { ok: false as const, message: "Choose an available country." };
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: data.displayName,
          bio: data.bio,
          city: data.city || null,
          region: data.region || null,
          country_code: data.countryCode.toUpperCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) {
        return {
          ok: false as const,
          message: "Profile could not be saved. Please check your details and retry.",
        };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: "Profile service is temporarily unavailable.",
      };
    }
  });

export const updateMyDiscoveryPreferences = createServerFn({ method: "POST" })
  .validator(discoveryPreferencesInput)
  .handler(async ({ data }) => {
    try {
      const { supabase, user, message } = await getVerifiedUser();
      if (!user) return { ok: false as const, message };
      const { error } = await supabase.rpc("update_my_discovery_preferences", {
        p_is_discoverable: data.isDiscoverable,
        p_friends_enabled: data.friendsEnabled,
        p_dating_enabled: data.datingEnabled,
      });
      if (error) {
        const detail = error.message.toLowerCase();
        if (detail.includes("complete your display name and city")) {
          return {
            ok: false as const,
            message: "Add your display name and city before making your profile discoverable.",
          };
        }
        if (detail.includes("enable friendship or dating")) {
          return {
            ok: false as const,
            message:
              "Choose at least one connection intent before making your profile discoverable.",
          };
        }
        return {
          ok: false as const,
          message: "Your discovery preferences could not be saved. Please retry.",
        };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: "Profile preferences are temporarily unavailable.",
      };
    }
  });

export const setMyAvatarPath = createServerFn({ method: "POST" })
  .validator(avatarPathInput)
  .handler(async ({ data }) => {
    try {
      const { supabase, user, message } = await getVerifiedUser();
      if (!user) return { ok: false as const, message };
      if (!data.path.startsWith(user.id + "/")) {
        return { ok: false as const, message: "Invalid avatar path." };
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_path: data.path,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) {
        return {
          ok: false as const,
          message: "Photo could not be saved. Please retry.",
        };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: "Profile service is temporarily unavailable.",
      };
    }
  });
