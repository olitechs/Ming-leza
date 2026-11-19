import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const premiumTiers = {
  premium: { label: "Premium", amountKes: 200, planEnv: "FLW_PLAN_PREMIUM_200" },
  vip: { label: "VIP", amountKes: 1000, planEnv: "FLW_PLAN_VIP_1000" },
} as const;
export type PremiumTier = keyof typeof premiumTiers;
export type PremiumBillingMethod = "card" | "mpesa";

export function resolveFlutterwaveBillingMethod(value: unknown): PremiumBillingMethod | null {
  const type = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (type === "card") return "card";
  if (type === "mpesa") return "mpesa";
  return null;
}

export function matchesFlutterwaveTransactionReference(providerRef: unknown, expectedRef: string) {
  return typeof providerRef === "string" && providerRef.length > 0 && providerRef === expectedRef;
}

async function getMember() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: age, error: ageError } = await supabase
    .from("age_verifications")
    .select("is_18_plus")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (ageError || age?.is_18_plus !== true) return null;
  return { user: data.user, supabase };
}

export const getMyPremiumStatus = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const member = await getMember();
    if (!member) return { ok: false as const, message: "Sign in to manage Premium." };
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
    const admin = getSupabaseAdminClient();
    const [{ data: entitlement }, { data: details }] = await Promise.all([
      admin
        .from("premium_entitlements")
        .select("tier,billing_method,status,current_period_end")
        .eq("user_id", member.user.id)
        .maybeSingle(),
      admin
        .from("member_account_details")
        .select("phone_visibility_opt_in")
        .eq("user_id", member.user.id)
        .maybeSingle(),
    ]);
    const active = Boolean(
      entitlement &&
      ["active", "cancelled"].includes(entitlement.status) &&
      Date.parse(entitlement.current_period_end) > Date.now(),
    );
    return {
      ok: true as const,
      tier: active ? (entitlement?.tier as PremiumTier) : null,
      billingMethod: active ? (entitlement?.billing_method as PremiumBillingMethod) : null,
      status: active ? entitlement?.status : "expired",
      currentPeriodEnd: active ? entitlement?.current_period_end : null,
      phoneVisibilityOptIn: details?.phone_visibility_opt_in === true,
      cardCheckoutReady: Boolean(
        process.env["FLW_SECRET_KEY"] &&
        process.env["FLW_SECRET_HASH"] &&
        /^\d+$/.test(process.env["FLW_PLAN_PREMIUM_200"] ?? "") &&
        /^\d+$/.test(process.env["FLW_PLAN_VIP_1000"] ?? ""),
      ),
      mpesaCheckoutReady: Boolean(process.env["FLW_SECRET_KEY"] && process.env["FLW_SECRET_HASH"]),
    };
  } catch {
    return { ok: false as const, message: "Premium status could not be loaded." };
  }
});

const consentInput = z.object({ enabled: z.boolean() });
export const setPhoneVisibilityConsent = createServerFn({ method: "POST" })
  .validator(consentInput)
  .handler(async ({ data }) => {
    try {
      const member = await getMember();
      if (!member) return { ok: false as const, message: "Sign in to update phone privacy." };
      const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
      const { error } = await getSupabaseAdminClient()
        .from("member_account_details")
        .update({ phone_visibility_opt_in: data.enabled, updated_at: new Date().toISOString() })
        .eq("user_id", member.user.id);
      if (error)
        return { ok: false as const, message: "Phone visibility setting could not be saved." };
      return { ok: true as const, enabled: data.enabled };
    } catch {
      return { ok: false as const, message: "Phone visibility setting could not be saved." };
    }
  });

