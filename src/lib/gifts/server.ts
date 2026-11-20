import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  GIFT_DIAMOND_MAX_PURCHASE,
  GIFT_DIAMOND_MAX_REDEMPTION,
  GIFT_DIAMOND_PRICE_KES,
  GIFT_DIAMOND_REDEMPTION_MINIMUM,
} from "./rules";
import { z } from "zod";

async function getAdultMember() {
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

function isGiftAdmin(email: string | undefined) {
  if (!email) return false;
  const allowlist = (process.env["GIFT_REDEMPTION_ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.trim().toLowerCase());
}

function isGiftCheckoutConfigured() {
  return Boolean(process.env["FLW_SECRET_KEY"] && process.env["FLW_SECRET_HASH"]);
}

export const getMyGiftWallet = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const member = await getAdultMember();
    if (!member) return { ok: false as const, message: "Sign in as an adult-verified member." };
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
    const admin = getSupabaseAdminClient();
    await admin
      .from("gift_diamond_wallets")
      .upsert(
        { user_id: member.user.id, available_diamonds: 0 },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    const [walletResult, catalogResult, ledgerResult, redemptionResult, transferResult] =
      await Promise.all([
        admin
          .from("gift_diamond_wallets")
          .select("available_diamonds")
          .eq("user_id", member.user.id)
          .maybeSingle(),
        admin
          .from("gift_catalog_items")
          .select("id,name,icon,diamond_price")
          .eq("active", true)
          .order("sort_order")
          .order("id"),
        admin
          .from("gift_diamond_ledger")
          .select("id,entry_type,delta_diamonds,balance_after,created_at")
          .eq("user_id", member.user.id)
          .order("created_at", { ascending: false })
          .limit(25),
        admin
          .from("gift_diamond_redemptions")
          .select(
            "id,diamonds,payout_amount_kes,payout_method,paypal_email,gift_card_brand,delivery_email,status,created_at",
          )
          .eq("user_id", member.user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        admin
          .from("gift_transfers")
          .select("id,sender_id,recipient_id,gift_item_id,diamonds,created_at")
          .or(`sender_id.eq.${member.user.id},recipient_id.eq.${member.user.id}`)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);
    if (
      walletResult.error ||
      catalogResult.error ||
      ledgerResult.error ||
      redemptionResult.error ||
      transferResult.error ||
      !walletResult.data
    )
      return { ok: false as const, message: "Gift wallet could not be loaded. Please retry." };
    const transfers = transferResult.data ?? [];
    const profileIds = Array.from(
      new Set(transfers.flatMap((transfer) => [transfer.sender_id, transfer.recipient_id])),
    );
    const profileResult = profileIds.length
      ? await admin.from("profiles").select("id,display_name").in("id", profileIds)
      : { data: [], error: null };
    const profileNames = new Map(
      (profileResult.data ?? []).map((profile) => [profile.id, profile.display_name]),
    );
    const giftCatalog = catalogResult.data ?? [];
    return {
      ok: true as const,
      balanceDiamonds: walletResult.data.available_diamonds,
      catalog: giftCatalog.map((item) => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        diamondPrice: item.diamond_price,
      })),
      ledger: (ledgerResult.data ?? []).map((entry) => ({
        id: entry.id,
        entryType: entry.entry_type,
        deltaDiamonds: entry.delta_diamonds,
        balanceAfter: entry.balance_after,
        createdAt: entry.created_at,
      })),
      giftTransfers: transfers.map((transfer) => {
        const item = giftCatalog.find((candidate) => candidate.id === transfer.gift_item_id);
        return {
          id: transfer.id,
          giftName: item?.name ?? transfer.gift_item_id,
          giftIcon: item?.icon ?? "",
          diamonds: transfer.diamonds,
          sentByMe: transfer.sender_id === member.user.id,
          senderName: profileNames.get(transfer.sender_id) ?? "Member",
          recipientName: profileNames.get(transfer.recipient_id) ?? "Member",
          createdAt: transfer.created_at,
        };
      }),
      redemptions: (redemptionResult.data ?? []).map((request) => ({
        id: request.id,
        diamonds: request.diamonds,
        payoutAmountKes: Number(request.payout_amount_kes),
        payoutMethod: request.payout_method,
        paypalEmail: request.paypal_email,
        giftCardBrand: request.gift_card_brand,
        deliveryEmail: request.delivery_email,
        status: request.status,
        createdAt: request.created_at,
      })),
      isAdmin: isGiftAdmin(member.user.email),
      paymentCheckoutReady: isGiftCheckoutConfigured(),
    };
  } catch {
    return { ok: false as const, message: "Gift wallet is temporarily unavailable." };
  }
});

const checkoutInput = z.object({
  diamonds: z.number().int().min(1).max(GIFT_DIAMOND_MAX_PURCHASE),
  billingMethod: z.enum(["card", "mpesa"]),
});
export const startGiftDiamondCheckout = createServerFn({ method: "POST" })
  .validator(checkoutInput)
  .handler(async ({ data }) => {
    try {
      const member = await getAdultMember();
      if (!member?.user.email)
        return { ok: false as const, message: "Sign in as an adult-verified member to continue." };
      const secretKey = process.env["FLW_SECRET_KEY"];
      if (!secretKey || !process.env["FLW_SECRET_HASH"])
        return { ok: false as const, message: "Diamond checkout is not configured yet." };
      const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
      const admin = getSupabaseAdminClient();
      const { data: details, error: detailsError } = await admin
        .from("member_account_details")
        .select("full_name,phone_e164")
        .eq("user_id", member.user.id)
        .maybeSingle();
      if (detailsError || !details)
        return { ok: false as const, message: "Your checkout details are unavailable." };
      if (data.billingMethod === "mpesa" && !details.phone_e164.startsWith("+254"))
        return {
          ok: false as const,
          message: "M-Pesa checkout requires a Kenyan +254 phone number.",
        };
      const now = new Date();
      await admin
        .from("gift_diamond_payment_intents")
        .update({ status: "expired" })
        .eq("user_id", member.user.id)
        .eq("status", "pending")
        .lt("expires_at", now.toISOString());
      const txRef = `MZG-${crypto.randomUUID()}`;
      const { error: insertError } = await admin.from("gift_diamond_payment_intents").insert({
        tx_ref: txRef,
        user_id: member.user.id,
        diamonds: data.diamonds,
        billing_method: data.billingMethod,
        amount_kes: data.diamonds * GIFT_DIAMOND_PRICE_KES,
        status: "pending",
        expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      });
      if (insertError)
        return {
          ok: false as const,
          message:
            "You already have a diamond checkout in progress. Finish or wait for it to expire.",
        };

      const requestOrigin = new URL(getRequestUrl()).origin;
      const origin =
        process.env["VERCEL_ENV"] === "preview"
          ? requestOrigin
          : process.env["SITE_URL"]?.trim().replace(/\/+$/, "") || requestOrigin;
      const response = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: data.diamonds * GIFT_DIAMOND_PRICE_KES,
          currency: "KES",
          redirect_url: `${origin}/gifts?checkout=return`,
          customer: {
            email: member.user.email,
            name: details.full_name,
            phonenumber: details.phone_e164,
          },
          customizations: {
            title: "Mingleza Gift Diamonds",
            description: `${data.diamonds} gift diamonds at KES 1 each`,
          },
          session_duration: 15,
          max_retry_attempt: 3,
          payment_options: data.billingMethod === "mpesa" ? "mpesa" : "card",
          meta: {
            purpose: "gift_diamonds",
            user_id: member.user.id,
            diamonds: data.diamonds,
            billing_method: data.billingMethod,
          },
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        status?: string;
        data?: { link?: string };
      } | null;
      const failCheckout = async () => {
        await admin
          .from("gift_diamond_payment_intents")
          .update({ status: "failed" })
          .eq("tx_ref", txRef)
          .eq("user_id", member.user.id)
          .eq("status", "pending");
      };
      if (!response.ok || result?.status !== "success" || !result.data?.link) {
        await failCheckout();
        return {
          ok: false as const,
          message: "Diamond checkout could not be created. Please retry.",
        };
      }
      const checkoutUrl = new URL(result.data.link);
      if (
        checkoutUrl.protocol !== "https:" ||
        checkoutUrl.hostname !== "checkout.flutterwave.com"
      ) {
        await failCheckout();
        return {
          ok: false as const,
          message: "Payment provider returned an invalid checkout link.",
        };
      }
      return { ok: true as const, checkoutUrl: checkoutUrl.toString() };
    } catch {
      return { ok: false as const, message: "Diamond checkout is temporarily unavailable." };
    }
  });

