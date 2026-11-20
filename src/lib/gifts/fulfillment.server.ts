import { getSupabaseAdminClient } from "@/lib/supabase/admin.server";

type BillingMethod = "card" | "mpesa";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function billingMethod(value: unknown): BillingMethod | null {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "card" || normalized === "mpesa" ? normalized : null;
}

export function parseFlutterwaveGiftPaymentBody(
  body: unknown,
  transactionId: string,
  expectedTxRef: string,
) {
  const payment = asRecord(asRecord(body)?.["data"]);
  if (
    !payment ||
    !transactionId.trim() ||
    !expectedTxRef.trim() ||
    payment["status"] !== "successful" ||
    text(payment["currency"]).trim().toUpperCase() !== "KES" ||
    text(payment["tx_ref"]) !== expectedTxRef
  )
    return null;
  const amountKes = Number(payment["amount"]);
  const method = billingMethod(payment["payment_type"]);
  const customerEmail = text(asRecord(payment["customer"])?.["email"]).trim().toLowerCase();
  if (!method || !customerEmail || !Number.isSafeInteger(amountKes) || amountKes < 1) return null;
  return {
    transactionId: text(payment["id"]).trim() || transactionId.trim(),
    txRef: expectedTxRef,
    amountKes,
    method,
    customerEmail,
  };
}

export async function applyVerifiedGiftDiamondPayment(input: {
  transactionId: string;
  txRef: string;
  amountKes: number;
  method: BillingMethod;
  customerEmail: string;
}) {
  const txRef = input.txRef.trim();
  const customerEmail = input.customerEmail.trim().toLowerCase();
  if (
    !input.transactionId ||
    !txRef ||
    !customerEmail ||
    !Number.isSafeInteger(input.amountKes) ||
    input.amountKes < 1
  )
    return false;

  const admin = getSupabaseAdminClient();
  const { data: intent, error: intentError } = await admin
    .from("gift_diamond_payment_intents")
    .select("tx_ref,user_id,diamonds,billing_method,amount_kes,status,expires_at")
    .eq("tx_ref", txRef)
    .maybeSingle();
  if (
    intentError ||
    !intent ||
    intent.amount_kes !== input.amountKes ||
    intent.diamonds !== input.amountKes ||
    intent.billing_method !== input.method ||
    !["pending", "paid"].includes(intent.status) ||
    (intent.status === "pending" && Date.parse(intent.expires_at) <= Date.now())
  )
    return false;

  const { data: account, error: accountError } = await admin.auth.admin.getUserById(intent.user_id);
  if (accountError || account.user?.email?.trim().toLowerCase() !== customerEmail) return false;

  const { error: applyError } = await admin.rpc("apply_verified_gift_diamond_purchase", {
    p_provider_transaction_id: input.transactionId,
    p_tx_ref: txRef,
    p_user_id: intent.user_id,
    p_diamonds: intent.diamonds,
    p_billing_method: input.method,
    p_customer_email: customerEmail,
  });
  return !applyError;
}

export async function verifyGiftDiamondPayment(transactionId: string, expectedTxRef: string) {
  const secretKey = process.env["FLW_SECRET_KEY"];
  if (!secretKey || !transactionId || !expectedTxRef) return false;
  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  if (!response.ok) return false;
  const verified = parseFlutterwaveGiftPaymentBody(
    await response.json().catch(() => null),
    transactionId,
    expectedTxRef,
  );
  return verified ? applyVerifiedGiftDiamondPayment(verified) : false;
}