const checkoutInput = z.object({
  tier: z.enum(["premium", "vip"]),
  billingMethod: z.enum(["card", "mpesa"]),
});
export const startPremiumCheckout = createServerFn({ method: "POST" })
  .validator(checkoutInput)
  .handler(async ({ data }) => {
    try {
      const member = await getMember();
      if (!member)
        return { ok: false as const, message: "Sign in as an adult-verified member to continue." };
      const secretKey = process.env["FLW_SECRET_KEY"];
      if (!secretKey || !process.env["FLW_SECRET_HASH"])
        return { ok: false as const, message: "Premium checkout is not configured yet." };
      const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
      const admin = getSupabaseAdminClient();
      const [{ data: details, error: detailsError }, { data: current }] = await Promise.all([
        admin
          .from("member_account_details")
          .select("full_name,phone_e164")
          .eq("user_id", member.user.id)
          .maybeSingle(),
        admin
          .from("premium_entitlements")
          .select("status,current_period_end")
          .eq("user_id", member.user.id)
          .maybeSingle(),
      ]);
      if (detailsError || !details || !member.user.email)
        return { ok: false as const, message: "Your account billing details are unavailable." };
      if (
        current &&
        ["active", "cancelled"].includes(current.status) &&
        Date.parse(current.current_period_end) > Date.now()
      )
        return { ok: false as const, message: "You already have an active Premium membership." };

      const tier = premiumTiers[data.tier];
      const planId = data.billingMethod === "card" ? process.env[tier.planEnv] : undefined;
      if (data.billingMethod === "card" && !planId)
        return { ok: false as const, message: "Card subscriptions are not configured yet." };
      if (data.billingMethod === "card" && !/^\d+$/.test(planId ?? ""))
        return { ok: false as const, message: "Card subscription plan setup is invalid." };
      const txRef = `MZ-${crypto.randomUUID()}`;
      await admin
        .from("premium_payment_intents")
        .update({ status: "expired" })
        .eq("user_id", member.user.id)
        .eq("status", "pending")
        .lt("expires_at", new Date().toISOString());
      const { error: insertError } = await admin.from("premium_payment_intents").insert({
        tx_ref: txRef,
        user_id: member.user.id,
        tier: data.tier,
        billing_method: data.billingMethod,
        amount_kes: tier.amountKes,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
      if (insertError)
        return { ok: false as const, message: "Checkout could not be started. Retry shortly." };

      const requestOrigin = new URL(getRequest().url).origin;
      const origin =
        process.env["VERCEL_ENV"] === "preview"
          ? requestOrigin
          : process.env["SITE_URL"]?.trim().replace(/\/+$/, "") || requestOrigin;
      const response = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: tier.amountKes,
          currency: "KES",
          redirect_url: `${origin}/premium?checkout=return`,
          customer: {
            email: member.user.email,
            name: details.full_name,
            phonenumber: details.phone_e164,
          },
          customizations: {
            title: `Mingleza ${tier.label}`,
            description: `${tier.label} monthly membership`,
          },
          session_duration: 10,
          max_retry_attempt: 3,
          ...(data.billingMethod === "card"
            ? { payment_plan: Number(planId), payment_options: "card" }
            : { payment_options: "mpesa" }),
          meta: { tier: data.tier, user_id: member.user.id, billing_method: data.billingMethod },
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        status?: string;
        data?: { link?: string };
      } | null;
      if (!response.ok || result?.status !== "success" || !result.data?.link) {
        await admin
          .from("premium_payment_intents")
          .update({ status: "failed" })
          .eq("tx_ref", txRef);
        return {
          ok: false as const,
          message: "Payment checkout could not be created. Please retry later.",
        };
      }
      const checkoutUrl = new URL(result.data.link);
      if (
        checkoutUrl.protocol !== "https:" ||
        checkoutUrl.hostname !== "checkout.flutterwave.com"
      ) {
        await admin
          .from("premium_payment_intents")
          .update({ status: "failed" })
          .eq("tx_ref", txRef);
        return {
          ok: false as const,
          message: "Payment provider returned an invalid checkout link.",
        };
      }
      return { ok: true as const, checkoutUrl: checkoutUrl.toString() };
    } catch {
      return { ok: false as const, message: "Checkout is temporarily unavailable." };
    }
  });

const phoneInput = z.object({ ownerId: z.string().uuid() });
export const getPremiumVisiblePhone = createServerFn({ method: "POST" })
  .validator(phoneInput)
  .handler(async ({ data }) => {
    try {
      const member = await getMember();
      if (!member) return { ok: false as const, message: "Sign in to view contact details." };
      const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
      const { data: phone, error } = await getSupabaseAdminClient().rpc(
        "get_premium_visible_phone",
        {
          p_viewer_id: member.user.id,
          p_owner_id: data.ownerId,
        },
      );
      if (error || !phone)
        return { ok: false as const, message: "This number is private or unavailable." };
      return { ok: true as const, phone };
    } catch {
      return { ok: false as const, message: "This number is private or unavailable." };
    }
  });

export function isValidFlutterwaveSignature(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

type JsonRecord = Record<string, unknown> & {
  data?: unknown;
  status?: unknown;
  currency?: unknown;
  tx_ref?: unknown;
  amount?: unknown;
  id?: unknown;
  payment_type?: unknown;
  customer?: unknown;
  email?: unknown;
  payment_plan?: unknown;
  plan_id?: unknown;
  subscription_id?: unknown;
  event?: unknown;
  plan?: unknown;
  customer_email?: unknown;
};
function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}
function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

async function listActiveFlutterwaveSubscriptionIds(email: string, planId: string, key: string) {
  const params = new URLSearchParams({ email, plan: planId, status: "active", page: "1" });
  const response = await fetch(`https://api.flutterwave.com/v3/subscriptions?${params}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) return null;
  const body = asRecord(await response.json().catch(() => null));
  if (body?.status !== "success" || !Array.isArray(body.data)) return null;
  const meta = asRecord(body["meta"]);
  const pageInfo = asRecord(meta?.["page_info"]);
  const totalPages = Number(pageInfo?.["total_pages"] ?? 1);
  if (!Number.isSafeInteger(totalPages) || totalPages < 1 || totalPages > 20) return null;
  const ids: string[] = [];
  const collect = (items: unknown[]) => {
    for (const value of items) {
      const item = asRecord(value);
      const customer = asRecord(item?.customer);
      if (
        text(item?.status).toLowerCase() === "active" &&
        text(item?.plan) === planId &&
        text(customer?.customer_email ?? customer?.email)
          .trim()
          .toLowerCase() === email
      ) {
        const id = text(item?.id);
        if (!/^\d+$/.test(id)) return false;
        ids.push(id);
      }
    }
    return true;
  };
  if (!collect(body.data)) return null;
  for (let page = 2; page <= totalPages; page += 1) {
    const pageParams = new URLSearchParams({
      email,
      plan: planId,
      status: "active",
      page: String(page),
    });
    const pageResponse = await fetch(`https://api.flutterwave.com/v3/subscriptions?${pageParams}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!pageResponse.ok) return null;
    const pageBody = asRecord(await pageResponse.json().catch(() => null));
    if (pageBody?.status !== "success" || !Array.isArray(pageBody.data) || !collect(pageBody.data))
      return null;
  }
  return ids;
}

async function verifyAndApplyFlutterwavePayment(transactionId: string, fallbackTxRef = "") {
  const key = process.env["FLW_SECRET_KEY"];
  if (!key || !transactionId) return false;
  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
    {
      headers: { Authorization: `Bearer ${key}` },
    },
  );
  if (!response.ok) return false;
  const body = asRecord(await response.json().catch(() => null));
  const payment = asRecord(body?.data);
  if (!payment || payment.status !== "successful" || text(payment.currency).toUpperCase() !== "KES")
    return false;
  const txRef = text(payment.tx_ref);
  if (!txRef || (fallbackTxRef && !matchesFlutterwaveTransactionReference(txRef, fallbackTxRef)))
    return false;
  const amount = Number(payment.amount);
  if (!Number.isSafeInteger(amount)) return false;
  const paymentId = text(payment.id) || transactionId;
  const method = resolveFlutterwaveBillingMethod(payment.payment_type);
  if (!method) return false;
  const email = text(asRecord(payment.customer)?.email).trim().toLowerCase();
  if (!email) return false;
  const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
  const admin = getSupabaseAdminClient();

  const { data: intent } = await admin
    .from("premium_payment_intents")
    .select("tx_ref,user_id,tier,billing_method,amount_kes,status,expires_at")
    .eq("tx_ref", txRef)
    .maybeSingle();
  let userId = intent?.user_id ?? "";
  let tier: PremiumTier | "" = intent?.tier ?? "";
  if (intent) {
    if (intent.billing_method !== method || amount !== intent.amount_kes) return false;
    const expectedPlanEnv = premiumTiers[intent.tier as PremiumTier].planEnv;
    if (method === "card") {
      const plan = asRecord(payment.payment_plan);
      const actualPlanId = text(plan?.id ?? payment.payment_plan ?? payment.plan_id);
      const configuredPlanId = process.env[expectedPlanEnv];
      if (!configuredPlanId || (actualPlanId && actualPlanId !== configuredPlanId)) return false;
    }
    if (intent.status === "pending") {
      if (!intent.expires_at || Date.parse(intent.expires_at) <= Date.now()) return false;
    } else if (intent.status === "paid" && method === "card") {
      const configuredPlanId = process.env[expectedPlanEnv];
      const { data: currentEntitlement } = await admin
        .from("premium_entitlements")
        .select("user_id")
        .eq("user_id", intent.user_id)
        .eq("tier", intent.tier)
        .eq("billing_method", "card")
        .eq("provider_plan_id", configuredPlanId ?? "")
        .eq("provider_customer_email", email)
        .maybeSingle();
      if (!currentEntitlement) return false;
    } else return false;
    tier = intent.tier as PremiumTier;
  } else {
    if (method !== "card") return false;
    const [{ data: premium }, { data: vip }] = await Promise.all([
      admin
        .from("premium_entitlements")
        .select("user_id,tier,provider_plan_id")
        .eq("provider_customer_email", email)
        .eq("tier", "premium")
        .eq("billing_method", "card")
        .maybeSingle(),
      admin
        .from("premium_entitlements")
        .select("user_id,tier,provider_plan_id")
        .eq("provider_customer_email", email)
        .eq("tier", "vip")
        .eq("billing_method", "card")
        .maybeSingle(),
    ]);
    const renewal = amount === 200 ? premium : amount === 1000 ? vip : null;
    if (!renewal) return false;
    userId = renewal.user_id;
    tier = renewal.tier as PremiumTier;
    const plan = asRecord(payment.payment_plan);
    const actualPlanId = text(plan?.id ?? payment.payment_plan ?? payment.plan_id);
    const configuredPlanId = process.env[premiumTiers[tier].planEnv];
    if (
      !configuredPlanId ||
      renewal.provider_plan_id !== configuredPlanId ||
      (actualPlanId && actualPlanId !== configuredPlanId)
    )
      return false;
  }
  const expectedAmount = premiumTiers[tier as PremiumTier].amountKes;
  if (!userId || amount < expectedAmount || amount > expectedAmount) return false;
  const { data: account } = await admin.auth.admin.getUserById(userId);
  if (!account.user?.email || account.user.email.trim().toLowerCase() !== email) return false;

  let subscriptionId = text(payment.subscription_id);
  if (method === "card") {
    const planId = process.env[premiumTiers[tier as PremiumTier].planEnv];
    const paymentPlan = asRecord(payment.payment_plan);
    const actualPlanId = text(paymentPlan?.id ?? payment.payment_plan ?? payment.plan_id);
    if (!planId || (actualPlanId && actualPlanId !== planId)) return false;
    if (!actualPlanId || !/^\d+$/.test(subscriptionId)) {
      const activeIds = await listActiveFlutterwaveSubscriptionIds(email, planId, key);
      if (activeIds === null || (!actualPlanId && activeIds.length !== 1)) return false;
      if (!actualPlanId && /^\d+$/.test(subscriptionId) && activeIds[0] !== subscriptionId)
        return false;
      if (activeIds.length === 1) subscriptionId = activeIds[0]!;
    }
  }

  const { error } = await admin.rpc("apply_verified_premium_payment", {
    p_provider_transaction_id: paymentId,
    p_tx_ref: txRef,
    p_user_id: userId,
    p_tier: tier,
    p_billing_method: method,
    p_amount_kes: expectedAmount,
    p_customer_email: email,
    p_plan_id:
      method === "card" ? (process.env[premiumTiers[tier as PremiumTier].planEnv] ?? null) : null,
    p_subscription_id: /^\d+$/.test(subscriptionId) ? subscriptionId : null,
  });
  return !error;
}

