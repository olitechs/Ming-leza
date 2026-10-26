import { useEffect, useId, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  ageBrackets,
  checkSignupEligibility,
  getSignupCountries,
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/auth/password";
import { getMyAccess } from "@/lib/auth/server";

const ageOptions = [
  ["under-13", "Under 13"],
  ["13-17", "13–17"],
  ["18-24", "18–24"],
  ["25-34", "25–34"],
  ["35-44", "35–44"],
  ["45-54", "45–54"],
  ["55-64", "55–64"],
  ["65-plus", "65 and above"],
] as const;

type Screen = "eligibility" | "signup" | "signup-sent" | "signin" | "recovery" | "recovery-sent";
type Country = { code: string; name: string };
type AgeBracket = (typeof ageBrackets)[number];

const fieldClass =
  "mt-2 w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";
const labelClass = "block text-sm font-semibold";

export function PasswordAuthFlow({ initialMode }: { initialMode: "signup" | "signin" }) {
  const nav = useNavigate();
  const countryListId = useId();
  const [screen, setScreen] = useState<Screen>(initialMode === "signin" ? "signin" : "eligibility");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [ageBracket, setAgeBracket] = useState<AgeBracket | "">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [eligibilityToken, setEligibilityToken] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countryName, setCountryName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    let active = true;
    void getSignupCountries().then((result) => {
      if (!active) return;
      setCountries(result.ok ? result.countries : []);
      setCountriesLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const selectedAgeIsAdult = ["18-24", "25-34", "35-44", "45-54", "55-64", "65-plus"].includes(
    ageBracket,
  );

  const verifySignupAge = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!ageBracket) {
      setError("Choose your age bracket to continue.");
      return;
    }
    if (!selectedAgeIsAdult) {
      setError(
        "Mingleza is only available to adults aged 18 and over. No account details have been submitted.",
      );
      return;
    }
    if (!dateOfBirth) {
      setError("Enter your date of birth to confirm you are 18 or older.");
      return;
    }
    setIsBusy(true);
    try {
      const result = await checkSignupEligibility({ data: { dateOfBirth, ageBracket } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEligibilityToken(result.eligibilityToken);
      setScreen("signup");
    } catch {
      setError("We could not confirm your eligibility. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const submitSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (fullName.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (password.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (!countryCode) {
      setError("Choose a country from the searchable list.");
      return;
    }
    const parsedPhone = parsePhoneNumberFromString(phone.trim(), countryCode as never);
    if (!parsedPhone || !parsedPhone.isValid() || parsedPhone.country !== countryCode) {
      setError(
        "Enter a valid phone number for the selected country, including its dialing code if needed.",
      );
      return;
    }
    if (!eligibilityToken) {
      setError("Confirm that you are 18 or older before creating an account.");
      setScreen("eligibility");
      return;
    }
    if (!ageBracket) {
      setError("Choose your age bracket before creating an account.");
      setScreen("eligibility");
      return;
    }
    setIsBusy(true);
    try {
      const result = await signUpWithPassword({
        data: {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          phoneE164: parsedPhone.number,
          countryCode,
          ageBracket,
          eligibilityToken,
        },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPassword("");
      setConfirmPassword("");
      if (result.needsEmailConfirmation) {
        setScreen("signup-sent");
        return;
      }
      await nav({ to: "/" });
    } catch {
      setError("We could not create your account. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const submitSignin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsBusy(true);
    try {
      const result = await signInWithPassword({
        data: { email: email.trim().toLowerCase(), password },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const access = await getMyAccess();
      if (access.authenticated && access.adultVerified) {
        await nav({ to: "/" });
      } else {
        window.location.assign("/welcome?authComplete=true");
      }
    } catch {
      setError("Email or password is incorrect. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const submitRecovery = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsBusy(true);
    try {
      const result = await requestPasswordReset({ data: { email: email.trim().toLowerCase() } });
      if (result.ok) setScreen("recovery-sent");
      else setError("We could not start password recovery. Please try again.");
    } catch {
      setError("We could not start password recovery. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const chooseCountry = (value: string) => {
    setCountryName(value);
    const match = countries.find(
      (country) => country.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
    );
    setCountryCode(match?.code ?? "");
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <section
        className="w-full max-w-md rounded-[32px] bg-card p-6 shadow-card sm:p-8"
        aria-busy={isBusy}
      >
        <a href="/" className="text-sm font-semibold text-primary">
          Mingleza
        </a>

        {screen === "eligibility" && (
          <>
            <h1 className="mt-5 text-2xl font-extrabold">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Mingleza is for adults 18 and over. Your age bracket is not treated as age
              verification. We first check eligibility; no name, email, phone, password, or country
              is submitted at this step. Your date of birth is not stored.
            </p>
            <form className="mt-6 space-y-5" onSubmit={verifySignupAge} noValidate>
              <label className={labelClass}>
                Age bracket
                <select
                  className={fieldClass}
                  value={ageBracket}
                  onChange={(event) => {
                    setAgeBracket(event.target.value as AgeBracket | "");
                    setEligibilityToken("");
                    setError("");
                  }}
                  required
                >
                  <option value="">Choose an age bracket</option>
                  {ageOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {!selectedAgeIsAdult && ageBracket && (
                <p className="rounded-2xl bg-secondary p-4 text-sm" role="status">
                  Mingleza is an adults-only service. We do not request your name, email, phone,
                  password, or country for under-18 selections.
                </p>
              )}
              {selectedAgeIsAdult && (
                <label className={labelClass}>
                  Date of birth
                  <input
                    className={fieldClass}
                    type="date"
                    value={dateOfBirth}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                    autoComplete="bday"
                    required
                  />
                  <span className="mt-2 block text-xs font-normal text-muted-foreground">
                    Used only for the 18+ check. Only the result and check time are retained.
                  </span>
                </label>
              )}
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <button
                className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"
                disabled={isBusy || !selectedAgeIsAdult}
              >
                {isBusy ? "Checking…" : "Continue"}
              </button>
            </form>
            <button
              type="button"
              className="mt-4 w-full py-2 text-sm font-semibold text-primary"
              onClick={() => {
                setError("");
                setScreen("signin");
              }}
            >
              Already have an account? Sign in
            </button>
          </>
        )}

        {screen === "signup" && (
          <>
            <h1 className="mt-5 text-2xl font-extrabold">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Use an email address and password to sign up. Your full name and phone number are
              private account details.
            </p>
            <form className="mt-6 space-y-4" onSubmit={submitSignup} noValidate>
              <label className={labelClass}>
                Full name
                <input
                  className={fieldClass}
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={120}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </label>
              <label className={labelClass}>
                Email address
                <input
                  className={fieldClass}
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <PasswordField
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                show={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />
              <PasswordField
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                show={showConfirmation}
                onToggle={() => setShowConfirmation((value) => !value)}
              />
              <label className={labelClass}>
                Country
                <input
                  className={fieldClass}
                  type="text"
                  list={countryListId}
                  autoComplete="country-name"
                  value={countryName}
                  onChange={(event) => chooseCountry(event.target.value)}
                  placeholder={
                    countriesLoading ? "Loading countries…" : "Search supported countries"
                  }
                  required
                  disabled={countriesLoading || countries.length === 0}
                />
                <datalist id={countryListId}>
                  {countries.map((country) => (
                    <option key={country.code} value={country.name} />
                  ))}
                </datalist>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Country is shown with your Mingleza profile. Your full name and phone remain
                  private.
                </span>
                {!countriesLoading && countries.length === 0 && (
                  <span className="mt-1 block text-xs font-normal text-destructive">
                    Countries are unavailable. Please try again later.
                  </span>
                )}
              </label>
              <label className={labelClass}>
                Phone number
                <input
                  className={fieldClass}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={
                    countryCode === "KE" ? "+254 712 345 678" : "+[country code] [number]"
                  }
                  required
                />
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Use the selected country’s dialing code; numbers are validated internationally.
                </span>
              </label>
              <div className="rounded-2xl bg-muted p-4 text-sm">
                <span className="font-semibold">Age bracket:</span>{" "}
                {ageOptions.find(([value]) => value === ageBracket)?.[1] ?? "Not selected"}
                <button
                  type="button"
                  className="ml-2 font-semibold text-primary underline"
                  onClick={() => {
                    setEligibilityToken("");
                    setScreen("eligibility");
                  }}
                >
                  Change
                </button>
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <button
                className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"
                disabled={isBusy || countriesLoading || countries.length === 0}
              >
                {isBusy ? "Creating account…" : "Create account"}
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              By creating an account, you agree to our{" "}
              <a href="/terms" className="underline">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="underline">
                Privacy Policy
              </a>
              .
            </p>
            <button
              type="button"
              className="mt-3 w-full py-2 text-sm font-semibold text-primary"
              onClick={() => {
                setError("");
                setScreen("signin");
              }}
            >
              Already registered? Sign in
            </button>
          </>
        )}

        {screen === "signin" && (
          <>
            <h1 className="mt-5 text-2xl font-extrabold">Sign in to Mingleza</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your registered email and password.
            </p>
            <form className="mt-6 space-y-4" onSubmit={submitSignin} noValidate>
              <label className={labelClass}>
                Email address
                <input
                  className={fieldClass}
                  type="email"
                  autoComplete="username"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <PasswordField
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                show={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <button
                className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"
                disabled={isBusy}
              >
                {isBusy ? "Signing in…" : "Sign in"}
              </button>
            </form>
            <button
              type="button"
              className="mt-3 w-full py-2 text-sm font-semibold text-primary"
              onClick={() => {
                setError("");
                setScreen("recovery");
              }}
            >
              Forgot password?
            </button>
            <button
              type="button"
              className="mt-1 w-full py-2 text-sm font-semibold text-primary"
              onClick={() => {
                setError("");
                setScreen("eligibility");
              }}
            >
              Create a new account
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Email/password sessions persist in the existing secure Supabase session. There is no
              separate Remember me option.
            </p>
          </>
        )}

        {screen === "recovery" && (
          <>
            <h1 className="mt-5 text-2xl font-extrabold">Reset your password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email. For security, we will not reveal whether an account exists.
            </p>
            <form className="mt-6 space-y-4" onSubmit={submitRecovery} noValidate>
              <label className={labelClass}>
                Email address
                <input
                  className={fieldClass}
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <button
                className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"
                disabled={isBusy}
              >
                {isBusy ? "Sending…" : "Send password-reset email"}
              </button>
            </form>
            <button
              type="button"
              className="mt-3 w-full py-2 text-sm font-semibold text-primary"
              onClick={() => {
                setError("");
                setScreen("signin");
              }}
            >
              Back to sign in
            </button>
          </>
        )}

        {screen === "signup-sent" && (
          <div role="status">
            <h1 className="mt-5 text-2xl font-extrabold">Check your email</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              If registration can be completed for{" "}
              <strong className="break-all text-foreground">{email}</strong>, a confirmation email
              has been sent. If you already have an account, sign in or use password recovery. Do
              not share the confirmation link.
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground"
              onClick={() => setScreen("signin")}
            >
              Go to sign in
            </button>
          </div>
        )}

        {screen === "recovery-sent" && (
          <div role="status">
            <h1 className="mt-5 text-2xl font-extrabold">Check your email</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              If an account can be recovered with{" "}
              <strong className="break-all text-foreground">{email}</strong>, password-reset
              instructions will be sent. The reset link is single-use and expires according to your
              authentication provider settings.
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground"
              onClick={() => setScreen("signin")}
            >
              Return to sign in
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <label className={labelClass}>
      {label}
      <span className="relative block">
        <input
          className={`${fieldClass} pr-20`}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={autoComplete === "new-password" ? 6 : undefined}
          maxLength={128}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-primary"
          onClick={onToggle}
          aria-label={`${show ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={show}
        >
          {show ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}
