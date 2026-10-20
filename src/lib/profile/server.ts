import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "../supabase/server";

const profileInput = z.object({
  displayName: z
    .string()
    .trim()
    .min(2)
    .max(40),
  bio: z
    .string()
    .trim()
    .max(300),
  city: z.string().trim().max(80),
  region: z.string().trim().max(80),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/),
});

const avatarPathInput = z.object({
  path: z
    .string()
    .min(1)
    .max(300)
    .regex(/^[0-9a-f-]{36}\/avatar\.(jpg|png|webp)$/i),
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

export const updateMyProfile = createServerFn({ method: "POST" })
  .validator(profileInput)
  .handler(async ({ data }) => {
    try {
      const { supabase, user, message } = await getVerifiedUser();
      if (!user) return { ok: false as const, message };
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
