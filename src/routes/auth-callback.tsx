import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { completeAuthCallback, updatePassword } from "@/lib/auth/password";
import { getMyAccess } from "@/lib/auth/server";

export const Route = createFileRoute("/auth-callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search["code"] === "string" ? search["code"] : "",
    tokenHash: typeof search["token_hash"] === "string" ? search["token_hash"] : "",
    type: ["signup", "recovery"].includes(String(search["type"]))
      ? (search["type"] as "signup" | "recovery")
      : undefined,
    flow: ["signup", "recovery", "upgrade"].includes(String(search["flow"]))
      ? (search["flow"] as "signup" | "recovery" | "upgrade")
      : undefined,
    error:
      typeof search["error_description"] === "string"
        ? search["error_description"]
        : typeof search["error"] === "string"
          ? search["error"]
          : "",
  }),
  head: () => ({ meta: [{ title: "Confirming your account · Mingleza" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const { code, tokenHash, type, flow, error: callbackError } = Route.useSearch();
  const nav = useNavigate();
  const [message, setMessage] = useState("Confirming your secure link…");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [failure, setFailure] = useState("");

  useEffect(() => {
    let active = true;
    if (callbackError) {
      setFailure(
        "This confirmation or reset link is invalid, expired, or already used. Sign in or request a new password reset.",
      );
      return () => {
        active = false;
      };
    }
    void completeAuthCallback({
      data: { code: code || undefined, tokenHash: tokenHash || undefined, type, flow },
    })
      .then(async (result) => {
        if (!active) return;
        if (!result.ok) {
          setFailure(result.message);
          return;
        }
        if (result.next === "reset-password") {
          setResetMode(true);
          setMessage("Choose a new password.");
          return;
        }
        const access = await getMyAccess();
        if (!active) return;
        if (access.authenticated && access.adultVerified) await nav({ to: "/" });
        else window.location.replace("/welcome?authComplete=true");
      })
      .catch(() => {
        if (active)
          setFailure("We could not confirm this link. Request a new email and try again.");
      });
    return () => {
      active = false;
    };
  }, [code, tokenHash, type, flow, callbackError, nav]);

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailure("");
    if (password.length < 6) {
      setFailure("Use a password with at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setFailure("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await updatePassword({ data: { password } });
      if (!result.ok) {
        setFailure(result.message);
        return;
      }
      setMessage("Your password has been updated. You can now sign in with it.");
      setResetMode(false);
      setTimeout(() => {
        window.location.replace("/welcome?mode=signin");
      }, 900);
    } catch {
      setFailure("We could not update your password. Request a new reset email and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <section className="w-full max-w-md rounded-[32px] bg-card p-6 text-center shadow-card sm:p-8">
        <h1 className="text-2xl font-extrabold">
          {resetMode ? "Set a new password" : "Mingleza account"}
        </h1>
        {resetMode ? (
          <form className="mt-6 space-y-4 text-left" onSubmit={savePassword}>
            <label className="block text-sm font-semibold">
              New password
              <span className="relative block">
                <input
                  className="mt-2 w-full rounded-2xl border bg-background px-4 py-3 pr-20"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-primary"
                  onClick={() => setShow((value) => !value)}
                  aria-pressed={show}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </span>
            </label>
            <label className="block text-sm font-semibold">
              Confirm new password
              <input
                className="mt-2 w-full rounded-2xl border bg-background px-4 py-3"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                minLength={6}
                maxLength={128}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </label>
            {failure && (
              <p className="text-sm text-destructive" role="alert">
                {failure}
              </p>
            )}
            <button
              className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"
              disabled={busy}
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm leading-6 text-muted-foreground" role="status">
            {failure || message}
          </p>
        )}
        {failure && !resetMode && (
          <a
            href="/welcome?mode=signin"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            Return to sign in
          </a>
        )}
        {!resetMode && !failure && !message.startsWith("Your password") && (
          <p className="mt-4 text-sm text-muted-foreground">
            Please wait while we securely verify your link.
          </p>
        )}
      </section>
    </main>
  );
}
