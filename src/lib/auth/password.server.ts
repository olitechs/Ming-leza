import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "../supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
});

const resetSchema = z.object({
  email: z.string().trim().email().max(254),
});

/** Authenticate an existing account with its email and password. */
export const signInWithPassword = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const { data: auth, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error || !auth.user) {
        return {
          ok: false as const,
          message: "Email or password is incorrect. Check your details and try again.",
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

/** Send Supabase's secure password-recovery email without revealing account existence. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(resetSchema)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const configured = process.env["SITE_URL"]?.trim();
      const origin = configured
        ? configured.replace(/\\/+$/, "")
        : new URL((await import("@tanstack/react-start/server")).getRequest().url).origin;
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${origin}/auth-callback?next=/login?mode=reset`,
      });
      if (error) {
        // Do not disclose whether an account exists.
      }
      return {
        ok: true as const,
        message: "If an account uses that email, a password reset link will be sent.",
      };
    } catch {
      return {
        ok: false as const,
        message: "We could not request a reset link right now. Please try again.",
      };
    }
  });
