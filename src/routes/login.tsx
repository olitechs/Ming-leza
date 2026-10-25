import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { getMyAccess } from "@/lib/auth/server";
import { signInWithPassword } from "@/lib/auth/password.server";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in · Mingleza" },
      {
        name: "description",
        content: "Log in to your Mingleza account with your email and password.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await signInWithPassword({ data: { email: email.trim(), password } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const access = await getMyAccess();
      if (access.authenticated && access.adultVerified) {
        await nav({ to: "/" });
      } else {
        await nav({ to: "/welcome", search: { authComplete: true, authError: "" } });
      }
    } catch {
      setError("We could not sign you in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <section className="w-full max-w-md rounded-[32px] border bg-card p-6 shadow-card sm:p-8">
        <button
          type="button"
          onClick={() =>
            void nav({
              to: "/welcome",
              search: { authComplete: false, authError: "", mode: "signin" },
            })
          }
          className="mb-7 inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to sign in options
        </button>
        <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <LockKeyhole className="size-6" />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Log in with the email and password you used when you created your account.
        </p>
        <form onSubmit={(event) => void submit(event)} className="mt-7 space-y-5">
          <label className="block space-y-2 text-sm font-semibold">
            <span>Email address</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border bg-background py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-ring"
              />
            </span>
          </label>
          <label className="block space-y-2 text-sm font-semibold">
            <span>Password</span>
            <span className="relative block">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={256}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-2xl border bg-background py-3.5 pl-4 pr-12 outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>
          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-sm font-medium text-primary" role="status">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground hover:bg-primary-pressed disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Mingleza?{" "}
          <a href="/welcome" className="font-semibold text-primary hover:underline">
            Create an account
          </a>
        </p>
      </section>
    </main>
  );
}
