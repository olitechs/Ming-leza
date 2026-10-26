import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";
import { isAtLeast18 } from "./age";
import { getSupabaseAdminClient } from "../supabase/admin.server";
import { getSupabaseServerClient } from "../supabase/server";

export const ageBrackets = [
  "under-13",
  "13-17",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65-plus",
] as const;

const ageBracketSchema = z.enum(ageBrackets);
const adultAgeBrackets = new Set<string>(["18-24", "25-34", "35-44", "45-54", "55-64", "65-plus"]);

function getSiteUrl() {
  const requestOrigin = new URL(getRequest().url).origin;
  if (process.env["VERCEL_ENV"] === "preview") return requestOrigin;
  const configured = process.env["SITE_URL"]?.trim();
  return configured ? configured.replace(/\/+$/, "") : requestOrigin;
}

function eligibilitySecret() {
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("Server auth configuration is missing.");
  return secret;
}

type EligibilityClaims = { version: 1; ageBracket: string; expiresAt: number; nonce: string };

function signEligibilityClaims(claims: EligibilityClaims) {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", eligibilitySecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyEligibilityToken(token: string, ageBracket: string) {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;
    const expected = createHmac("sha256", eligibilitySecret()).update(payload).digest();
    const received = Buffer.from(signature, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as EligibilityClaims;
    return (
      claims.version === 1 &&
      claims.ageBracket === ageBracket &&
      adultAgeBrackets.has(claims.ageBracket) &&
      Number.isFinite(claims.expiresAt) &&
      claims.expiresAt > Date.now() &&
      typeof claims.nonce === "string" &&
      claims.nonce.length >= 16
    );
  } catch {
    return false;
  }
}

const ageCheckInput = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ageBracket: ageBracketSchema,
});

/** Check adulthood before the registration form submits any identity/contact details. DOB is discarded. */
export const checkSignupEligibility = createServerFn({ method: "POST" })
  .validator(ageCheckInput)
  .handler(async ({ data }) => {
    if (!adultAgeBrackets.has(data.ageBracket) || !isAtLeast18(data.dateOfBirth)) {
      return {
        ok: false as const,
        message: "Mingleza is only available to people aged 18 and over.",
      };
    }
    try {
      const eligibilityToken = signEligibilityClaims({
        version: 1,
        ageBracket: data.ageBracket,
        expiresAt: Date.now() + 10 * 60 * 1000,
        nonce: randomUUID(),
      });
      return { ok: true as const, eligibilityToken };
    } catch {
      return { ok: false as const, message: "Registration is temporarily unavailable." };
    }
  });

export const getSignupCountries = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await getSupabaseServerClient()
      .from("supported_countries")
      .select("code,name")
      .eq("is_active", true)
      .order("name");
    if (error) return { ok: false as const, countries: [] };
    return { ok: true as const, countries: data ?? [] };
  } catch {
    return { ok: false as const, countries: [] };
  }
});

export const signupInput = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    password: z.string().min(6).max(128),
    confirmPassword: z.string().min(6).max(128),
    phoneE164: z
      .string()
      .trim()
      .min(8)
      .max(16)
      .regex(/^\+[1-9]\d{7,14}$/),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/),
    ageBracket: ageBracketSchema,
    eligibilityToken: z.string().min(20).max(2048),
  })
  .refine((value) => adultAgeBrackets.has(value.ageBracket), {
    message: "Mingleza is only available to people aged 18 and over.",
    path: ["ageBracket"],
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

export const signUpWithPassword = createServerFn({ method: "POST" })
  .validator(signupInput)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!verifyEligibilityToken(data.eligibilityToken, data.ageBracket)) {
      return {
        ok: false as const,
        message: "Your age check expired. Confirm that you are 18 or older and try again.",
      };
    }
    const parsedPhone = parsePhoneNumberFromString(data.phoneE164);
    if (
      !parsedPhone ||
      !parsedPhone.isValid() ||
      parsedPhone.number !== data.phoneE164 ||
      parsedPhone.country !== data.countryCode
    ) {
      return {
        ok: false as const,
        message: "Enter a valid phone number for the selected country.",
      };
    }

    try {
      const supabase = getSupabaseServerClient();
      const { data: country, error: countryError } = await supabase
        .from("supported_countries")
        .select("code")
        .eq("code", data.countryCode)
        .eq("is_active", true)
        .maybeSingle();
      if (countryError || !country) {
        return { ok: false as const, message: "Choose a country where Mingleza is available." };
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: { emailRedirectTo: `${getSiteUrl()}/auth-callback?flow=signup` },
      });
      if (authError || !authData.user) {
        return {
          ok: false as const,
          message: "We could not create your account. Check your details and try again.",
        };
      }
      // Supabase may return a user with no identities for an existing email when enumeration
      // protection is enabled. Do not modify that member's account or profile.
      if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        return { ok: true as const, needsEmailConfirmation: true };
      }

      const admin = getSupabaseAdminClient();
      const [profileResult, ageResult, detailsResult] = await Promise.all([
        admin.from("profiles").upsert(
          {
            id: authData.user.id,
            display_name: "New member",
            country_code: data.countryCode,
            friends_enabled: true,
            dating_enabled: false,
            is_discoverable: false,
          },
          { onConflict: "id", ignoreDuplicates: true },
        ),
        admin
          .from("age_verifications")
          .upsert(
            { user_id: authData.user.id, is_18_plus: true, checked_at: new Date().toISOString() },
            { onConflict: "user_id" },
          ),
        admin.from("member_account_details").insert({
          user_id: authData.user.id,
          full_name: data.fullName.trim(),
          phone_e164: parsedPhone.number,
          age_bracket: data.ageBracket,
        }),
      ]);
      if (profileResult.error || ageResult.error || detailsResult.error) {
        return {
          ok: false as const,
          message:
            "Your account was created but setup could not finish. Please contact support before retrying.",
        };
      }
      return { ok: true as const, needsEmailConfirmation: !authData.session };
    } catch {
      return {
        ok: false as const,
        message: "Registration is temporarily unavailable. Please try again.",
      };
    }
  });

