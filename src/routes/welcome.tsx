import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [intent, setIntent] = useState<string[]>(["Friends"]);
  const [err, setErr] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const next = () => {
    setErr("");
    setStep((s) => s + 1);
  };

  const checkAge = () => {
    const d = new Date(dob);
    if (!dob || isNaN(d.getTime())) return setErr("Enter your date of birth.");
    const age = (Date.now() - d.getTime()) / (365.25 * 864e5);
    if (age < 18) return setErr("Mingleza is for adults 18 and over.");
    next();
  };
  const checkPhone = () =>
    /^7\d{8}$|^1\d{8}$/.test(phone.replace(/\s/g, ""))
      ? next()
      : setErr("Enter a valid Kenyan number, e.g. 712 345 678.");
  const checkOtp = () => (otp.join("").length === 4 ? next() : setErr("Enter the 4-digit code."));
  const finish = () => nav({ to: "/" });

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
                onClick={finish}
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
                <h1 className="text-2xl font-extrabold">Your phone number</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We'll send you a code to verify it's you.
                </p>
                <div className="mt-6 flex gap-2">
                  <span className="grid place-items-center rounded-2xl border bg-muted px-4 font-semibold">
                    🇰🇪 +254
                  </span>
                  <input
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="712 345 678"
                    className="flex-1 rounded-2xl border bg-background px-4 py-4 outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <Primary onClick={checkPhone}>Send code</Primary>
              </>
            )}

            {id === "otp" && (
              <>
                <h1 className="text-2xl font-extrabold">Enter verification code</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sent to +254 {phone}. (Demo: any 4 digits work.)
                </p>
                <div className="mt-6 flex justify-between gap-3">
                  {otp.map((v, k) => (
                    <input
                      key={k}
                      ref={(el) => {
                        refs.current[k] = el;
                      }}
                      value={v}
                      inputMode="numeric"
                      maxLength={1}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, "");
                        const n = [...otp];
                        n[k] = d;
                        setOtp(n);
                        if (d && k < 3) refs.current[k + 1]?.focus();
                      }}
                      className={`size-16 rounded-2xl border-2 text-center font-display text-2xl font-bold outline-none focus:border-primary ${v ? "border-primary bg-secondary" : "bg-background"}`}
                    />
                  ))}
                </div>
                <Primary onClick={checkOtp}>Verify</Primary>
                <button className="mt-3 w-full text-sm font-semibold text-primary">
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

function Primary({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-8 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground hover:bg-primary-pressed"
    >
      {children}
    </button>
  );
}