function getRequestUrl() {
  return getRequest().url;
}

const verifyInput = z.object({
  transactionId: z.string().trim().min(1).max(100),
  txRef: z.string().trim().min(1).max(100),
});
export const verifyMyGiftDiamondPayment = createServerFn({ method: "POST" })
  .validator(verifyInput)
  .handler(async ({ data }) => {
    try {
      const member = await getAdultMember();
      if (!member) return { ok: false as const, message: "Sign in to verify this payment." };
      const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
      const admin = getSupabaseAdminClient();
      const { data: intent, error } = await admin
        .from("gift_diamond_payment_intents")
        .select("user_id,status")
        .eq("tx_ref", data.txRef)
        .maybeSingle();
      if (error || !intent || intent.user_id !== member.user.id)
        return { ok: false as const, message: "That payment reference is not available." };
      if (intent.status === "pending") {
        const { verifyGiftDiamondPayment } = await import("./fulfillment.server");
        await verifyGiftDiamondPayment(data.transactionId, data.txRef);
      }
      const [{ data: wallet }, { data: updatedIntent }] = await Promise.all([
        admin
          .from("gift_diamond_wallets")
          .select("available_diamonds")
          .eq("user_id", member.user.id)
          .maybeSingle(),
        admin
          .from("gift_diamond_payment_intents")
          .select("status")
          .eq("tx_ref", data.txRef)
          .maybeSingle(),
      ]);
      if (updatedIntent?.status !== "paid")
        return {
          ok: false as const,
          message: "Payment confirmation is still processing; check your wallet again shortly.",
        };
      return { ok: true as const, balanceDiamonds: wallet?.available_diamonds ?? 0 };
    } catch {
      return { ok: false as const, message: "Payment status could not be checked yet." };
    }
  });