export async function handleFlutterwaveWebhook(request: Request) {
  const secretHash = process.env["FLW_SECRET_HASH"];
  const signature = request.headers.get("verif-hash") ?? "";
  if (!secretHash || !isValidFlutterwaveSignature(signature, secretHash))
    return new Response("Unauthorized", { status: 401 });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return new Response("Unsupported media type", { status: 415 });
  const rawBody = await request.text();
  if (rawBody.length > 64_000) return new Response("Payload too large", { status: 413 });
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const payload = asRecord(parsedPayload);
  if (!payload) return new Response("Bad request", { status: 400 });
  const eventName = text(payload.event).toLowerCase();
  const data = asRecord(payload.data);
  if (!data) return new Response("Bad request", { status: 400 });

  try {
    if (eventName === "charge.completed" || eventName === "charge.success") {
      const transactionId = text(data.id);
      if (text(data.status).toLowerCase() === "successful") {
        if (
          !transactionId ||
          !(await verifyAndApplyFlutterwavePayment(transactionId, text(data.tx_ref)))
        )
          return new Response("Payment verification pending", { status: 500 });
      }
    } else if (eventName === "subscription.cancelled") {
      const customer = asRecord(data.customer);
      const plan = asRecord(data.plan);
      const email = text(customer?.email ?? customer?.customer_email ?? data.customer_email)
        .trim()
        .toLowerCase();
      const planId = text(plan?.id ?? data.plan ?? data.plan_id);
      if (email && planId) {
        const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
        const admin = getSupabaseAdminClient();
        const { data: entitlement, error: lookupError } = await admin
          .from("premium_entitlements")
          .select("user_id,provider_subscription_id")
          .eq("provider_customer_email", email)
          .eq("provider_plan_id", planId)
          .eq("billing_method", "card")
          .maybeSingle();
        if (lookupError) return new Response("Subscription cancellation pending", { status: 500 });
        if (!entitlement) return new Response("OK", { status: 200 });
        const key = process.env["FLW_SECRET_KEY"];
        if (!key) return new Response("Subscription cancellation pending", { status: 500 });
        const activeIds = await listActiveFlutterwaveSubscriptionIds(email, planId, key);
        if (activeIds === null)
          return new Response("Subscription cancellation pending", { status: 500 });
        const storedId = text(entitlement.provider_subscription_id);
        if (activeIds.some((id) => id !== storedId)) return new Response("OK", { status: 200 });
        if (!storedId && activeIds.length > 0) return new Response("OK", { status: 200 });
        const { error } = await admin.rpc("cancel_verified_premium_subscription", {
          p_user_id: entitlement.user_id,
          p_customer_email: email,
          p_plan_id: planId,
          p_subscription_id: storedId || null,
        });
        if (error) return new Response("Subscription cancellation pending", { status: 500 });
      }
    }
    return new Response("OK", { status: 200 });
  } catch {
    return new Response("Webhook processing failed", { status: 500 });
  }
}

