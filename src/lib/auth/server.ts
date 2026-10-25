import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
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

/**
 * Public site origin used for emailed sign-in links. Prefer the SITE_URL setting; otherwise
 * use the origin of the current request so local, preview and production all work.
 */
function getSiteUrl() {
  const configured = process.env["SITE_URL"]?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(getRequest().url).origin;
}

export const sendOtp = createServerFn({ method: "POST" })
  .validator(otpRequestSchema)
  .handler(async () => ({
    ok: false as const,
    message: "Passwordless sign-in is no longer supported. Use your email and password.",
  }));

export const verifyOtp = createServerFn({ method: "POST" })
  .validator(otpVerifySchema)
  .handler(async () => ({
    ok: false as const,
    message: "Passwordless sign-in is no longer supported. Use your email and password.",
  }));

const magicLinkSchema = z.union([
  z.object({ code: z.string().trim().min(1).max(4096) }),
  z.object({
    tokenHash: z.string().trim().min(1).max(4096),
    type: z.enum(["email", "signup", "recovery"]),
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
          display_name: String(authData.user.user_metadata?.full_name ?? "New member").slice(0, 60),
          friends_enabled: true,
          dating_enabled: false,
          is_discoverable: false,
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
    const profile = await supabase
      .from("profiles")
      .select("display_name,city")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (
      profile.error ||
      !profile.data ||
      !profile.data.display_name.trim() ||
      profile.data.display_name.trim().toLowerCase() === "new member" ||
      !profile.data.city?.trim()
    ) {
      return { ok: false as const, message: "Complete your profile before choosing an intent." };
    }
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
  throw redirect({ to: "/welcome", search: { authComplete: false, authError: "" } });
});

const passwordSignUpSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(6).max(128),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^\\+?[0-9 ()-]{7,20}$/),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((value) => value.toUpperCase()),
  ageBracket: z.enum(["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]),
});

const passwordSignInSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

const passwordResetSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
});

/** Create an account with password credentials; metadata is kept in Supabase Auth. */
export const signUpWithPassword = createServerFn({ method: "POST" })
  .validator(passwordSignUpSchema)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${getSiteUrl()}/auth-callback?flow=signup`,
          data: {
            full_name: data.fullName,
            phone_number: data.phone,
            country_code: data.countryCode,
            age_bracket: data.ageBracket,
          },
        },
      });
      if (result.error) {
        return {
          ok: false as const,
          message:
            "We could not create your account. Check your details or sign in if you already have an account.",
        };
      }
      if (result.data.session && result.data.user) {
        const profile = await supabase.from("profiles").upsert(
          {
            id: result.data.user.id,
            display_name: data.fullName,
            friends_enabled: true,
            dating_enabled: false,
            is_discoverable: false,
          },
          { onConflict: "id", ignoreDuplicates: true },
        );
        if (profile.error) {
          return {
            ok: false as const,
            message:
              "Your account was created, but setup could not finish. Please sign in and retry.",
          };
        }
      }
      return {
        ok: true as const,
        requiresEmailConfirmation: !result.data.session,
      };
    } catch {
      return {
        ok: false as const,
        message: "Authentication is temporarily unavailable. Please try again later.",
      };
    }
  });

/** Authenticate an existing account with email and password. */
export const signInWithPassword = createServerFn({ method: "POST" })
  .validator(passwordSignInSchema)
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
          message:
            "Email or password is incorrect. If you have an older passwordless account, reset your password first.",
        };
      }
      const profile = await supabase.from("profiles").upsert(
        {
          id: result.data.user.id,
          display_name: String(result.data.user.user_metadata?.full_name ?? "New member").slice(
            0,
            60,
          ),
          friends_enabled: true,
          dating_enabled: false,
          is_discoverable: false,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (profile.error) {
        return {
          ok: false as const,
          message: "You are signed in, but account setup could not finish. Please retry.",
        };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: "Authentication is temporarily unavailable. Please try again later.",
      };
    }
  });

/** Send a password-reset email; use a neutral response to avoid account enumeration. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(passwordResetSchema)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${getSiteUrl()}/auth-callback?next=reset-password`,
      });
      if (error) {
        return {
          ok: false as const,
          message: "We could not send a reset email right now. Please try again later.",
        };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: "We could not send a reset email right now. Please try again later.",
      };
    }
  });

/** Complete password recovery after Supabase establishes a recovery session. */
export const updateMyPassword = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(6).max(128) }))
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return {
          ok: false as const,
          message: "Your reset session is invalid or expired. Request another reset email.",
        };
      }
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error)
        return {
          ok: false as const,
          message: "Password could not be updated. Please request a new reset email.",
        };
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "Password could not be updated. Please try again." };
    }
  });
