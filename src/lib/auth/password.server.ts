import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "../supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
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
