import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, PageHeader } from "@/components/brand";
import { getMyAccess } from "@/lib/auth/server";
import { getModerationQueue, updateModerationReport } from "@/lib/moderation/server";

export const Route = createFileRoute("/moderation")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated) throw redirect({ to: "/login", search: { mode: "signin" } });
  },
  head: () => ({
    meta: [
      { title: "Moderation queue · Mingleza" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ModerationPage,
});

type QueueReport = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  message_id: string | null;
  reason: string;
  details: string | null;
  status: "new" | "reviewing" | "actioned" | "dismissed";
  created_at: string;
  reviewed_at: string | null;
  resolution_note: string | null;
  reporter: { display_name: string; city: string | null } | null;
  reported: { display_name: string; city: string | null } | null;
};

function ModerationPage() {
  const [reports, setReports] = useState<QueueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getModerationQueue();
      if (!result.ok) {
        setAuthorized(false);
        setError(
          result.reason === "unauthorized"
            ? "This page is restricted to moderators. A trusted moderator role must be assigned by an administrator."
            : "The moderation queue is temporarily unavailable.",
        );
        setReports([]);
      } else {
        setAuthorized(true);
        setReports(result.reports as QueueReport[]);
        setNotes(Object.fromEntries(result.reports.map((report) => [report.id, report.resolution_note ?? ""])));
      }
    } catch {
      setError("The moderation queue is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const update = async (report: QueueReport, status: QueueReport["status"]) => {
    setBusyId(report.id);
    setError("");
    try {
      const result = await updateModerationReport({
        data: { reportId: report.id, status, resolutionNote: notes[report.id] ?? "" },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await load();
    } catch {
      setError("The report could not be updated. Please retry.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-7 lg:px-8 lg:py-10">
        <PageHeader
          title="Moderation queue"
          description="Restricted report intake for trusted moderators. Handle reports confidentially and follow the approved safety escalation policy."
        />
        {!authorized && !loading && (
          <div role="status" className="mt-6 rounded-2xl border p-5">
            <ShieldCheck className="size-6 text-primary" />
            <p className="mt-3 font-bold">Moderator access required</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              No moderator accounts are configured by this code change. Assign the trusted role in Supabase Auth app_metadata through an authorized admin process before operating the queue.
            </p>
          </div>
        )}
        {authorized && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border bg-secondary/40 p-4 text-sm leading-6">
              <p className="font-bold">Operational note</p>
              <p className="mt-1 text-muted-foreground">
                This queue stores and tracks reports; it does not by itself create a staffed service, response-time guarantee, or emergency escalation channel.
              </p>
            </div>
            {reports.length === 0 && !loading ? (
              <div className="rounded-3xl border-2 border-dashed p-10 text-center text-muted-foreground">No reports in the queue.</div>
            ) : reports.map((report) => (
              <article key={report.id} className="rounded-3xl border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">{report.reason.replace("_", " ")}</p>
                    <h2 className="mt-1 text-lg font-bold">{report.reported?.display_name ?? "Unavailable member"}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Reported by {report.reporter?.display_name ?? "Unavailable member"} · {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-xs font-bold">{report.status}</span>
                </div>
                {report.details && <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{report.details}</p>}
                <div className="mt-4">
                  <label htmlFor={`moderation-note-${report.id}`} className="text-sm font-semibold">Internal resolution note</label>
                  <textarea
                    id={`moderation-note-${report.id}`}
                    value={notes[report.id] ?? ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                    maxLength={2000}
                    rows={2}
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                    placeholder="Record action taken or reason for dismissal."
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["new", "reviewing", "actioned", "dismissed"] as const).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant={status === report.status ? "default" : "outline"}
                      className="min-h-10 rounded-full"
                      disabled={busyId === report.id || status === report.status}
                      onClick={() => void update(report, status)}
                    >
                      {busyId === report.id ? "Saving…" : status}
                    </Button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
        {error && authorized && (
          <p role="alert" className="mt-5 flex gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive-text">
            <AlertTriangle className="size-4 shrink-0" /> {error}
          </p>
        )}
        {loading && <p role="status" className="mt-6 text-sm text-muted-foreground">Loading moderation queue…</p>}
        <div className="mt-5">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void load()} disabled={loading}>Refresh queue</Button>
        </div>
      </div>
    </AppShell>
  );
}
