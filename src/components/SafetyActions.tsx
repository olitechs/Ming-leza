import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Ban, Flag, ShieldCheck } from "lucide-react";
import {
  blockMember,
  getMemberBlockStatus,
  reportMember,
  unblockMember,
} from "@/lib/social/server";
import { Button } from "@/components/brand";

type ReportReason = "spam" | "harassment" | "underage" | "impersonation" | "other";

export function SafetyActions({ userId, displayName }: { userId: string; displayName: string }) {
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState<ReportReason>("other");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void getMemberBlockStatus({ data: { userId } })
      .then((result) => {
        if (!active) return;
        if (result.ok) setBlocked(result.blocked);
        else setError(result.message);
      })
      .catch(() => {
        if (active) setError("Safety controls are temporarily unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const toggleBlock = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = blocked
        ? await unblockMember({ data: { userId } })
        : await blockMember({ data: { userId } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setBlocked(!blocked);
      setNotice(
        blocked
          ? `You have unblocked ${displayName}. They may become visible again if eligible for discovery.`
          : `You blocked ${displayName}. Their profile will no longer appear in discovery, and messaging is restricted.`,
      );
    } catch {
      setError("We could not update this block. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await reportMember({ data: { userId, reason, details } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setShowReport(false);
      setDetails("");
      setReason("other");
      setNotice("Report submitted privately. It is recorded for moderator review.");
    } catch {
      setError("We could not submit your report. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label={`Safety actions for ${displayName}`} className="mt-4 border-t pt-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full"
          disabled={loading || busy}
          onClick={() => void toggleBlock()}
        >
          <Ban aria-hidden="true" className="size-4" />
          {loading ? "Loading…" : blocked ? "Unblock member" : "Block member"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full"
          disabled={busy}
          onClick={() => setShowReport((current) => !current)}
        >
          <Flag aria-hidden="true" className="size-4" />
          Report profile
        </Button>
      </div>

      {blocked && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-secondary p-3 text-sm">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          This member is blocked. You can unblock them here.
        </p>
      )}

      {showReport && (
        <form
          onSubmit={(event) => void submitReport(event)}
          className="mt-4 space-y-3 rounded-2xl border p-4"
        >
          <div>
            <label htmlFor={`report-reason-${userId}`} className="text-sm font-semibold">
              Why are you reporting this profile?
            </label>
            <select
              id={`report-reason-${userId}`}
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
              className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3 text-sm"
            >
              <option value="spam">Spam or scams</option>
              <option value="harassment">Harassment or abusive behaviour</option>
              <option value="underage">Possible underage user</option>
              <option value="impersonation">Impersonation or fake identity</option>
              <option value="other">Something else</option>
            </select>
          </div>
          <div>
            <label htmlFor={`report-details-${userId}`} className="text-sm font-semibold">
              Additional details (optional)
            </label>
            <textarea
              id={`report-details-${userId}`}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Share details that may help review this report."
              className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">{details.length}/2000</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="min-h-11 rounded-full" disabled={busy}>
              <Flag aria-hidden="true" className="size-4" />
              {busy ? "Submitting…" : "Submit report"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-full"
              onClick={() => setShowReport(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 flex gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive-text"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 rounded-xl bg-success/10 p-3 text-sm text-success-text">
          {notice}
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Reports are stored for moderator review. If you are in immediate danger, contact local
        emergency services.
      </p>
    </section>
  );
}