const giftInput = z.object({
  recipientId: z.string().uuid(),
  giftItemId: z.string().trim().min(1).max(40),
});
export const sendMemberGift = createServerFn({ method: "POST" })
  .validator(giftInput)
  .handler(async ({ data }) => {
    try {
      const member = await getAdultMember();
      if (!member)
        return {
          ok: false as const,
          message: "Sign in as an adult-verified member to send gifts.",
        };
      const { data: transferId, error } = await member.supabase.rpc("send_member_gift", {
        p_recipient_id: data.recipientId,
        p_gift_item_id: data.giftItemId,
      });
      if (error || !transferId)
        return {
          ok: false as const,
          message: "Gift could not be sent. Check your diamond balance and try again.",
        };
      const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
      const { data: wallet } = await getSupabaseAdminClient()
        .from("gift_diamond_wallets")
        .select("available_diamonds")
        .eq("user_id", member.user.id)
        .maybeSingle();
      return {
        ok: true as const,
        balanceDiamonds: wallet?.available_diamonds ?? 0,
        message: "Gift sent. The recipient can see it in their gift history.",
      };
    } catch {
      return { ok: false as const, message: "Gift could not be sent. Please retry." };
    }
  });

const redemptionInput = z
  .object({
    diamonds: z
      .number()
      .int()
      .min(GIFT_DIAMOND_REDEMPTION_MINIMUM)
      .max(GIFT_DIAMOND_MAX_REDEMPTION),
    payoutMethod: z.enum(["paypal", "gift_card"]),
    paypalEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
    giftCardBrand: z.string().trim().min(2).max(60).optional().or(z.literal("")),
    deliveryEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (value.payoutMethod === "paypal" && !value.paypalEmail)
      context.addIssue({ code: "custom", path: ["paypalEmail"], message: "Enter a PayPal email." });
    if (value.payoutMethod === "gift_card" && (!value.giftCardBrand || !value.deliveryEmail))
      context.addIssue({
        code: "custom",
        path: ["giftCardBrand"],
        message: "Choose a gift card brand and delivery email.",
      });
  });
