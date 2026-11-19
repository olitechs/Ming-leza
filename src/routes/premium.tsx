import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Crown, LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyAccess } from "@/lib/auth/server";
import {
  cancelMyCardRenewal,
  getMyPremiumStatus,
  startPremiumCheckout,
  verifyMyPremiumPayment,
  type PremiumBillingMethod,
  type PremiumTier,
} from "@/lib/premium/server";

export const Route = createFileRoute("/premium")({
  validateSearch: (search: Record<string, unknown>) => ({
    transactionId: typeof search["transaction_id"] === "string" ? search["transaction_id"] : "",
    txRef: typeof search["tx_ref"] === "string" ? search["tx_ref"] : "",
    paymentStatus: typeof search["status"] === "string" ? search["status"] : "",
    checkout: search["checkout"] === "return" ? "return" : "",
  }),
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified) {
      throw redirect({ to: "/welcome", search: { authComplete: false, authError: "" } });
    }
  },
  head: () => ({ meta: [{ title: "Premium · Mingleza" }] }),
  component: PremiumPage,
});

type Status = {
  tier: PremiumTier | null;
  billingMethod: PremiumBillingMethod | null;
  status: string | null;
  currentPeriodEnd: string | null;
  phoneVisibilityOptIn: boolean;
  cardCheckoutReady: boolean;
  mpesaCheckoutReady: boolean;
};

function PremiumPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    const result = await getMyPremiumStatus();
    if (result.ok) {
      setStatus({
        tier: result.tier,
        billingMethod: result.billingMethod,
        status: result.status,
        currentPeriodEnd: result.currentPeriodEnd,
        phoneVisibilityOptIn: result.phoneVisibilityOptIn,
        cardCheckoutReady: result.cardCheckoutReady,
        mpesaCheckoutReady: result.mpesaCheckoutReady,
      });
    } else setError(result.message);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    void getMyPremiumStatus().then((result) => {
      if (!active) return;
      if (result.ok) {
        setStatus({
          tier: result.tier,
          billingMethod: result.billingMethod,
          status: result.status,
          currentPeriodEnd: result.currentPeriodEnd,
          phoneVisibilityOptIn: result.phoneVisibilityOptIn,
          cardCheckoutReady: result.cardCheckoutReady,
          mpesaCheckoutReady: result.mpesaCheckoutReady,
        });
      } else setError(result.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!search.transactionId || !search.txRef) return;
    let active = true;
    if (search.paymentStatus.toLowerCase() !== "successful") {
      setNotice("The payment did not complete. No membership access was added.");
      void navigate({
        to: "/premium",
        search: { transactionId: "", txRef: "", paymentStatus: "", checkout: "" },
        replace: true,
      });
      return;
    }
    setBusy("verify");
    void verifyMyPremiumPayment({
      data: { transactionId: search.transactionId, txRef: search.txRef },
    })
      .then(async (result) => {
        if (!active) return;
        if (result.ok && result.active) setNotice("Payment confirmed. Your membership is active.");
        else
          setNotice(
            "Payment is processing. We’ll update your membership after the provider confirms it.",
          );
        await refresh();
      })
      .catch(() => {
        if (active)
          setError("Payment confirmation is still processing. Refresh this page shortly.");
      })
      .finally(() => {
        if (active) {
          setBusy("");
          void navigate({
            to: "/premium",
            search: { transactionId: "", txRef: "", paymentStatus: "", checkout: "" },
            replace: true,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [search.transactionId, search.txRef, search.paymentStatus, navigate]);

  const checkout = async (tier: PremiumTier, billingMethod: PremiumBillingMethod) => {
    setError("");
    setNotice("");
    setBusy(`${tier}-${billingMethod}`);
    try {
      const result = await startPremiumCheckout({ data: { tier, billingMethod } });
      if (!result.ok) setError(result.message);
      else window.location.assign(result.checkoutUrl);
    } catch {
      setError("Checkout could not be started. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const cancelRenewal = async () => {
    if (
      !window.confirm(
        "Cancel automatic card renewal? Your paid access will remain until the current period ends.",
      )
    )
      return;
    setError("");
    setBusy("cancel");
    try {
      const result = await cancelMyCardRenewal();
      if (!result.ok) setError(result.message);
      else {
        setNotice("Automatic renewal canceled. Your access remains through the paid period.");
        await refresh();
      }
    } catch {
      setError("Renewal could not be canceled. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const active = Boolean(
    status?.tier && status.currentPeriodEnd && Date.parse(status.currentPeriodEnd) > Date.now(),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" /> Back to Discover
        </Link>
        <header className="rounded-3xl bg-primary p-6 text-primary-foreground sm:p-9">
          <div className="flex items-center gap-3">
            <Crown className="size-8" />
            <h1 className="text-3xl font-extrabold">Mingleza Premium</h1>
          </div>
          <p className="mt-3 max-w-2xl text-sm opacity-90">
            Choose Premium or VIP. Both tiers allow you to view numbers only when that member has
            explicitly opted in to sharing. Your own number stays private unless you turn sharing on
            in Edit profile.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" /> Checking membership…
          </div>
        ) : (
          <>
            {active && status && (
              <section className="mt-6 rounded-2xl border bg-success/10 p-5" role="status">
                <h2 className="font-bold">
                  {status.tier === "vip" ? "VIP" : "Premium"} membership active
                </h2>
                <p className="mt-1 text-sm">
                  Payment method:{" "}
                  {status.billingMethod === "mpesa"
                    ? "M-Pesa · renew manually each month"
                    : "Card · automatic monthly renewal"}
                  .
                </p>
                {status.currentPeriodEnd && (
                  <p className="mt-1 text-sm">
                    Current period ends {new Date(status.currentPeriodEnd).toLocaleDateString()}.
                  </p>
                )}
                {status.status === "cancelled" ? (
                  <p className="mt-2 text-sm font-semibold">
                    Renewal is canceled; access remains through the paid period.
                  </p>
                ) : (
                  status.billingMethod === "card" && (
                    <button
                      type="button"
                      onClick={() => void cancelRenewal()}
                      disabled={Boolean(busy)}
                      className="mt-4 min-h-11 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    >
                      {busy === "cancel" ? "Canceling renewal…" : "Cancel card renewal"}
                    </button>
                  )
                )}
              </section>
            )}
            {!active && (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {(["premium", "vip"] as const).map((tier) => {
                  const isVip = tier === "vip";
                  const label = isVip ? "VIP" : "Premium";
                  const amount = isVip ? 1000 : 200;
                  return (
                    <section key={tier} className="rounded-3xl border bg-card p-6 shadow-soft">
                      <p className="text-sm font-semibold text-primary">{label}</p>
                      <h2 className="mt-2 text-3xl font-extrabold">
                        KES {amount}
                        <span className="text-base font-medium text-muted-foreground">
                          {" "}
                          / month
                        </span>
                      </h2>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {isVip
                          ? "VIP tier with Premium phone-visibility access."
                          : "Premium access to member phone numbers shared by their owners."}{" "}
                        Phone visibility never overrides the owner's consent.
                      </p>
                      <div className="mt-6 space-y-3">
                        <button
                          type="button"
                          onClick={() => void checkout(tier, "card")}
                          disabled={Boolean(busy) || !status?.cardCheckoutReady}
                          className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                        >
                          {busy === `${tier}-card`
                            ? "Opening checkout…"
                            : "Pay by card · auto-renews monthly"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void checkout(tier, "mpesa")}
                          disabled={Boolean(busy) || !status?.mpesaCheckoutReady}
                          className="min-h-11 w-full rounded-full border px-4 py-3 text-sm font-semibold disabled:opacity-60"
                        >
                          {busy === `${tier}-mpesa`
                            ? "Opening checkout…"
                            : "Pay by M-Pesa · renew manually"}
                        </button>
                      </div>
                      {(!status?.cardCheckoutReady || !status?.mpesaCheckoutReady) && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Checkout is not available until the payment provider is configured.
                        </p>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}

        {notice && (
          <p role="status" className="mt-5 rounded-xl bg-success/10 p-4 text-sm text-success-text">
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
        {busy === "verify" && (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            Verifying with payment provider…
          </p>
        )}
        <p className="mt-8 text-xs text-muted-foreground">
          Both plans are billed monthly at the prices shown. Card plans renew automatically; M-Pesa
          requires a new payment each month. Canceled/expired membership access ends when the paid
          period ends. Phone sharing can be turned off by the profile owner at any time.
        </p>
      </div>
    </AppShell>
  );
}
