import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getMyAccess, signInWithPassword } from "@/lib/auth/server";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in · Mingleza" },
      { name: "description", content: "Log in to your Mingleza account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await signInWithPassword({
        data: { email: email.trim(), password },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const access = await getMyAccess();
      window.location.replace(
        access.authenticated && access.adultVerified ? "/" : "/welcome?authComplete=true",
      );
    } catch {
      setError("We could not sign you in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="w-full max-w-md rounded-[32px] bg-card p-8 shadow-card">
        <a href="/welcome" className="text-sm font-semibold text-primary">
          ← Back to Mingleza
        </a>
        <h1 className="mt-6 text-3xl font-extrabold">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Log in with the email address and password you used when creating your account.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-2xl border bg-background px-4 py-4 font-normal outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="mt-2 w-full rounded-2xl border bg-background px-4 py-4 font-normal outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground hover:bg-primary-pressed disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          New to Mingleza?{" "}
          <a href="/welcome" className="font-semibold text-primary">
            Create an account
          </a>
        </p>
      </section>
    </main>
  );
}
