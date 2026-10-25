import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const supportRequestSchema = z.object({
  category: z.enum(["account", "privacy", "technical", "safety", "other"]),
  subject: z.string().trim().min(3).max(120),
  details: z.string().trim().min(10).max(4000),
});

export const submitSupportRequest = createServerFn({ method: "POST" })
  .validator(supportRequestSchema)
  .handler(async ({ data }) => {
    try {
      const supabase = getSupabaseServerClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        return { ok: false as const, message: "Sign in to send a support request." };
      }
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from("support_requests")
        .select("id", { count: "exact", head: true })
        .eq("requester_id", auth.user.id)
        .gte("created_at", since);
      if (countError) {
        return { ok: false as const, message: "Support intake is temporarily unavailable." };
      }
      if ((count ?? 0) >= 5) {
        return {
          ok: false as const,
          message: "You have reached the support request limit for this hour. Please try later.",
        };
      }
      const { data: request, error } = await supabase
        .from("support_requests")
        .insert({
          requester_id: auth.user.id,
          category: data.category,
          subject: data.subject,
          details: data.details,
        })
        .select("id, category, subject, status, created_at")
        .single();
      if (error || !request) {
        return {
          ok: false as const,
          message: "Your support request could not be saved. Please retry.",
        };
      }
      return { ok: true as const, request };
    } catch {
      return { ok: false as const, message: "Support intake is temporarily unavailable." };
    }
  });

export const listMySupportRequests = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = getSupabaseServerClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return { ok: false as const, message: "Sign in to view your support requests." };
    }
    const { data, error } = await supabase
      .from("support_requests")
      .select("id, category, subject, status, created_at, reviewed_at")
      .eq("requester_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false as const, message: "Your support requests could not be loaded." };
    return { ok: true as const, requests: data ?? [] };
  } catch {
    return { ok: false as const, message: "Your support requests could not be loaded." };
  }
});