const verifyCallbackInput = z.object({
  transactionId: z.string().trim().min(1).max(100),
  txRef: z.string().trim().min(1).max(100),
});
export const verifyMyPremiumPayment = createServerFn({ method: "POST" })
  .validator(verifyCallbackInput)
  .handler(async ({ data }) => {
    try {
      const member = await getMember();
      if (!member) return { ok: false as const, message: "Sign in to check your payment." };
      const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
      const admin = getSupabaseAdminClient();
      const { data: intent } = await admin
        .from("premium_payment_intents")
        .select("user_id,status")
        .eq("tx_ref", data.txRef)
        .maybeSingle();
      if (!intent || intent.user_id !== member.user.id)
        return { ok: false as const, message: "That payment reference is not available." };
      if (intent.status === "pending")
        await verifyAndApplyFlutterwavePayment(data.transactionId, data.txRef);
      const { data: entitlement } = await admin
        .from("premium_entitlements")
        .select("tier,billing_method,status,current_period_end")
        .eq("user_id", member.user.id)
        .maybeSingle();
      const active = Boolean(
        entitlement &&
        ["active", "cancelled"].includes(entitlement.status) &&
        Date.parse(entitlement.current_period_end) > Date.now(),
      );
      return { ok: true as const, active, tier: active ? entitlement?.tier : null };
    } catch {
      return { ok: false as const, message: "Payment status could not be checked yet." };
    }
  });

