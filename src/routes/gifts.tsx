import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Coins, Gift, LoaderCircle, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyAccess } from "@/lib/auth/server";
import { getVisibleProfile } from "@/lib/profile/server";
import {
  getGiftDiamondPurchaseCostKes,
  getGiftDiamondRedemptionValueKes,
  GIFT_DIAMOND_MAX_PURCHASE,
  GIFT_DIAMOND_REDEMPTION_KES,
  GIFT_DIAMOND_REDEMPTION_MINIMUM,
} from "@/lib/gifts/rules";
import {
  cancelGiftRedemption as cancelGiftDiamondRedemption,
  getMyGiftWallet,
  requestGiftRedemption as requestGiftDiamondRedemption,
  sendMemberGift,
  startGiftDiamondCheckout,
  verifyMyGiftDiamondPayment,
} from "@/lib/gifts/server";

export const Route = createFileRoute("/gifts")({
  validateSearch: (search: Record<string, unknown>) => ({
    transactionId: typeof search["transaction_id"] === "string" ? search["transaction_id"] : "",
    txRef: typeof search["tx_ref"] === "string" ? search["tx_ref"] : "",
    paymentStatus: typeof search["status"] === "string" ? search["status"] : "",
    to: typeof search["to"] === "string" ? search["to"] : "",
  }),
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/welcome", search: { authComplete: false, authError: "" } });
  },
  head: () => ({ meta: [{ title: "Gifts · Mingleza" }] }),
  component: GiftsPage,
});

type GiftWallet = {
  balanceDiamonds: number;
  catalog: { id: string; name: string; icon: string; diamondPrice: number }[];
  ledger: {
    id: string;
    entryType: string;
    deltaDiamonds: number;
    balanceAfter: number;
    createdAt: string;
  }[];
  giftTransfers: {
    id: string;
    giftName: string;
    giftIcon: string;
    diamonds: number;
    sentByMe: boolean;
    senderName: string;
    recipientName: string;
    createdAt: string;
  }[];
  redemptions: {
    id: string;
    diamonds: number;
    payoutAmountKes: number;
    payoutMethod: "paypal" | "gift_card";
    paypalEmail: string | null;
    giftCardBrand: string | null;
    deliveryEmail: string | null;
    status: string;
    createdAt: string;
  }[];
  isAdmin: boolean;
};
type Recipient = { id: string; displayName: string };

function GiftsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<GiftWallet | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [topUpDiamonds, setTopUpDiamonds] = useState(GIFT_DIAMOND_REDEMPTION_MINIMUM);
  const [redeemDiamonds, setRedeemDiamonds] = useState(GIFT_DIAMOND_REDEMPTION_MINIMUM);
  const [billingMethod, setBillingMethod] = useState<"card" | "mpesa">("card");
  const [giftItemId, setGiftItemId] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"paypal" | "gift_card">("paypal");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [giftCardBrand, setGiftCardBrand] = useState("");
  const [deliveryEmail, setDeliveryEmail] = useState("");

  const refresh = async () => {
    const result = await getMyGiftWallet();
    if (!result.ok) throw new Error(result.message);
    setWallet(result as GiftWallet);
  };
  useEffect(() => {
    let active = true;
    void getMyGiftWallet()
      .then((result) => {
        if (!active) return;
        if (result.ok) setWallet(result as GiftWallet);
        else setError(result.message);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError("Your gift wallet could not be loaded.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!search.to) return;
    let active = true;
    void getVisibleProfile({ data: { id: search.to } })
      .then((result) => {
        if (!active) return;
        if (result.ok)
          setRecipient({ id: result.profile.id, displayName: result.profile.displayName });
        else setError(result.message);
      })
      .catch(() => {
        if (active) setError("Recipient profile could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [search.to]);
  useEffect(() => {
    if (!search.transactionId || !search.txRef) return;
    let active = true;
    if (search.paymentStatus.toLowerCase() !== "successful") {
      setNotice("Payment did not complete. No diamonds were added.");
      void navigate({
        to: "/gifts",
        search: { transactionId: "", txRef: "", paymentStatus: "", to: search.to },
        replace: true,
      });
      return;
    }
    setBusy("verify");
    void verifyMyGiftDiamondPayment({
      data: { transactionId: search.transactionId, txRef: search.txRef },
    })
      .then(async (result) => {
        if (!active) return;
        if (result.ok) setNotice("Payment confirmed. Your diamond balance has been updated.");
        else setError(result.message || "Payment confirmation is still processing.");
        await refresh();
      })
      .catch(() => {
        if (active) setError("Payment confirmation is still processing. Refresh shortly.");
      })
      .finally(() => {
        if (active) {
          setBusy("");
          void navigate({
            to: "/gifts",
            search: { transactionId: "", txRef: "", paymentStatus: "", to: search.to },
            replace: true,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [search.transactionId, search.txRef, search.paymentStatus, search.to, navigate]);

  const topUp = async () => {
    setError("");
    setNotice("");
    setBusy("checkout");
    try {
      const result = await startGiftDiamondCheckout({
        data: { diamonds: topUpDiamonds, billingMethod },
      });
      if (!result.ok) setError(result.message);
      else window.location.assign(result.checkoutUrl);
    } catch {
      setError("Checkout could not be started. Please try again.");
    } finally {
      setBusy("");
    }
  };
  const sendGift = async () => {
    if (!recipient || !giftItemId) return;
    setError("");
    setNotice("");
    setBusy("gift");
    try {
      const result = await sendMemberGift({ data: { recipientId: recipient.id, giftItemId } });
      if (!result.ok) setError(result.message);
      else {
        setNotice(result.message);
        await refresh();
      }
    } catch {
      setError("Gift could not be sent. Please try again.");
    } finally {
      setBusy("");
    }
  };
  const redeem = async () => {
    if (
      redeemDiamonds < GIFT_DIAMOND_REDEMPTION_MINIMUM ||
      redeemDiamonds > (wallet?.balanceDiamonds ?? 0)
    )
      return;
    if (payoutMethod === "paypal" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail.trim())) {
      setError("Enter a valid PayPal email address.");
      return;
    }
    if (
      payoutMethod === "gift_card" &&
      (!giftCardBrand.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryEmail.trim()))
    ) {
      setError("Enter a gift-card brand and a valid delivery email.");
      return;
    }
    setError("");
    setNotice("");
    setBusy("redeem");
    try {
      const result = await requestGiftDiamondRedemption({
        data: {
          diamonds: redeemDiamonds,
          payoutMethod,
          ...(payoutMethod === "paypal"
            ? { paypalEmail: paypalEmail.trim() }
            : { giftCardBrand: giftCardBrand.trim(), deliveryEmail: deliveryEmail.trim() }),
        },
      });
      if (!result.ok) setError(result.message);
      else {
        setNotice("Redemption request submitted for manual review.");
        await refresh();
      }
    } catch {
      setError("Redemption request could not be submitted.");
    } finally {
      setBusy("");
    }
  };
  const cancel = async (redemptionId: string) => {
    if (!window.confirm("Cancel this pending redemption request?")) return;
    setError("");
    setBusy(`cancel-${redemptionId}`);
    try {
      const result = await cancelGiftDiamondRedemption({ data: { redemptionId } });
      if (!result.ok) setError(result.message);
      else {
        setNotice("Redemption request canceled.");
        await refresh();
      }
    } catch {
      setError("Request could not be canceled.");
    } finally {
      setBusy("");
    }
  };
  const fieldClass = "mt-1 min-h-11 w-full rounded-xl border bg-background px-3 py-2 text-sm";
  const buttonClass =
    "inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to Discover
        </Link>
        <header className="rounded-3xl bg-primary p-6 text-primary-foreground sm:p-9">
          <div className="flex items-center gap-3">
            <Gift className="size-8" />
            <h1 className="text-3xl font-extrabold">Gifts & diamonds</h1>
          </div>
          <p className="mt-3 max-w-2xl text-sm opacity-90">
            Top up diamonds, send a thoughtful gift, or request a redemption. Purchases cost KES 1
            per diamond; redemptions are KES {GIFT_DIAMOND_REDEMPTION_KES.toFixed(2)} per diamond
            (minimum {GIFT_DIAMOND_REDEMPTION_MINIMUM} diamonds = KES{" "}
            {getGiftDiamondRedemptionValueKes(GIFT_DIAMOND_REDEMPTION_MINIMUM)?.toFixed(2)}).
          </p>
        </header>
        {loading ? (
          <p role="status" className="flex items-center gap-2 py-10 text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" />
            Loading your wallet…
          </p>
        ) : wallet ? (
          <>
            <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <Wallet className="size-6 text-primary" />
                <div>
                  <h2 className="font-bold">Your balance</h2>
                  <p className="text-sm text-muted-foreground">
                    {wallet.balanceDiamonds.toLocaleString()} diamonds
                  </p>
                </div>
              </div>
              {wallet.isAdmin && (
                <Link
                  to="/gifts/admin"
                  search={{ transactionId: "", txRef: "", paymentStatus: "", to: "" }}
                  className="text-sm font-semibold text-primary underline"
                >
                  Admin redemption queue
                </Link>
              )}
            </section>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <section className="rounded-3xl border bg-card p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Coins className="size-5 text-primary" />
                  Top up diamonds
                </h2>
                <label className="mt-4 block text-sm font-semibold" htmlFor="topup-amount">
                  Diamonds (1–{GIFT_DIAMOND_MAX_PURCHASE.toLocaleString()})
                </label>
                <input
                  id="topup-amount"
                  className={fieldClass}
                  type="number"
                  min={1}
                  max={GIFT_DIAMOND_MAX_PURCHASE}
                  step={1}
                  value={topUpDiamonds}
                  onChange={(e) =>
                    setTopUpDiamonds(
                      Math.max(1, Math.min(GIFT_DIAMOND_MAX_PURCHASE, Number(e.target.value) || 1)),
                    )
                  }
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Cost: KES {getGiftDiamondPurchaseCostKes(topUpDiamonds)?.toLocaleString()} at KES
                  1 per diamond.
                </p>
                <fieldset className="mt-4 space-y-2">
                  <legend className="text-sm font-semibold">Payment method</legend>
                  {(
                    [
                      ["card", "Card"],
                      ["mpesa", "M-Pesa"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="billing"
                        value={value}
                        checked={billingMethod === value}
                        onChange={() => setBillingMethod(value)}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <button
                  className={`${buttonClass} mt-4 w-full`}
                  onClick={() => void topUp()}
                  disabled={Boolean(busy) || topUpDiamonds < 1 || topUpDiamonds > 10000}
                >
                  {busy === "checkout" ? "Opening checkout…" : "Continue to checkout"}
                </button>
              </section>
              <section className="rounded-3xl border bg-card p-5 sm:p-6">
                <h2 className="text-xl font-bold">Redeem diamonds</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Minimum {GIFT_DIAMOND_REDEMPTION_MINIMUM} diamonds. Requests are held for manual
                  review; payment is not automatic.
                </p>
                <label className="mt-4 block text-sm font-semibold" htmlFor="redeem-amount">
                  Diamonds (minimum {GIFT_DIAMOND_REDEMPTION_MINIMUM}; available:{" "}
                  {wallet.balanceDiamonds})
                </label>
                <input
                  id="redeem-amount"
                  className={fieldClass}
                  type="number"
                  min={GIFT_DIAMOND_REDEMPTION_MINIMUM}
                  max={wallet.balanceDiamonds}
                  step={1}
                  value={redeemDiamonds}
                  onChange={(e) => setRedeemDiamonds(Math.max(1, Number(e.target.value) || 1))}
                />
                <p className="mt-2 text-sm font-semibold">
                  Estimated payout: KES{" "}
                  {getGiftDiamondRedemptionValueKes(redeemDiamonds)?.toFixed(2) ?? "—"}
                </p>
                <fieldset className="mt-4 space-y-2">
                  <legend className="text-sm font-semibold">Payout method</legend>
                  {(
                    [
                      ["paypal", "PayPal"],
                      ["gift_card", "Gift card"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="payout"
                        value={value}
                        checked={payoutMethod === value}
                        onChange={() => setPayoutMethod(value)}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                {payoutMethod === "paypal" ? (
                  <label className="mt-3 block text-sm font-semibold">
                    PayPal email
                    <input
                      className={fieldClass}
                      type="email"
                      autoComplete="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                    />
                  </label>
                ) : (
                  <>
                    <label className="mt-3 block text-sm font-semibold">
                      Gift-card brand
                      <input
                        className={fieldClass}
                        value={giftCardBrand}
                        onChange={(e) => setGiftCardBrand(e.target.value)}
                        placeholder="e.g. a supported brand"
                      />
                    </label>
                    <label className="mt-3 block text-sm font-semibold">
                      Delivery email
                      <input
                        className={fieldClass}
                        type="email"
                        autoComplete="email"
                        value={deliveryEmail}
                        onChange={(e) => setDeliveryEmail(e.target.value)}
                      />
                    </label>
                  </>
                )}
                <button
                  className={`${buttonClass} mt-4 w-full`}
                  onClick={() => void redeem()}
                  disabled={
                    Boolean(busy) ||
                    redeemDiamonds < GIFT_DIAMOND_REDEMPTION_MINIMUM ||
                    redeemDiamonds > wallet.balanceDiamonds
                  }
                >
                  {busy === "redeem" ? "Submitting request…" : "Request redemption"}
                </button>
              </section>
            </div>
            {recipient && (
              <section className="mt-5 rounded-3xl border bg-card p-5 sm:p-6">
                <h2 className="text-xl font-bold">Send a gift to {recipient.displayName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose an item. Its diamond cost will be confirmed before sending.
                </p>
                {wallet.catalog.length ? (
                  <>
                    <label htmlFor="gift-item" className="mt-4 block text-sm font-semibold">
                      Gift item
                    </label>
                    <select
                      id="gift-item"
                      className={fieldClass}
                      value={giftItemId}
                      onChange={(e) => setGiftItemId(e.target.value)}
                    >
                      <option value="">Choose a gift</option>
                      {wallet.catalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.icon} {item.name} · {item.diamondPrice} diamonds
                        </option>
                      ))}
                    </select>
                    <button
                      className={`${buttonClass} mt-4`}
                      onClick={() => void sendGift()}
                      disabled={!giftItemId || Boolean(busy)}
                    >
                      {busy === "gift" ? "Sending gift…" : "Send gift"}
                    </button>
                  </>
                ) : (
                  <p className="mt-3 text-sm">Gift catalog is currently unavailable.</p>
                )}
              </section>
            )}
            <section className="mt-5 rounded-3xl border bg-card p-5 sm:p-6">
              <h2 className="text-xl font-bold">Gift history</h2>
              {wallet.giftTransfers.length ? (
                <ul className="mt-3 divide-y">
                  {wallet.giftTransfers.map((transfer) => (
                    <li key={transfer.id} className="py-3 text-sm">
                      <p className="font-semibold">
                        {transfer.giftIcon} {transfer.giftName} · {transfer.diamonds} diamonds
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {transfer.sentByMe
                          ? `Sent to ${transfer.recipientName}`
                          : `Received from ${transfer.senderName}`}{" "}
                        · {new Date(transfer.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No gifts sent or received yet.</p>
              )}
            </section>
            <section className="mt-5 rounded-3xl border bg-card p-5 sm:p-6">
              <h2 className="text-xl font-bold">Redemption history</h2>
              {wallet.redemptions.length ? (
                <ul className="mt-3 divide-y">
                  {wallet.redemptions.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
                    >
                      <div>
                        <p className="font-semibold">
                          {item.diamonds} diamonds · KES {item.payoutAmountKes.toFixed(2)} ·{" "}
                          {item.payoutMethod === "paypal" ? "PayPal" : "Gift card"}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {item.status} · {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {item.status.toLowerCase() === "pending" && (
                        <button
                          className="min-h-11 rounded-full border px-4 text-sm font-semibold disabled:opacity-50"
                          disabled={Boolean(busy)}
                          onClick={() => void cancel(item.id)}
                        >
                          {busy === `cancel-${item.id}` ? "Canceling…" : "Cancel request"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No redemption requests yet.</p>
              )}
            </section>
            <section className="mt-5 rounded-3xl border bg-card p-5 sm:p-6">
              <h2 className="text-xl font-bold">Diamond activity</h2>
              {wallet.ledger.length ? (
                <ul className="mt-3 divide-y">
                  {wallet.ledger.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                      <span>
                        {item.entryType.replaceAll("_", " ")} ·{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                      <span className="font-semibold">
                        {item.deltaDiamonds > 0 ? "+" : ""}
                        {item.deltaDiamonds} · balance {item.balanceAfter}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No diamond activity yet.</p>
              )}
            </section>
          </>
        ) : (
          <div role="alert" className="mt-6 rounded-2xl bg-destructive/10 p-4 text-sm">
            {error || "Your wallet is unavailable."}
          </div>
        )}
        {notice && (
          <p role="status" className="mt-5 rounded-xl bg-primary/10 p-4 text-sm">
            {notice}
          </p>
        )}
        {error && wallet && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive-text"
          >
            {error}
          </p>
        )}
        {busy === "verify" && (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            Verifying payment…
          </p>
        )}
      </div>
    </AppShell>
  );
}
