import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyAccess } from "@/lib/auth/server";
import { getGiftRedemptionAdminQueue, resolveGiftRedemption } from "@/lib/gifts/server";

export const Route = createFileRoute("/gifts/admin")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/welcome", search: { authComplete: false, authError: "" } });
  },
  head: () => ({ meta: [{ title: "Gift redemptions · Mingleza" }] }),
  component: GiftAdminPage,
});

type Redemption = {
  id: string;
  userId: string;
  diamonds: number;
  payoutAmountKes: number;
  payoutMethod: "paypal" | "gift_card";
  paypalEmail: string | null;
  giftCardBrand: string | null;
  deliveryEmail: string | null;
  status: string;
  createdAt: string;
  adminNote: string | null;
};

function GiftAdminPage() {
  const [rows, setRows] = useState<Redemption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const refresh = async () => {
    const result = await getGiftRedemptionAdminQueue();
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setIsAdmin(result.isAdmin);
    setRows(result.redemptions);
  };
  useEffect(() => {
    let active = true;
    void getGiftRedemptionAdminQueue()
      .then((result) => {
        if (!active) return;
        if (!result.ok) setError(result.message);
        else {
          setIsAdmin(result.isAdmin);
          setRows(result.redemptions);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError("The redemption queue could not be loaded.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const resolve = async (redemptionId: string, action: "approve" | "reject" | "paid") => {
    if (
      action === "paid" &&
      !window.confirm(
        "Confirm that you have manually fulfilled this PayPal or gift-card request outside Mingleza and want to mark it paid?",
      )
    )
      return;
    if (action === "reject" && !window.confirm("Reject this redemption request?")) return;
    setError("");
    setNotice("");
    setBusy(redemptionId);
    try {
      const result = await resolveGiftRedemption({
        data: { redemptionId, action, note: (notes[redemptionId] || "").trim() },
      });
      if (!result.ok) setError(result.message);
      else {
        setNotice(`Redemption ${action === "paid" ? "marked paid" : `${action}d`}.`);
        await refresh();
      }
    } catch {
      setError("That action could not be completed.");
    } finally {
      setBusy("");
    }
  };
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        <Link
          to="/gifts"
          search={{ transactionId: "", txRef: "", paymentStatus: "", to: "" }}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to Gifts
        </Link>
        <header className="rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-7" />
            <h1 className="text-3xl font-extrabold">Gift redemption queue</h1>
          </div>
          <p className="mt-2 text-sm opacity-90">
            Private admin view. Fulfill approved payouts manually outside the app before marking
            them paid.
          </p>
        </header>
        {loading ? (
          <p role="status" className="flex items-center gap-2 py-10 text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" />
            Loading requests…
          </p>
        ) : !isAdmin ? (
          <section className="mt-6 rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-bold">No access</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This queue is available to authorized administrators only.
            </p>
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            {rows.length === 0 ? (
              <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                No redemption requests.
              </p>
            ) : (
              rows.map((row) => {
                const state = row.status.toLowerCase();
                return (
                  <article key={row.id} className="rounded-2xl border bg-card p-5 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold">
                          {row.diamonds.toLocaleString()} diamonds · KES{" "}
                          {row.payoutAmountKes.toFixed(2)}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {row.payoutMethod === "paypal" ? "PayPal" : "Gift card"} · {state} ·{" "}
                          {new Date(row.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                        {row.status}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold">Member ID</dt>
                        <dd className="break-all text-muted-foreground">{row.userId}</dd>
                      </div>
                      {row.payoutMethod === "paypal" ? (
                        <div>
                          <dt className="font-semibold">PayPal destination</dt>
                          <dd className="break-all text-muted-foreground">
                            {row.paypalEmail || "Not provided"}
                          </dd>
                        </div>
                      ) : (
                        <>
                          <div>
                            <dt className="font-semibold">Gift-card brand</dt>
                            <dd className="text-muted-foreground">
                              {row.giftCardBrand || "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Delivery email</dt>
                            <dd className="break-all text-muted-foreground">
                              {row.deliveryEmail || "Not provided"}
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>
                    {row.adminNote && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Previous note: {row.adminNote}
                      </p>
                    )}
                    <label className="mt-4 block text-sm font-semibold">
                      Admin note (optional)
                      <input
                        className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                        maxLength={300}
                        value={notes[row.id] ?? ""}
                        onChange={(e) =>
                          setNotes((current) => ({ ...current, [row.id]: e.target.value }))
                        }
                        placeholder="Short internal note"
                      />
                    </label>
                    {(state === "pending" || state === "approved") && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {state === "pending" && (
                          <button
                            type="button"
                            className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                            disabled={Boolean(busy)}
                            onClick={() => void resolve(row.id, "approve")}
                          >
                            {busy === row.id ? "Saving…" : "Approve"}
                          </button>
                        )}
                        {state === "approved" && (
                          <button
                            type="button"
                            className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                            disabled={Boolean(busy)}
                            onClick={() => void resolve(row.id, "paid")}
                          >
                            {busy === row.id ? "Saving…" : "Mark paid"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="min-h-11 rounded-full border border-destructive/50 px-4 text-sm font-semibold text-destructive-text disabled:opacity-50"
                          disabled={Boolean(busy)}
                          onClick={() => void resolve(row.id, "reject")}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        )}
        {notice && (
          <p role="status" className="mt-5 rounded-xl bg-primary/10 p-4 text-sm">
            {notice}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive-text"
          >
            {error}
          </p>
        )}
      </div>
    </AppShell>
  );
}
