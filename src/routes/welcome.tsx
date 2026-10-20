import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { sendOtp, verifyOtp, verifyAdult, setMyIntent } from "@/lib/auth/server";
import { ArrowLeft, Heart, Users, ShieldCheck } from "lucide-react";
import p1 from "@/assets/p1.jpg";
import p3 from "@/assets/p3.jpg";
import p4 from "@/assets/p4.jpg";

export const Route = createFileRoute("/welcome")({
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

const steps = ["welcome", "age", "phone", "otp", "intent"] as const;

function Welcome() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isBusy, setIsBusy] = useState(false);
  const [intent, setIntent] = useState<string[]>(["Friends"]);
  const [err, setErr] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const next = () => {
    setErr("");
    setStep((s) => s + 1);
  };

  const checkAge = () => {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dob)) {
      setErr("Enter your date of birth.");
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
            .replace(/^\\+254/, "")
            .replace(/\\D/g, "")
            .replace(/^0/, "")
        : email.trim();
    if (authMethod === "phone" && !/^\\+254[17]\\d{8}$/.test(identifier)) {
      setErr("Enter a valid Kenyan number, e.g. 712 345 678.");
      return;
    }
    setIsBusy(true);
    try {
      const result = await sendOtp({ data: { method: authMethod, identifier } });
      if (!result.ok) {
        setErr(result.message);
        return;
      }
      if (authMethod === "phone") setPhone(identifier);
      else setEmail(identifier);
      next();
    } catch {
      setErr("We could not send a code. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const checkOtp = async () => {
    const token = otp.join("");
    if (token.length !== 6) {
      setErr("Enter the 6-digit code.");
      return;
    }
    setErr("");
    setIsBusy(true);
    try {
      const identifier = authMethod === "phone" ? phone : email;
      const authResult = await verifyOtp({ data: { method: authMethod, identifier, token } });
      if (!authResult.ok) {
        setErr(authResult.message);
        return;
      }
      const ageResult = await verifyAdult({ data: { dateOfBirth: dob } });
      if (!ageResult.ok) {
        setErr(ageResult.message);
        return;
      }
      next();
    } catch {
      setErr("We could not verify your code. Please try again.");
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-card shadow-card">
        {id === "welcome" ? (
          <div>
            <div className="relative h-80 bg-brand">
              <img
                src={p1}
                alt=""
                className="absolute left-8 top-10 h-48 w-36 -rotate-6 rounded-3xl border-4 border-card object-cover shadow-card"
              />
              <img
                src={p3}
                alt=""
                className="absolute right-8 top-6 h-48 w-36 rotate-6 rounded-3xl border-4 border-card object-cover shadow-card"
              />
              <img
                src={p4}
                alt=""
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
                  setErr("");
                  setStep(1);
                }}
                className="mt-3 w-full py-2 text-sm font-semibold text-primary"
              >
                I already have an account
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8">
            <div className="mb-8 flex items-center gap-4">
              <button
                onClick={() => {
                  setErr("");
                  setStep((s) => s - 1);
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
                  Mingleza is adults only. Your birthday is never shown — only your age.
                </p>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="mt-6 w-full rounded-2xl border bg-background px-4 py-4 outline-none focus:ring-2 focus:ring-ring"
                />
                <Primary onClick={checkAge}>Continue</Primary>
              </>
            )}

            {id === "phone" && (
              <>
                <h1 className="text-2xl font-extrabold">Verify your account</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We’ll send a one-time code. You can use SMS or email.
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMethod("phone")}
                    className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold ${authMethod === "phone" ? "border-primary bg-secondary" : ""}`}
                  >
                    Phone / SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMethod("email")}
                    className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold ${authMethod === "email" ? "border-primary bg-secondary" : ""}`}
                  >
                    Email fallback
                  </button>
                </div>
                {authMethod === "phone" ? (
                  <div className="mt-6 flex gap-2">
                    <span className="grid place-items-center rounded-2xl border bg-muted px-4 font-semibold">
                      🇰🇪 +254
                    </span>
                    <input
                      aria-label="Kenyan phone number"
                      inputMode="tel"
                      autoComplete="tel-national"
                      value={phone.replace(/^\\+254/, "")}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="712 345 678"
                      className="min-w-0 flex-1 rounded-2xl border bg-background px-4 py-4 outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ) : (
                  <input
                    aria-label="Email address"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-6 w-full rounded-2xl border bg-background px-4 py-4 outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
                <Primary disabled={isBusy} onClick={checkPhone}>
                  {isBusy ? "Sending code…" : "Send code"}
                </Primary>
              </>
            )}

            {id === "otp" && (
              <>
                <h1 className="text-2xl font-extrabold">Enter verification code</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Code sent to {authMethod === "phone" ? phone : email}. Enter all 6 digits.
                </p>
                <div className="mt-6 flex justify-between gap-2">
                  {otp.map((v, k) => (
                    <input
                      key={k}
                      ref={(el) => {
                        refs.current[k] = el;
                      }}
                      aria-label={`Verification digit ${k + 1}`}
                      value={v}
                      inputMode="numeric"
                      autoComplete={k === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\\D/g, "").slice(-1);
                        const n = [...otp];
                        n[k] = d;
                        setOtp(n);
                        if (d && k < 5) refs.current[k + 1]?.focus();
                      }}
                      className={`min-w-0 size-12 rounded-xl border-2 text-center font-display text-xl font-bold outline-none focus:border-primary sm:size-14 ${v ? "border-primary bg-secondary" : "bg-background"}`}
                    />
                  ))}
                </div>
                <Primary disabled={isBusy} onClick={checkOtp}>
                  {isBusy ? "Verifying…" : "Verify code"}
                </Primary>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setOtp(["", "", "", "", "", ""]);
                    void checkPhone();
                  }}
                  className="mt-3 w-full text-sm font-semibold text-primary disabled:opacity-50"
                >
                  Resend code
                </button>
              </>
            )}

            {id === "intent" && (
              <>
                <h1 className="text-2xl font-extrabold">What are you here for?</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick one or both. Dating stays off until you turn it on.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    { k: "Friends", icon: Users, d: "Meet people who share your interests" },
                    { k: "Dating", icon: Heart, d: "Swipe and match with people nearby" },
                  ].map(({ k, icon: Icon, d }) => {
                    const on = intent.includes(k);
                    return (
                      <button
                        key={k}
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
                  onClick={() => (intent.length ? finish() : setErr("Choose at least one."))}
                >
                  Start exploring
                </Primary>
              </>
            )}

            {err && <p className="mt-4 text-sm font-medium text-destructive">{err}</p>}
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
