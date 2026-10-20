import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { isAtLeast18 } from "./age";
import { getSupabaseAdminClient } from "../supabase/admin.server";
import { getSupabaseServerClient } from "../supabase/server";

const otpRequestSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("phone"),
    identifier: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/),
  }),
  z.object({ method: z.literal("email"), identifier: z.string().trim().email().max(254) }),
]);
const otpVerifySchema = z.object({
  method: z.enum(["phone", "email"]),
  identifier: z.string().trim().min(3).max(254),
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

export const sendOtp = createServerFn({ method: "POST" })
  .validator(otpRequestSchema)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const result =
        data.method === "phone"
          ? await supabase.auth.signInWithOtp({ phone: data.identifier })
          : await supabase.auth.signInWithOtp({
              email: data.identifier,
              options: {
                shouldCreateUser: true,
                emailRedirectTo: "https://mingleza-peach.vercel.app/auth-callback",
              },
            });
      if (result.error) {
        return {
          ok: false as const,
          message:
            data.method === "email"
              ? "We could not send your sign-in link. Check the email address and try again."
              : "We could not send a code. Check the details and try again.",
        };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: "Authentication is not configured yet. Please try again later.",
      };
    }
  });

const passwordLoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const signInWithPassword = createServerFn({ method: "POST" })
  .validator(passwordLoginSchema)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (result.error || !result.data.user) {
        return {
          ok: false as const,
          message: "Email or password is incorrect. Check your details or reset your password.",
        };
      }
      const profile = await supabase.from("profiles").upsert(
        {
          id: result.data.user.id,
          display_name: "New member",
          friends_enabled: true,
          dating_enabled: false,
          is_discoverable: true,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (profile.error) {
        return {
          ok: false as const,
          message: "You are signed in, but we could not load your profile. Please try again.",
        };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: "We could not sign you in right now. Please try again.",
      };
    }
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .validator(otpVerifySchema)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const result =
        data.method === "phone"
          ? await supabase.auth.verifyOtp({
              phone: data.identifier,
              token: data.token,
              type: "sms",
            })
          : await supabase.auth.verifyOtp({
              email: data.identifier,
              token: data.token,
              type: "email",
            });
      if (result.error || !result.data.user) {
        return {
          ok: false as const,
          message: "That code is invalid or expired. Request a new code and try again.",
        };
      }
      const profile = await supabase.from("profiles").upsert(
        {
          id: result.data.user.id,
          display_name: "New member",
          friends_enabled: true,
          dating_enabled: false,
          is_discoverable: true,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (profile.error) {
        return {
          ok: false as const,
          message: "Your account was verified, but setup could not finish. Please retry.",
        };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: "Authentication is not configured yet. Please try again later.",
      };
    }
  });

const magicLinkSchema = z.union([
  z.object({ code: z.string().trim().min(1).max(4096) }),
  z.object({
    tokenHash: z.string().trim().min(1).max(4096),
    type: z.enum(["magiclink", "email", "signup"]),
  }),
]);

/** Accept both Supabase PKCE codes and token_hash confirmation links. */
export const exchangeEmailMagicLink = createServerFn({ method: "POST" })
  .validator(magicLinkSchema)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const result =
        "code" in data
          ? await supabase.auth.exchangeCodeForSession(data.code)
          : await supabase.auth.verifyOtp({
              token_hash: data.tokenHash,
              type: data.type,
            });
      const authData = result.data;
      const error = result.error;
      if (error || !authData.user) {
        return {
          ok: false as const,
          message: "This sign-in link is invalid, expired, or already used. Request a new link.",
        };
      }
      const profile = await supabase.from("profiles").upsert(
        {
          id: authData.user.id,
          display_name: "New member",
          friends_enabled: true,
          dating_enabled: false,
          is_discoverable: true,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (profile.error) {
        return {
          ok: false as const,
          message: "You are signed in, but profile setup could not finish. Please retry.",
        };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: "We could not complete sign-in. Request a fresh link and try again.",
      };
    }
  });

export const verifyAdult = createServerFn({ method: "POST" })
  .validator(z.object({ dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user)
        return { ok: false as const, message: "Sign in before verifying your age." };
      const admin = getSupabaseAdminClient();
      const existing = await admin
        .from("age_verifications")
        .select("is_18_plus")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (existing.error)
        return { ok: false as const, message: "Age verification is temporarily unavailable." };
      if (existing.data?.is_18_plus === false) {
        await supabase.auth.signOut();
        return {
          ok: false as const,
          message: "Mingleza is only available to people aged 18 and over.",
        };
      }
      if (existing.data?.is_18_plus === true) return { ok: true as const };
      const eligible = isAtLeast18(data.dateOfBirth);
      const saved = await admin
        .from("age_verifications")
        .upsert(
          { user_id: userData.user.id, is_18_plus: eligible, checked_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      if (saved.error)
        return { ok: false as const, message: "Age verification is temporarily unavailable." };
      if (!eligible) {
        await supabase.auth.signOut();
        return {
          ok: false as const,
          message: "Mingleza is only available to people aged 18 and over.",
        };
      }
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "Age verification is temporarily unavailable." };
    }
  });

export const setMyIntent = createServerFn({ method: "POST" })
  .validator(
    z
      .object({ friendsEnabled: z.boolean(), datingEnabled: z.boolean() })
      .refine((v) => v.friendsEnabled || v.datingEnabled),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user)
      return { ok: false as const, message: "Sign in to finish setting up your profile." };
    const age = await supabase
      .from("age_verifications")
      .select("is_18_plus")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (age.error || age.data?.is_18_plus !== true)
      return { ok: false as const, message: "Complete age verification before continuing." };
    const updated = await supabase
      .from("profiles")
      .update({
        friends_enabled: data.friendsEnabled,
        dating_enabled: data.datingEnabled,
      })
      .eq("id", userData.user.id);
    if (updated.error)
      return {
        ok: false as const,
        message: "We could not save your preferences. Please try again.",
      };
    return { ok: true as const };
  });

export const getMyAccess = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { authenticated: false, adultVerified: false };
    const age = await supabase
      .from("age_verifications")
      .select("is_18_plus")
      .eq("user_id", data.user.id)
      .maybeSingle();
    return { authenticated: true, adultVerified: age.data?.is_18_plus === true };
  } catch {
    return { authenticated: false, adultVerified: false };
  }
});

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  try {
    await (await getSupabaseServerClient()).auth.signOut();
  } catch {
    /* Do not log auth/session material. */
  }
  throw redirect({ to: "/welcome", search: { authComplete: false } });
});
