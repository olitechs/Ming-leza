import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { exchangeEmailMagicLink, getMyAccess } from "@/lib/auth/server";

export const Route = createFileRoute("/auth-callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search["code"] === "string" ? search["code"] : "",
    tokenHash: typeof search["token_hash"] === "string" ? search["token_hash"] : "",
    type: typeof search["type"] === "string" ? search["type"] : "",
    next: search["next"] === "reset-password" ? "reset-password" : "",
    error:
      typeof search["error_description"] === "string"
        ? search["error_description"]
        : typeof search["error"] === "string"
          ? search["error"]
          : "",
  }),
  head: () => ({ meta: [{ title: "Signing in · Mingleza" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const { code, tokenHash, type, error, next } = Route.useSearch();
  const [message, setMessage] = useState("Completing your secure sign-in…");

  useEffect(() => {
    let active = true;
    const returnToSignIn = () => {
      window.location.replace("/welcome?authError=link_expired");
    };

    if (error) {
      returnToSignIn();
      return () => {
        active = false;
      };
    }

    if (!code && !(tokenHash && ["email", "signup", "recovery"].includes(type))) {
      returnToSignIn();
      return () => {
        active = false;
      };
    }

    exchangeEmailMagicLink({
      data: code ? { code } : { tokenHash, type: type as "email" | "signup" | "recovery" },
    })
      .then(async (result) => {
        if (!active) return;
        if (!result.ok) {
          setMessage(result.message);
          returnToSignIn();
          return;
        }
        // Returning adults go straight in; new members continue to the age step.
        const access = await getMyAccess();
        window.location.replace(
          access.authenticated && access.adultVerified ? "/" : "/welcome?authComplete=true",
        );
      })
      .catch(() => {
        if (active) {
          setMessage("We could not complete sign-in. Please request a fresh link.");
          returnToSignIn();
        }
      });

    return () => {
      active = false;
    };
  }, [code, tokenHash, type, error, next]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-card">
        <h1 className="text-2xl font-extrabold">Sign in to Mingleza</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground" role="status">
          {message}
        </p>
        <a
          href="/welcome?authError=link_expired"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
        >
          Return to Mingleza
        </a>
      </section>
    </main>
  );
}
