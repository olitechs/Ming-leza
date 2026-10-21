import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { sendOtp, verifyOtp, verifyAdult, setMyIntent, getMyAccess } from "@/lib/auth/server";
import { completeMyProfileSetup, getMyProfile, setMyAvatarPath } from "@/lib/profile/server";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowLeft, Heart, Users, ShieldCheck, Mail } from "lucide-react";
import p1 from "@/assets/p1.webp";
import p3 from "@/assets/p3.webp";
import p4 from "@/assets/p4.webp";

export const Route = createFileRoute("/welcome")({
  validateSearch: (search: Record<string, unknown>) => ({
    authComplete: search["authComplete"] === true || search["authComplete"] === "true",
    authError: typeof search["authError"] === "string" ? search["authError"] : "",
    ...(search["mode"] === "signin" || search["mode"] === "profile"
      ? { mode: search["mode"] as "signin" | "profile" }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "Welcome to Mingleza" },
      {
        name: "description",
        content: "Join Mingleza — make friends and find dates across Kenya. Adults 18+ only.",
      },
      { property: "og:title", content: "Welcome to Mingleza" },
      { property: "og:description", content: "Make friends and find dates across Kenya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

const steps = ["welcome", "age", "phone", "otp", "email-sent", "profile", "intent"] as const;

function Welcome() {
  const nav = useNavigate();
  const { authComplete, authError, mode } = Route.useSearch();
  const [signingIn, setSigningIn] = useState(mode === "signin");
  // True once the person has a valid session and only the age check remains.
  const [authed, setAuthed] = useState(authComplete || mode === "profile");
  const [step, setStep] = useState(() =>
    authError ? 2 : mode === "profile" ? 5 : authComplete ? 1 : mode === "signin" ? 2 : 0,
  );
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<"phone" | "email">(authError ? "email" : "phone");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [intent, setIntent] = useState<string[]>(["Friends"]);
  const [err, setErr] = useState(() =>
    authError === "link_expired"
      ? "That sign-in link has expired or was already used. Enter your email below and request a new link. For your security, an expired link cannot sign you in."
      : "",
  );
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (mode !== "profile") return;
    let active = true;
    void getMyProfile().then((result) => {
      if (!active || !result.ok) return;
      setDisplayName(
        result.profile.display_name === "New member" ? "" : result.profile.display_name,
      );
      setCity(result.profile.city ?? "");
      setAvatarPath(result.profile.avatar_path);
    });
    return () => {
      active = false;
    };
  }, [mode]);
  const next = () => {
    setErr("");
    setStep((s) => s + 1);
  };

  const checkAge = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setErr("Enter your date of birth.");
      return;
    }
    if (authed) {
      setIsBusy(true);
      setErr("");
      try {
        const result = await verifyAdult({ data: { dateOfBirth: dob } });
        if (!result.ok) {
          setErr(result.message);
          return;
        }
        setStep(5);
      } catch {
        setErr("We could not verify your age. Please try again.");
      } finally {
        setIsBusy(false);
      }
      return;
    }
    next();
  };

  const checkPhone = async () => {
    setErr("");
    const identifier =
      authMethod === "phone"
        ? "+254" +
          phone
            .replace(/^\+254/, "")
            .replace(/\D/g, "")
            .replace(/^0/, "")
        : email.trim();
    if (authMethod === "phone" && !/^\+254[17]\d{8}$/.test(identifier)) {
      setErr("Enter a valid Kenyan number, e.g. 712 345 678.");
      return;
    }
    if (authMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      setErr("Enter a valid email address.");
      return;
    }
    setIsBusy(true);
    try {
      const result = await sendOtp({ data: { method: authMethod, identifier } });
      if (!result.ok) {
        setErr(result.message);
        return;
      }
      setCooldown(30);
      if (authMethod === "phone") {
        setPhone(identifier);
        setStep(3);
      } else {
        setEmail(identifier);
        setStep(4);
      }
    } catch {
      setErr(
        authMethod === "email"
          ? "We could not send your sign-in link. Please try again."
          : "We could not send a code. Please try again.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const checkOtp = async (value = otp) => {
    const token = value.trim();
    if (token.length !== 6) {
      setErr("Enter the 6-digit code.");
      return;
    }
    setErr("");
    setIsBusy(true);
    try {
      const authResult = await verifyOtp({ data: { method: "phone", identifier: phone, token } });
      if (!authResult.ok) {
        setErr(authResult.message);
        return;
      }
      setAuthed(true);
      // Returning adults skip the age step.
      const access = await getMyAccess();
      if (access.authenticated && access.adultVerified) {
        await nav({ to: "/" });
        return;
      }
      if (signingIn || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        setStep(1);
        return;
      }
      const ageResult = await verifyAdult({ data: { dateOfBirth: dob } });
      if (!ageResult.ok) {
        setErr(ageResult.message);
        return;
      }
      setStep(5);
    } catch {
      setErr("We could not verify your code. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const uploadProfilePhoto = async (file?: File) => {
    if (!file) return;
    setErr("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErr("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr("The photo must be 5 MB or smaller.");
      return;
    }
    setIsBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        setErr("Sign in again before adding a photo.");
        return;
      }
      const extension =
        file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `${auth.user.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (uploadError) {
        setErr("Photo upload failed. Check your connection and retry.");
        return;
      }
      const saved = await setMyAvatarPath({ data: { path } });
      if (!saved.ok) {
        setErr(saved.message);
        return;
      }
      setAvatarPath(path);
    } catch {
      setErr("Photo upload failed. Please retry.");
    } finally {
      setIsBusy(false);
    }
  };

  const completeProfile = async () => {
    setErr("");
    if (displayName.trim().length < 2 || displayName.trim().toLowerCase() === "new member") {
      setErr("Enter a real display name with at least 2 characters.");
      return;
    }
    if (city.trim().length < 2) {
      setErr("Enter your town or city.");
      return;
    }
    setIsBusy(true);
    try {
      const result = await completeMyProfileSetup({
        data: { displayName: displayName.trim(), city: city.trim() },
      });
      if (!result.ok) {
        setErr(result.message);
        return;
      }
      setStep(6);
    } catch {
      setErr("Profile setup could not be saved. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const finish = async () => {
    setErr("");
    setIsBusy(true);
    try {
      const result = await setMyIntent({
        data: {
          friendsEnabled: intent.includes("Friends"),
          datingEnabled: intent.includes("Dating"),
        },
      });
      if (!result.ok) {
        setErr(result.message);
        return;
      }
      await nav({ to: "/" });
    } catch {
      setErr("We could not finish your profile. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const id = steps[step];
  const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const avatarUrl =
    avatarPath && supabaseUrl
      ? `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/profile-avatars/${avatarPath
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`
      : "";
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-card shadow-card">
        {id === "welcome" ? (
          <div>
            <div className="relative h-80 bg-brand">
              <img
                src={p1}
                alt="Mingleza member in Nairobi"
                width={768}
                height={1024}
                className="absolute left-8 top-10 h-48 w-36 -rotate-6 rounded-3xl border-4 border-card object-cover shadow-card"
              />
              <img
                src={p3}
                alt="Mingleza member portrait"
                width={768}
                height={1024}
                className="absolute right-8 top-6 h-48 w-36 rotate-6 rounded-3xl border-4 border-card object-cover shadow-card"
              />
              <img
                src={p4}
                alt="Mingleza member portrait"
                width={768}
                height={1024}
                className="absolute bottom-6 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full border-4 border-card object-cover shadow-card"
              />
              <span className="absolute bottom-10 right-16 grid size-12 place-items-center rounded-full bg-accent text-accent-foreground shadow-card">
                <Heart className="size-6 fill-current" />
              </span>
            </div>
            <div className="p-8 text-center">
              <h1 className="text-3xl font-extrabold">Find your people in Kenya</h1>
              <p className="mt-3 text-muted-foreground">
                Make friends, find a date, share moments. Safe, local and for adults 18+.
              </p>
              <button
                onClick={next}
                className="mt-8 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground hover:bg-primary-pressed"
              >
                Get started
              </button>
              <button
                onClick={() => {
                  setSigningIn(true);
                  setErr("");
                  setStep(2);
                }}
                className="mt-3 w-full py-2 text-sm font-semibold text-primary"
              >
                I already have an account · Log in
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8">
            <div className="mb-8 flex items-center gap-4">
              <button
                onClick={() => {
                  setErr("");
                  setStep((s) =>
                    s === 6 ? 5 : s === 5 ? 1 : s === 4 ? 2 : s === 2 && signingIn ? 0 : s - 1,
                  );
                }}
                aria-label="Back"
                className="grid size-10 place-items-center rounded-full border"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex flex-1 gap-1.5">
                {steps.slice(1).map((_, k) => (
                  <span
                    key={k}
                    className={`h-1.5 flex-1 rounded-full ${k < step ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>

            {id === "age" && (
              <>
                <ShieldCheck className="size-10 text-primary" />
                <h1 className="mt-4 text-2xl font-extrabold">Confirm you're 18+</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Mingleza is adults only. This is used only to confirm adulthood; we do not store
                  your birth date or display your age on your profile.
                </p>
                <label className="mt-6 block space-y-2 text-sm font-semibold">
                  <span>Date of birth</span>
                  <input
                    type="date"
                    aria-describedby={err ? "welcome-error" : undefined}
                    aria-invalid={Boolean(err)}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full rounded-2xl border bg-background px-4 py-4 outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <Primary disabled={isBusy} onClick={checkAge}>
                  {isBusy ? "Checking…" : "Continue"}
                </Primary>
              </>
            )}

            {id === "phone" && (
              <>
                <h1 className="text-2xl font-extrabold">
                  {signingIn ? "Welcome back" : "Verify your account"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use a one-time SMS code or a sign-in link sent to your email.
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    aria-pressed={authMethod === "phone"}
                    onClick={() => setAuthMethod("phone")}
                    className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold ${authMethod === "phone" ? "border-primary bg-secondary" : ""}`}
                  >
                    Phone / SMS
                  </button>
                  <button
                    type="button"
                    aria-pressed={authMethod === "email"}
                    onClick={() => setAuthMethod("email")}
                    className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold ${authMethod === "email" ? "border-primary bg-secondary" : ""}`}
                  >
                    Email link
                  </button>
                </div>
                {authMethod === "phone" ? (
                  <div className="mt-6 flex gap-2">
                    <span className="grid place-items-center rounded-2xl border bg-muted px-4 font-semibold">
                      <span aria-hidden="true">KE</span> <span>+254</span>
                    </span>
                    <input
                      aria-label="Kenyan phone number"
                      aria-describedby={err ? "welcome-error" : undefined}
                      aria-invalid={Boolean(err)}
                      inputMode="tel"
                      autoComplete="tel-national"
                      value={phone.replace(/^\+254/, "")}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="712 345 678"
                      className="min-w-0 flex-1 rounded-2xl border bg-background px-4 py-4 outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ) : (
                  <input
                    aria-label="Email address"
                    aria-describedby={err ? "welcome-error" : undefined}
                    aria-invalid={Boolean(err)}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-6 w-full rounded-2xl border bg-background px-4 py-4 outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
                <Primary disabled={isBusy} onClick={checkPhone}>
                  {isBusy ? "Sending…" : authMethod === "email" ? "Send sign-in link" : "Send code"}
                </Primary>
              </>
            )}

            {id === "otp" && (
              <>
                <h1 className="text-2xl font-extrabold">Enter verification code</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Code sent to {phone}. Enter all 6 digits.
                </p>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  onComplete={(value) => void checkOtp(value)}
                  inputMode="numeric"
                  pattern="^[0-9]*$"
                  autoComplete="one-time-code"
                  aria-label="6-digit verification code"
                  aria-describedby={err ? "welcome-error" : undefined}
                  aria-invalid={Boolean(err)}
                  disabled={isBusy}
                  autoFocus
                  containerClassName="mt-6 justify-between gap-2"
                >
                  <InputOTPGroup className="w-full justify-between gap-2">
                    {[0, 1, 2, 3, 4, 5].map((k) => (
                      <InputOTPSlot
                        key={k}
                        index={k}
                        className="size-12 rounded-xl border-2 font-display text-xl font-bold first:rounded-xl first:border-2 last:rounded-xl sm:size-14"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Primary disabled={isBusy} onClick={() => checkOtp()}>
                  {isBusy ? "Verifying…" : "Verify code"}
                </Primary>
                <button
                  type="button"
                  disabled={isBusy || cooldown > 0}
                  onClick={() => {
                    setOtp("");
                    void checkPhone();
                  }}
                  className="mt-3 w-full text-sm font-semibold text-primary disabled:opacity-50"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
              </>
            )}

            {id === "email-sent" && (
              <>
                <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
                  <Mail className="size-7" />
                </span>
                <h1 className="mt-4 text-2xl font-extrabold">Check your email</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We sent a secure sign-in link to{" "}
                  <strong className="break-all text-foreground">{email}</strong>. Open that link to
                  finish signing in. You do not need to enter a six-digit code.
                </p>
                <Primary disabled={isBusy || cooldown > 0} onClick={checkPhone}>
                  {cooldown > 0
                    ? `Resend link in ${cooldown}s`
                    : isBusy
                      ? "Sending…"
                      : "Resend sign-in link"}
                </Primary>
                <button
                  type="button"
                  onClick={() => {
                    setErr("");
                    setStep(2);
                  }}
                  className="mt-3 w-full py-2 text-sm font-semibold text-primary"
                >
                  Use a different email
                </button>
              </>
            )}

            {id === "profile" && (
              <>
                <h1 className="text-2xl font-extrabold">Set up your profile</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add a display name and town or city before people can discover you. A photo is
                  optional.
                </p>
                <div className="mt-6 flex items-center gap-4">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Your profile photo"
                      className="size-20 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid size-20 place-items-center rounded-full bg-secondary text-2xl font-bold text-primary">
                      {displayName.trim().slice(0, 1).toUpperCase() || "M"}
                    </span>
                  )}
                  <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-semibold">
                    {isBusy ? "Working…" : avatarPath ? "Change photo" : "Add photo (optional)"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={isBusy}
                      className="sr-only"
                      onChange={(event) => {
                        void uploadProfilePhoto(event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                <label className="mt-6 block space-y-2 text-sm font-semibold">
                  <span>Display name</span>
                  <input
                    required
                    minLength={2}
                    maxLength={40}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                    className="w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="mt-4 block space-y-2 text-sm font-semibold">
                  <span>Town or city</span>
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    autoComplete="address-level2"
                    placeholder="e.g. Nairobi"
                    className="w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <Primary disabled={isBusy} onClick={completeProfile}>
                  {isBusy ? "Saving…" : "Continue"}
                </Primary>
              </>
            )}

            {id === "intent" && (
              <>
                <h1 className="text-2xl font-extrabold">What are you here for?</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick one or both. Dating stays off until you turn it on.
                </p>
                <div
                  role="group"
                  aria-label="Choose your interests"
                  aria-describedby={err ? "welcome-error" : undefined}
                  className="mt-6 space-y-3"
                >
                  {[
                    { k: "Friends", icon: Users, d: "Meet people who share your interests" },
                    { k: "Dating", icon: Heart, d: "Swipe and match with people nearby" },
                  ].map(({ k, icon: Icon, d }) => {
                    const on = intent.includes(k);
                    return (
                      <button
                        key={k}
                        aria-pressed={on}
                        onClick={() =>
                          setIntent(on ? intent.filter((x) => x !== k) : [...intent, k])
                        }
                        className={`flex w-full items-center gap-4 rounded-3xl border-2 p-4 text-left transition ${on ? "border-primary bg-secondary" : ""}`}
                      >
                        <span
                          className={`grid size-12 place-items-center rounded-2xl ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                        >
                          <Icon className="size-5" />
                        </span>
                        <span>
                          <span className="block font-semibold">{k}</span>
                          <span className="text-sm text-muted-foreground">{d}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Primary
                  disabled={isBusy}
                  onClick={() => (intent.length ? finish() : setErr("Choose at least one."))}
                >
                  Start exploring
                </Primary>
              </>
            )}

            {err && (
              <p
                id="welcome-error"
                className="mt-4 text-sm font-medium text-destructive"
                role="alert"
              >
                {err}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Primary({
  onClick,
  children,
  disabled = false,
}: {
  onClick: () => void | Promise<void>;
  children: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void onClick();
      }}
      disabled={disabled}
      className="mt-8 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground hover:bg-primary-pressed disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}
