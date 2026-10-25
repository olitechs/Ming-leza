import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const statusSchema = z.enum(["new", "reviewing", "actioned", "dismissed"]);
const supportStatusSchema = z.enum(["new", "reviewing", "resolved", "closed"]);
const updateSchema = z.object({
  reportId: z.string().uuid(),
  status: statusSchema,
  resolutionNote: z.string().trim().max(2000).default(""),
});
const updateSupportSchema = z.object({
  requestId: z.string().uuid(),
  status: supportStatusSchema,
  resolutionNote: z.string().trim().max(2000).default(""),
  responseMessage: z.string().trim().max(2000).default(""),
});

async function getModerator() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const role = data.user.app_metadata?.["role"];
  if (role !== "moderator" && role !== "admin") return null;
  return data.user;
}

/** Uses the service client only after validating a trusted server-managed app_metadata role. */
export const getModerationQueue = createServerFn({ method: "GET" }).handler(async () => {
  const moderator = await getModerator();
  if (!moderator) return { ok: false as const, reason: "unauthorized" as const };
  try {
    const admin = getSupabaseAdminClient();
    const [reportResult, supportResult] = await Promise.all([
      admin
        .from("moderation_reports")
        .select(
          "id, reporter_id, reported_user_id, message_id, reason, details, status, created_at, reviewed_at, reviewed_by, resolution_note",
        )
        .order("created_at", { ascending: true })
        .limit(100),
      admin
        .from("support_requests")
        .select(
          "id, requester_id, category, subject, details, status, created_at, reviewed_at, reviewed_by, resolution_note, response_message",
        )
        .order("created_at", { ascending: true })
        .limit(100),
    ]);
    if (reportResult.error || supportResult.error) {
      return { ok: false as const, reason: "unavailable" as const };
    }
    const reports = reportResult.data ?? [];
    const supportRequests = supportResult.data ?? [];
    const userIds = [
      ...new Set([
        ...reports.flatMap((report) =>
          [report.reporter_id, report.reported_user_id].filter((id): id is string => Boolean(id)),
        ),
        ...supportRequests.map((request) => request.requester_id),
      ]),
    ];
    const { data: profiles, error: profilesError } = userIds.length
      ? await admin.from("profiles").select("id, display_name, city").in("id", userIds)
      : { data: [], error: null };
    if (profilesError) return { ok: false as const, reason: "unavailable" as const };
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return {
      ok: true as const,
      reports: reports.map((report) => ({
        ...report,
        reporter: profileMap.get(report.reporter_id) ?? null,
        reported: report.reported_user_id
          ? (profileMap.get(report.reported_user_id) ?? null)
          : null,
      })),
      supportRequests: supportRequests.map((request) => ({
        ...request,
        requester: profileMap.get(request.requester_id) ?? null,
      })),
    };
  } catch {
    return { ok: false as const, reason: "unavailable" as const };
  }
});

export const updateModerationReport = createServerFn({ method: "POST" })
  .validator(updateSchema)
  .handler(async ({ data }) => {
    const moderator = await getModerator();
    if (!moderator) return { ok: false as const, message: "Moderator access is required." };
    try {
      const admin = getSupabaseAdminClient();
      const { error } = await admin
        .from("moderation_reports")
        .update({
          status: data.status,
          resolution_note: data.resolutionNote || null,
          reviewed_by: moderator.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", data.reportId);
      if (error) return { ok: false as const, message: "The report could not be updated." };
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "The moderation service is unavailable." };
    }
  });

export const updateSupportRequest = createServerFn({ method: "POST" })
  .validator(updateSupportSchema)
  .handler(async ({ data }) => {
    const moderator = await getModerator();
    if (!moderator) return { ok: false as const, message: "Moderator access is required." };
    try {
      const admin = getSupabaseAdminClient();
      const { error } = await admin
        .from("support_requests")
        .update({
          status: data.status,
          resolution_note: data.resolutionNote || null,
          response_message: data.responseMessage || null,
          reviewed_by: moderator.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", data.requestId);
      if (error) {
        return {
          ok: false as const,
          message: "The support request could not be updated.",
        };
      }
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "The support queue is unavailable." };
    }
  });