export const requestGiftRedemption = createServerFn({ method: "POST" })
  .validator(redemptionInput)
  .handler(async ({ data }) => {
    try {
      const member = await getAdultMember();
      if (!member)
        return {
          ok: false as const,
          message: "Sign in as an adult-verified member to redeem diamonds.",
        };
      const { data: redemptionId, error } = await member.supabase.rpc(
        "request_gift_diamond_redemption",
        {
          p_diamonds: data.diamonds,
          p_payout_method: data.payoutMethod,
          p_paypal_email: data.payoutMethod === "paypal" ? data.paypalEmail || null : null,
          p_gift_card_brand: data.payoutMethod === "gift_card" ? data.giftCardBrand || null : null,
          p_delivery_email: data.payoutMethod === "gift_card" ? data.deliveryEmail || null : null,
        },
      );
      if (error || !redemptionId)
        return {
          ok: false as const,
          message: "Redemption request could not be created. Check your balance and try again.",
        };
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "Redemption service is temporarily unavailable." };
    }
  });

const redemptionIdInput = z.object({ redemptionId: z.string().uuid() });
export const cancelGiftRedemption = createServerFn({ method: "POST" })
  .validator(redemptionIdInput)
  .handler(async ({ data }) => {
    try {
      const member = await getAdultMember();
      if (!member) return { ok: false as const, message: "Sign in to update this request." };
      const { error } = await member.supabase.rpc("cancel_gift_diamond_redemption", {
        p_request_id: data.redemptionId,
      });
      if (error) return { ok: false as const, message: "Only pending requests can be canceled." };
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "Redemption request could not be canceled." };
    }
  });

export const getGiftRedemptionAdminQueue = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const member = await getAdultMember();
    if (!member) return { ok: false as const, message: "Sign in as an adult-verified member." };
    if (!isGiftAdmin(member.user.email))
      return { ok: true as const, isAdmin: false as const, redemptions: [] };
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
    const { data, error } = await getSupabaseAdminClient()
      .from("gift_diamond_redemptions")
      .select(
        "id,user_id,diamonds,payout_amount_kes,payout_method,paypal_email,gift_card_brand,delivery_email,status,created_at,admin_note",
      )
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) return { ok: false as const, message: "Redemption queue could not be loaded." };
    return {
      ok: true as const,
      isAdmin: true as const,
      redemptions: (data ?? []).map((item) => ({
        id: item.id,
        userId: item.user_id,
        diamonds: item.diamonds,
        payoutAmountKes: Number(item.payout_amount_kes),
        payoutMethod: item.payout_method,
        paypalEmail: item.paypal_email,
        giftCardBrand: item.gift_card_brand,
        deliveryEmail: item.delivery_email,
        status: item.status,
        createdAt: item.created_at,
        adminNote: item.admin_note,
      })),
    };
  } catch {
    return { ok: false as const, message: "Redemption queue is temporarily unavailable." };
  }
});

const resolutionInput = z.object({
  redemptionId: z.string().uuid(),
  action: z.enum(["approve", "reject", "paid"]),
  note: z.string().trim().max(500).optional().default(""),
});
export const resolveGiftRedemption = createServerFn({ method: "POST" })
  .validator(resolutionInput)
  .handler(async ({ data }) => {
    try {
      const member = await getAdultMember();
      if (!member || !isGiftAdmin(member.user.email))
        return { ok: false as const, message: "You are not authorized to manage redemptions." };
      const { getSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
      const { error } = await getSupabaseAdminClient().rpc("resolve_gift_diamond_redemption", {
        p_request_id: data.redemptionId,
        p_admin_id: member.user.id,
        p_action: data.action,
        p_note: data.note || null,
      });
      if (error) return { ok: false as const, message: "That redemption could not be updated." };
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "Redemption queue is temporarily unavailable." };
    }
  });