export const signInInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const signInWithPassword = createServerFn({ method: "POST" })
  .validator(signInInput)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      if (error || !authData.user) {
        return { ok: false as const, message: "Email or password is incorrect. Please try again." };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: "Sign-in is temporarily unavailable. Please try again.",
      };
    }
  });

const resetRequestInput = z.object({ email: z.string().trim().email().max(254) });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(resetRequestInput)
  .handler(async ({ data }) => {
    const safeMessage =
      "If an account can be recovered with that address, password-reset instructions will be sent.";
    try {
      const { error } = await getSupabaseServerClient().auth.resetPasswordForEmail(
        data.email.trim().toLowerCase(),
        { redirectTo: `${getSiteUrl()}/auth-callback?flow=recovery` },
      );
      // Keep the same response for unknown accounts, provider rate limits, and delivery failures.
      if (error) return { ok: true as const, message: safeMessage };
      return { ok: true as const, message: safeMessage };
    } catch {
      return { ok: true as const, message: safeMessage };
    }
  });

const passwordUpdateInput = z.object({ password: z.string().min(6).max(128) });

export const updatePassword = createServerFn({ method: "POST" })
  .validator(passwordUpdateInput)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        return {
          ok: false as const,
          message: "This reset session is invalid or expired. Request a new reset email.",
        };
      }
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error)
        return {
          ok: false as const,
          message: "We could not update your password. Please try again.",
        };
      // Keep the current reset session usable while revoking other sessions for this account.
      await supabase.auth.signOut({ scope: "others" });
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        message: "We could not update your password. Please try again.",
      };
    }
  });

const callbackInput = z.object({
  code: z.string().trim().min(1).max(4096).optional(),
  tokenHash: z.string().trim().min(1).max(4096).optional(),
  type: z.enum(["signup", "recovery"]).optional(),
  flow: z.enum(["signup", "recovery", "upgrade"]).optional(),
});

export const completeAuthCallback = createServerFn({ method: "POST" })
  .validator(callbackInput)
  .handler(async ({ data }) => {
    if (
      (data.code && data.flow !== "signup" && data.flow !== "recovery") ||
      (!data.code && !(data.tokenHash && data.type && data.flow)) ||
      (data.type === "recovery" && data.flow !== "recovery") ||
      (data.type === "signup" && data.flow !== "signup")
    ) {
      return { ok: false as const, message: "This confirmation link is invalid or expired." };
    }
    try {
      const supabase = getSupabaseServerClient();
      const result = data.code
        ? await supabase.auth.exchangeCodeForSession(data.code)
        : await supabase.auth.verifyOtp({ token_hash: data.tokenHash!, type: data.type! });
      if (result.error || !result.data.user) {
        return {
          ok: false as const,
          message: "This confirmation link is invalid, expired, or already used.",
        };
      }
      const reset = data.flow === "recovery" || data.type === "recovery";
      return { ok: true as const, next: reset ? ("reset-password" as const) : ("app" as const) };
    } catch {
      return {
        ok: false as const,
        message: "We could not complete this confirmation. Request a fresh email and try again.",
      };
    }
  });
