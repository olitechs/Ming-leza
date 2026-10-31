import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff, Heart, LockKeyhole } from "lucide-react";
import {
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  updateMyPassword,
  getMyAccess,
} from "@/lib/auth/server";

type Mode = "signup" | "signin" | "forgot" | "reset";

const emailInputSchema = z.string().trim().email("Enter a valid email address.").max(254);

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search["mode"] === "signin" || search["mode"] === "forgot" || search["mode"] === "reset"
      ? search["mode"]
      : "signup") as Mode,
  }),
  head: () => ({
    meta: [
      { title: "Create an account or sign in · Mingleza" },
      {
        name: "description",
        content: "Create your Mingleza account or securely sign in. Adults 18+ only.",
      },
    ],
  }),
  component: LoginPage,
});

const countries = [
  ["KE", "Kenya"],
  ["UG", "Uganda"],
  ["TZ", "Tanzania"],
  ["RW", "Rwanda"],
  ["ET", "Ethiopia"],
  ["NG", "Nigeria"],
  ["GH", "Ghana"],
  ["ZA", "South Africa"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
] as const;

const ageBrackets = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;

function LoginPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("KE");
  const [ageBracket, setAgeBracket] = useState<(typeof ageBrackets)[number]>("18-24");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const changeMode = (next: Mode) => {
    setMode(next);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    window.history.replaceState(null, "", next === "signup" ? "/login" : `/login?mode=${next}`);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (mode !== "reset") {
      const emailValidation = emailInputSchema.safeParse(normalizedEmail);
      if (!emailValidation.success) {
        setError(emailValidation.error.issues[0]?.message ?? "Enter a valid email address.");
        return;
      }
    }

    if (mode === "signup") {
      if (fullName.trim().length < 2) {
        setError("Enter your full name.");
        return;
      }
      if (password.length < 6) {
        setError("Your password must contain at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("The passwords do not match.");
        return;
      }
      if (!phone.trim()) {
        setError("Enter your phone number, including the country code.");
        return;
      }
      setBusy(true);
      try {
        const result = await signUpWithPassword({
          data: {
            fullName: fullName.trim(),
            email: normalizedEmail,
            password,
            phone: phone.trim(),
            countryCode,
            ageBracket,
          },
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        if (result.requiresEmailConfirmation) {
          setMessage(
            "Account request received. Check your email to verify the address, then return here to sign in with your password. You must still complete Mingleza's 18+ verification.",
          );
          setMode("signin");
          window.history.replaceState(null, "", "/login?mode=signin");
          return;
        }
        window.location.replace("/welcome?authComplete=true");
      } catch {
        setError("We could not create your account. Please try again.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "forgot") {
      if (!normalizedEmail) {
        setError("Enter your email address first.");
        return;
      }
      setBusy(true);
      try {
        const result = await requestPasswordReset({ data: { email: normalizedEmail } });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setMessage(
          "If an account exists for that address, a password-reset email will arrive shortly. Open it in this browser to continue.",
        );
      } catch {
        setError("We could not send a reset email. Please try again later.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "reset") {
      if (password.length < 6) {
        setError("Your new password must contain at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("The passwords do not match.");
        return;
      }
      setBusy(true);
      try {
        const result = await updateMyPassword({ data: { password } });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setMessage("Your password has been updated. You can now sign in.");
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
        window.history.replaceState(null, "", "/login?mode=signin");
      } catch {
        setError("Password could not be updated. Request a new reset email and try again.");
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const result = await signInWithPassword({ data: { email: normalizedEmail, password } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const access = await getMyAccess();
      window.location.replace(
        access.authenticated && access.adultVerified ? "/" : "/welcome?authComplete=true",
      );
    } catch {
      setError("We could not sign you in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "signup"
      ? "Create your account"
      : mode === "forgot"
        ? "Reset your password"
        : mode === "reset"
          ? "Set a new password"
          : "Welcome back";
  const description =
    mode === "signup"
      ? "Meet your people. Mingleza is for adults aged 18 and over."
      : mode === "forgot"
        ? "We will email a secure reset link if an account exists for your address."
        : mode === "reset"
          ? "Choose a new password for your Mingleza account."
          : "Sign in with your email and password.";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-card sm:p-9">
        <a
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to Mingleza
        </a>
        <div className="mt-5 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Heart className="size-6 fill-current" />
          </span>
          <div>
            <p className="font-display text-xl font-extrabold">Mingleza</p>
            <p className="text-sm text-muted-foreground">Friendship and dating, for adults</p>
          </div>
        </div>
        <div className="mt-7">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>

        {(mode === "signup" || mode === "signin") && (
          <div
            className="mt-6 grid grid-cols-2 rounded-full bg-secondary p-1"
            aria-label="Account action"
          >
            <button
              type="button"
              onClick={() => changeMode("signup")}
              className={`min-h-11 rounded-full px-3 text-sm font-bold ${mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              aria-pressed={mode === "signup"}
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => changeMode("signin")}
              className={`min-h-11 rounded-full px-3 text-sm font-bold ${mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              aria-pressed={mode === "signin"}
            >
              Sign in
            </button>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <Field
                label="Full name"
                name="fullName"
                value={fullName}
                onChange={setFullName}
                autoComplete="name"
                required
                placeholder="Your full name"
              />
              <Field
                label="Phone number"
                name="phone"
                value={phone}
                onChange={setPhone}
                autoComplete="tel"
                required
                placeholder="+254 712 345 678"
                type="tel"
              />
              <label className="block text-sm font-semibold" htmlFor="country">
                Country
                <select
                  id="country"
                  name="country"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  required
                  className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-3 font-normal"
                >
                  {countries.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold" htmlFor="ageBracket">
                Age bracket <span className="font-normal text-muted-foreground">(18+ only)</span>
                <select
                  id="ageBracket"
                  name="ageBracket"
                  value={ageBracket}
                  onChange={(e) => setAgeBracket(e.target.value as (typeof ageBrackets)[number])}
                  required
                  className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-3 font-normal"
                >
                  {ageBrackets.map((bracket) => (
                    <option key={bracket} value={bracket}>
                      {bracket}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <Field
            label="Email address"
            name="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
            placeholder="you@example.com"
            type="email"
          />
          {mode !== "forgot" && (
            <label className="block text-sm font-semibold" htmlFor="password">
              {mode === "reset" ? "New password" : "Password"}
              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={128}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder={mode === "reset" ? "At least 6 characters" : "At least 6 characters"}
                  className="min-h-12 w-full rounded-xl border border-input bg-background px-3 pr-12 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>
          )}
          {(mode === "signup" || mode === "reset") && (
            <label className="block text-sm font-semibold" htmlFor="confirmPassword">
              Confirm password
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Enter the password again"
                className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="rounded-xl border border-primary/20 bg-secondary p-3 text-sm leading-6"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground transition hover:bg-primary-pressed disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LockKeyhole aria-hidden="true" className="size-4" />{" "}
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset email"
                  : mode === "reset"
                    ? "Update password"
                    : "Sign in"}
          </button>
        </form>

        {mode === "signin" && (
          <button
            type="button"
            onClick={() => changeMode("forgot")}
            className="mt-4 min-h-11 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </button>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <button
            type="button"
            onClick={() => changeMode("signin")}
            className="mt-4 min-h-11 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </button>
        )}
        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          Mingleza is strictly for adults aged 18+. Selecting an age bracket does not replace the
          required adult-verification step. Passwords are handled by Supabase Auth and are never
          stored in your profile.
        </p>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  autoComplete,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-semibold" htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        maxLength={type === "email" ? 254 : 120}
        className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}