export const cancelMyCardRenewal = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const member = await getMember();
    if (!member?.user.email)
      return { ok: false as const, message: "Sign in to manage your membership." };
    const secretKey = process.env["FLW_SECRET_KEY"];
    if (!secretKey)
      return { ok: false as const, message: "Subscription management is unavailable." };
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
    const admin = getSupabaseAdminClient();
    const { data: entitlement } = await admin
      .from("premium_entitlements")
      .select(
        "tier,billing_method,status,current_period_end,provider_plan_id,provider_customer_email,provider_subscription_id",
      )
      .eq("user_id", member.user.id)
      .maybeSingle();
    if (!entitlement || entitlement.billing_method !== "card" || entitlement.status !== "active")
      return { ok: false as const, message: "There is no active card renewal to cancel." };
    const tier = entitlement.tier as PremiumTier;
    const planId = process.env[premiumTiers[tier].planEnv];
    const email = member.user.email.trim().toLowerCase();
    if (
      !planId ||
      entitlement.provider_plan_id !== planId ||
      entitlement.provider_customer_email !== email
    )
      return {
        ok: false as const,
        message: "The subscription could not be verified for this account.",
      };
    const activeIds = await listActiveFlutterwaveSubscriptionIds(email, planId, secretKey);
    const storedId = text(entitlement.provider_subscription_id);
    const candidates = activeIds?.filter((id) => !storedId || id === storedId) ?? [];
    const subscriptionId = candidates.length === 1 ? candidates[0]! : "";
    if (!activeIds || !subscriptionId)
      return {
        ok: false as const,
        message: "We could not find an active renewal to cancel. Please retry or contact support.",
      };
    const cancelled = await fetch(
      `https://api.flutterwave.com/v3/subscriptions/${subscriptionId}/cancel`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      },
    );
    const cancelBody = asRecord(await cancelled.json().catch(() => null));
    if (!cancelled.ok || cancelBody?.status !== "success")
      return {
        ok: false as const,
        message: "The provider could not cancel renewal. Please retry.",
      };
    const { error: localCancelError } = await admin.rpc("cancel_verified_premium_subscription", {
      p_user_id: member.user.id,
      p_customer_email: email,
      p_plan_id: planId,
      p_subscription_id: subscriptionId,
    });
    if (localCancelError)
      return {
        ok: false as const,
        message: "Renewal was canceled by the provider; app status will update after confirmation.",
      };
    return { ok: true as const, currentPeriodEnd: entitlement.current_period_end };
  } catch {
    return { ok: false as const, message: "Subscription cancellation is temporarily unavailable." };
  }
});
