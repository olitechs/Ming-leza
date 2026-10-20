import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { exchangeEmailMagicLink } from "@/lib/auth/server";

export const Route = createFileRoute("/auth-callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search["code"] === "string" ? search.code : "",
    error:
      typeof search["error_description"] === "string"
        ? search["error"]_description
        : typeof search.error === "string"
          ? search.error
          : "",
  }),
  head: () => ({ meta: [{ title: "Signing in · Mingleza" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const { code, error } = Route.useSearch();
  const [message, setMessage] = useState("Completing your secure sign-in…");

  useEffect(() => {
    let active = true;
    if (error) {
      setMessage(
        "This sign-in link could not be used. It may have expired or already been used. Return to Mingleza and request a new link.",
      );
      return () => {
        active = false;
      };
    }
    if (!code) {
      setMessage("The sign-in link is incomplete. Return to Mingleza and request a new link.");
      return () => {
        active = false;
      };
    }

    exchangeEmailMagicLink({ data: { code } })
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
        window.location.replace("/welcome?authComplete=true");
      })
      .catch(() => {
        if (active)
          setMessage("We could not complete sign-in. Return to Mingleza and request a fresh link.");
      });

    return () => {
      active = false;
    };
  }, [code, error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-card">
        <h1 className="text-2xl font-extrabold">Sign in to Mingleza</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground" role="status">
          {message}
        </p>
        <a
          href="/welcome"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
        >
          Return to Mingleza
        </a>
      </section>
    </main>
  );
}
